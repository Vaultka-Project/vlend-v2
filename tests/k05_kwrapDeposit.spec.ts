import {
  getProvider,
  AnchorProvider,
  Wallet,
  Program,
  workspace,
  BN,
} from "@coral-xyz/anchor";
import { KaminoWrap } from "../target/types/kamino_wrap";
import { KaminoLending } from "./fixtures/kamino_lending";
import idl from "./fixtures/kamino_lending.json";
import { PublicKey, Transaction } from "@solana/web3.js";
import {
  users,
  kaminoAccounts,
  MARKET,
  USDC_RESERVE,
  ecosystem,
  oracles,
} from "./rootHooks";
import {
  deriveUserMetadata,
  deriveObligation,
  simpleRefreshReserve,
  simpleRefreshObligation,
} from "./utils/kamino-utils";
import { deriveKwrapUser } from "./utils/pdas";
import {
  KAMINO_OBLIGATION,
  KWRAP_OBLIGATION,
  KWRAP_USER_ACCOUNT,
} from "./utils/mocks";
import { existingDeposit, freshDeposit } from "./utils/kwrap-instructions";
import { lendingMarketAuthPda, Obligation } from "@kamino-finance/klend-sdk";
import { TOKEN_PROGRAM_ID, createTransferInstruction } from "@solana/spl-token";
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from "@mrgnlabs/mrgn-common";
import {
  assertBNApproximately,
  assertBNEqual,
  assertKeysEqual,
  getTokenBalance,
} from "./utils/genericTests";
import { Fraction } from "@kamino-finance/klend-sdk/dist/classes/fraction";
import Decimal from "decimal.js";

describe("Deposit from Kamino account", () => {
  const provider = getProvider() as AnchorProvider;
  const wallet = provider.wallet as Wallet;

  const klendProgram = new Program<KaminoLending>(
    idl as KaminoLending,
    new AnchorProvider(provider.connection, wallet, {})
  );
  const kWrapProgram = workspace.kamino_wrap as Program<KaminoWrap>;

  const depositAmount = 10;

  it("(user 0) deposits USDC into kwrap-owned Kamino obligation - happy path", async () => {
    const amt = new BN(depositAmount * 10 ** ecosystem.usdcDecimals);
    const market = kaminoAccounts.get(MARKET);
    const [lendingMarketAuthority] = lendingMarketAuthPda(
      market,
      klendProgram.programId
    );
    const kwrapAccount = users[0].accounts.get(KWRAP_USER_ACCOUNT);
    const obligation = users[0].accounts.get(KWRAP_OBLIGATION);
    const reserveKey = kaminoAccounts.get(USDC_RESERVE);
    const reserve = await klendProgram.account.reserve.fetch(reserveKey);

    // Note: the source for deposits must be owned by the obligation owner (in this case the
    // kwrapAccount itself), so we need to create an ATA owned by the user's `kwrapAccount` to shift
    // the USDC into, and then we can deposit from that ATA. The deposit IX checks `token::authority
    // = owner`, so granting the account delegate over the user's existing ATA is not sufficient.
    const kWrappedUsdcAta = getAssociatedTokenAddressSync(
      ecosystem.usdcMint.publicKey,
      kwrapAccount,
      true
    );
    let createAtaIx = createAssociatedTokenAccountInstruction(
      users[0].wallet.publicKey,
      kWrappedUsdcAta,
      kwrapAccount,
      ecosystem.usdcMint.publicKey
    );
    let transferIx = createTransferInstruction(
      users[0].usdcAccount,
      kWrappedUsdcAta,
      users[0].wallet.publicKey,
      // For testing purposes we put move additional funds to avoid having to transfer again. In
      // production, this account will be a proxy that never holds funds: it will always transfer
      // only what it needs to complete the deposit, and if the deposit tx fails for some reason, it
      // should transfer the funds back to the user
      //
      // Note: While it would be nice to perform the transfer atomically with the deposit, Kamino's
      // transaction introspection expects the refresh ixes in a particular place, so this isn't
      // possible
      amt.mul(new BN(10))
    );

    let fundTx = new Transaction().add(createAtaIx, transferIx);
    await users[0].kwrapProgram.provider.sendAndConfirm(fundTx);

    let tx = new Transaction().add(
      // Note: Kamino does TX introspection, and requires these kamino-native ixes to be here,
      // exactly, and in this order, in the tx.
      await simpleRefreshReserve(
        klendProgram,
        reserveKey,
        market,
        oracles.usdcOracle.publicKey
      ),
      await simpleRefreshObligation(klendProgram, market, obligation),
      await freshDeposit(users[0].kwrapProgram, {
        liquidityAmount: amt,
        userAccount: kwrapAccount,
        obligation: obligation,
        lendingMarket: market,
        lendingMarketAuthority: lendingMarketAuthority,
        reserve: reserveKey,
        reserveLiquidityMint: reserve.liquidity.mintPubkey,
        reserveLiquiditySupply: reserve.liquidity.supplyVault,
        reserveCollateralMint: reserve.collateral.mintPubkey,
        reserveDestinationDepositCollateral: reserve.collateral.supplyVault,
        userSourceLiquidity: kWrappedUsdcAta,
        liquidityTokenProgram: TOKEN_PROGRAM_ID,
      })
    );

    await users[0].kwrapProgram.provider.sendAndConfirm(tx);

    const obAcc = Obligation.decode(
      (await klendProgram.provider.connection.getAccountInfo(obligation)).data
    );
    assertKeysEqual(obAcc.deposits[0].depositReserve, reserveKey);
    assertBNApproximately(obAcc.deposits[0].depositedAmount, amt, 1000);
    // Note: the market value of the asset defaults to zero until the first post-deposit refresh
    assertBNApproximately(obAcc.deposits[0].marketValueSf, 0, 100_000);

    await users[0].kwrapProgram.provider.sendAndConfirm(
      new Transaction().add(
        await simpleRefreshReserve(
          klendProgram,
          reserveKey,
          market,
          oracles.usdcOracle.publicKey
        ),
        await simpleRefreshObligation(klendProgram, market, obligation, [
          reserveKey,
        ])
      )
    );

    // Following a refresh, the obligation is now valued as expected
    const obAccAfter = Obligation.decode(
      (await klendProgram.provider.connection.getAccountInfo(obligation)).data
    );
    let expected = Fraction.fromDecimal(
      new Decimal(oracles.usdcPrice * depositAmount)
    );
    assertBNApproximately(
      obAccAfter.deposits[0].marketValueSf,
      expected.valueSf,
      100_000
    );

    // The position hasn't been collateralized yet, so collateralized_amounts is still blank
    let kwrapAcc = await users[0].kwrapProgram.account.userAccount.fetch(
      kwrapAccount
    );
    for (let i = 0; i < kwrapAcc.marketInfo.length; i++) {
      let collatPositions = kwrapAcc.marketInfo[i].positions;
      for (let k = 0; k < collatPositions.length; k++) {
        assertBNEqual(collatPositions[k].amount, 0);
      }
    }
  });

  // The only notable difference here is that the obligation must now include the usdc reserve in
  // remaining_accounts when refreshing.
  it("(user 0) deposits USDC into kwrap-owned Kamino obligation (again) - happy path", async () => {
    const amt = new BN(depositAmount * 10 ** ecosystem.usdcDecimals);
    const market = kaminoAccounts.get(MARKET);
    const [lendingMarketAuthority] = lendingMarketAuthPda(
      market,
      klendProgram.programId
    );
    const kwrapAccount = users[0].accounts.get(KWRAP_USER_ACCOUNT);
    const obligation = users[0].accounts.get(KWRAP_OBLIGATION);
    const reserveKey = kaminoAccounts.get(USDC_RESERVE);
    const reserve = await klendProgram.account.reserve.fetch(reserveKey);

    const kWrappedUsdcAta = getAssociatedTokenAddressSync(
      ecosystem.usdcMint.publicKey,
      kwrapAccount,
      true
    );

    let tx = new Transaction().add(
      await simpleRefreshReserve(
        klendProgram,
        reserveKey,
        market,
        oracles.usdcOracle.publicKey
      ),
      await simpleRefreshObligation(klendProgram, market, obligation, [
        reserveKey,
      ]),
      await freshDeposit(users[0].kwrapProgram, {
        liquidityAmount: amt,
        userAccount: kwrapAccount,
        obligation: obligation,
        lendingMarket: market,
        lendingMarketAuthority: lendingMarketAuthority,
        reserve: reserveKey,
        reserveLiquidityMint: reserve.liquidity.mintPubkey,
        reserveLiquiditySupply: reserve.liquidity.supplyVault,
        reserveCollateralMint: reserve.collateral.mintPubkey,
        reserveDestinationDepositCollateral: reserve.collateral.supplyVault,
        userSourceLiquidity: kWrappedUsdcAta,
        liquidityTokenProgram: TOKEN_PROGRAM_ID,
      })
    );

    await users[0].kwrapProgram.provider.sendAndConfirm(tx);
  });

  /*
    We would like to atomically withdraw from the user's Kamino account and immediately deposit into
    their mrgn-wrapped equivalent, but we can't because Kamino requires that refresh instructions
    (which are checked by introspection) appear in a paritcular spot in the instruction. Deposit
    wants the refresh for the user's obligation at the first index after refreshing reserves, and
    Withdraw wants the refresh for the wrapped obligation in the same slot, rendering them
    incompatible.

    Currently, if the user already has a Kamino position, we must send a tx to withdraw it, transfer
    that balance to the pda-owned usdc account, and then call freshDeposit.
  */
  it("(user 0) deposits USDC from Kamino obligation to kwrap-owned obligation - happy path", async () => {
    const amt = new BN(depositAmount * 10 ** ecosystem.usdcDecimals);
    const market = kaminoAccounts.get(MARKET);
    const [lendingMarketAuthority] = lendingMarketAuthPda(
      market,
      klendProgram.programId
    );
    const kwrapAccount = users[0].accounts.get(KWRAP_USER_ACCOUNT);
    const obligation = users[0].accounts.get(KWRAP_OBLIGATION);
    const reserveKey = kaminoAccounts.get(USDC_RESERVE);
    const reserve = await klendProgram.account.reserve.fetch(reserveKey);

    const kWrappedUsdcAta = getAssociatedTokenAddressSync(
      ecosystem.usdcMint.publicKey,
      kwrapAccount,
      true
    );

    const userObligation = users[0].accounts.get(KAMINO_OBLIGATION);
    const userUsdcAta = users[0].usdcAccount;

    let tx = new Transaction().add(
      await simpleRefreshReserve(
        klendProgram,
        reserveKey,
        market,
        oracles.usdcOracle.publicKey
      ),
      await simpleRefreshObligation(klendProgram, market, userObligation, [
        reserveKey,
      ]),
      await simpleRefreshObligation(klendProgram, market, obligation, [
        reserveKey,
      ]),
      await existingDeposit(users[0].kwrapProgram, {
        liquidityAmount: amt,
        userAccount: kwrapAccount,
        obligation: obligation,
        userObligation: userObligation,
        lendingMarket: market,
        lendingMarketAuthority: lendingMarketAuthority,
        reserve: reserveKey,
        reserveLiquidityMint: reserve.liquidity.mintPubkey,
        reserveLiquiditySupply: reserve.liquidity.supplyVault,
        reserveCollateralMint: reserve.collateral.mintPubkey,
        reserveDestinationDepositCollateral: reserve.collateral.supplyVault,
        userSourceLiquidity: kWrappedUsdcAta,
        userDestinationLiquidity: userUsdcAta,
        liquidityTokenProgram: TOKEN_PROGRAM_ID,
      })
    );

    try {
      await users[0].kwrapProgram.provider.sendAndConfirm(tx);
    } catch (err) {
      console.error("Existing Deposit is currently not supported.");
    }
  });
});
