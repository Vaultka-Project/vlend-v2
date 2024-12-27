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
  ecosystem,
  groupAdmin,
  kaminoAccounts,
  KWRAPPED_USDC_BANK,
  marginfiGroup,
  MARKET,
  oracles,
  USDC_RESERVE,
  users,
  verbose,
} from "./rootHooks";
import {
  assertBNEqual,
  assertI80F48Equal,
  assertKeysEqual,
} from "./utils/genericTests";
import { Marginfi } from "../target/types/marginfi";
import { ASSET_TAG_DEFAULT, BANK_TYPE_KWRAP, defaultKwrapBankConfig } from "./utils/types";
import {
  addKwrapBank,
  freshDeposit,
  registerKwrapDeposit,
  syncKwrap,
} from "./utils/kwrap-instructions";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { deriveBankWithSeed } from "./utils/pdas";
import { assert } from "chai";
import {
  KWRAP_OBLIGATION,
  KWRAP_USER_ACCOUNT,
  USER_ACCOUNT,
} from "./utils/mocks";
import { lendingMarketAuthPda, Obligation } from "@kamino-finance/klend-sdk";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  simpleRefreshObligation,
  simpleRefreshReserve,
} from "./utils/kamino-utils";

describe("Deposit funds into kwrapped banks", () => {
  const mrgnProgram = workspace.Marginfi as Program<Marginfi>;
  const provider = getProvider() as AnchorProvider;
  const wallet = provider.wallet as Wallet;
  const klendProgram = new Program<KaminoLending>(
    idl as KaminoLending,
    new AnchorProvider(provider.connection, wallet, {})
  );

  let usdcBank: PublicKey;
  const depositAmount = 10;

  before(async () => {
    usdcBank = kaminoAccounts.get(KWRAPPED_USDC_BANK);
  });

  it("(user 0) Deposit kwrapped funds into kwrapped usdc bank - happy path", async () => {
    const user = users[0];
    const mrgnAccount = user.accounts.get(USER_ACCOUNT);
    // You could also derive with `deriveKwrapUser`
    const kwrapAccount = user.accounts.get(KWRAP_USER_ACCOUNT);
    // You could derive this `deriveObligation`, or read it from the userKwrapAccount.market_info list
    const obligation = user.accounts.get(KWRAP_OBLIGATION);

    await user.mrgnProgram.provider.sendAndConfirm!(
      new Transaction().add(
        await registerKwrapDeposit(user.mrgnProgram, {
          marginfiAccount: mrgnAccount,
          bank: usdcBank,
          userKwrapAccount: kwrapAccount,
          obligation: obligation,
        })
      )
    );

    // The position is now collateralized, which is recorded on the kwrap account
    let kwrapAcc = await user.kwrapProgram.account.userAccount.fetch(
      kwrapAccount
    );
    const obAcc = Obligation.decode(
      (await klendProgram.provider.connection.getAccountInfo(obligation)).data
    );
    const position = kwrapAcc.marketInfo[0].positions[0];
    // Note: we deposited `depositAmount`, twice, in k05
    const expectedAmt = depositAmount * 2 * 10 ** ecosystem.usdcDecimals;
    assertBNEqual(position.amount, obAcc.deposits[0].depositedAmount);
    assertBNEqual(position.amount, expectedAmt);
    // After initial registration, the position is always synced
    assertBNEqual(position.unsynced, 0);
    assertKeysEqual(position.bank, usdcBank);
    assert.equal(position.state, 1); //active

    let bank = await user.mrgnProgram.account.bank.fetch(usdcBank);
    // Note: Kamino banks have no interest, so the share value is (typically) always 1
    assertI80F48Equal(bank.assetShareValue, 1);
    assertI80F48Equal(bank.totalAssetShares, expectedAmt);

    let mrgnAcc = await user.mrgnProgram.account.marginfiAccount.fetch(
      mrgnAccount
    );
    const balance = mrgnAcc.lendingAccount.balances[0];
    assert.equal(balance.active, true);
    assertI80F48Equal(balance.assetShares, expectedAmt);
    assertKeysEqual(balance.bankPk, usdcBank);
    assert.equal(balance.bankAssetTag, ASSET_TAG_DEFAULT);
  });

  // Once the position has been registered, new deposits instantly count as collateral, but they
  // remain in an "unsynced" state until the next interaction with the mrgn bank.
  it("(user 0) Top up more usdc into kwrapped usdc bank - happy path", async () => {
    const user = users[0];
    const amt = new BN(depositAmount * 10 ** ecosystem.usdcDecimals);
    const market = kaminoAccounts.get(MARKET);
    const [lendingMarketAuthority] = lendingMarketAuthPda(
      market,
      klendProgram.programId
    );
    const kwrapAccount = user.accounts.get(KWRAP_USER_ACCOUNT);
    const obligation = user.accounts.get(KWRAP_OBLIGATION);
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
      await freshDeposit(user.kwrapProgram, {
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

    await user.kwrapProgram.provider.sendAndConfirm(tx);

    // The Kamino obligation is the authoritative balance...
    const obAcc = Obligation.decode(
      (await klendProgram.provider.connection.getAccountInfo(obligation)).data
    );

    let kwrapAcc = await user.kwrapProgram.account.userAccount.fetch(
      kwrapAccount
    );
    const position = kwrapAcc.marketInfo[0].positions[0];
    // Note: position amount is unchanged, the deposit goes to the unsynced balance
    const expectedAmt = depositAmount * 2 * 10 ** ecosystem.usdcDecimals;
    // The synced + unsynced amounts always total the actual obligation deposits.
    assertBNEqual(
      position.amount.add(position.unsynced),
      obAcc.deposits[0].depositedAmount
    );
    // no change
    assertBNEqual(position.amount, expectedAmt);
    // There is now an unsynced deposit...
    const expectedUnsyncAmount = depositAmount * 10 ** ecosystem.usdcDecimals;
    assertBNEqual(position.unsynced, expectedUnsyncAmount);
    // The refreshed slot only updates when accruing interest
    assertBNEqual(kwrapAcc.marketInfo[0].refreshedSlot, 0);

    // no change
    assertKeysEqual(position.bank, usdcBank);
    assert.equal(position.state, 1);

    // no change (the bank is unaware of this deposit until synced)
    let bank = await user.mrgnProgram.account.bank.fetch(usdcBank);
    assertI80F48Equal(bank.assetShareValue, 1);
    assertI80F48Equal(bank.totalAssetShares, expectedAmt);

    // no change (the users's mrgn account is unaware of this deposit until synced)
    const mrgnAccount = user.accounts.get(USER_ACCOUNT);
    let mrgnAcc = await user.mrgnProgram.account.marginfiAccount.fetch(
      mrgnAccount
    );
    const balance = mrgnAcc.lendingAccount.balances[0];
    assert.equal(balance.active, true);
    assertI80F48Equal(balance.assetShares, expectedAmt);
    assertKeysEqual(balance.bankPk, usdcBank);
    assert.equal(balance.bankAssetTag, ASSET_TAG_DEFAULT);
    assert.equal(balance.bankKwrapState, BANK_TYPE_KWRAP);
  });

  it("(permissionless) user 0 syncs with bank - happy path", async () => {
    const user = users[0];
    const mrgnAccount = user.accounts.get(USER_ACCOUNT);
    const kwrapAccount = user.accounts.get(KWRAP_USER_ACCOUNT);
    const obligation = user.accounts.get(KWRAP_OBLIGATION);
    await user.mrgnProgram.provider.sendAndConfirm(
      new Transaction().add(
        await syncKwrap(user.mrgnProgram, {
          marginfiAccount: mrgnAccount,
          userKwrapAccount: kwrapAccount,
          bank: usdcBank,
        })
      )
    );

    // The Kamino obligation is always the authoritative balance keeper...
    const obAcc = Obligation.decode(
      (await klendProgram.provider.connection.getAccountInfo(obligation)).data
    );

    let kwrapAcc = await user.kwrapProgram.account.userAccount.fetch(
      kwrapAccount
    );
    const position = kwrapAcc.marketInfo[0].positions[0];
    // Note: Our third deposit (from above test) is now reflected
    const expectedAmtNew = depositAmount * 3 * 10 ** ecosystem.usdcDecimals;
    // position.amount is now authoritative and matches the obligation
    assertBNEqual(position.amount, obAcc.deposits[0].depositedAmount);
    // now synced
    assertBNEqual(position.amount, expectedAmtNew);
    // nothing unsynced
    assertBNEqual(position.unsynced, 0);

    // no change
    assertKeysEqual(position.bank, usdcBank);
    assert.equal(position.state, 1);

    // the bank is now aware of the additional deposit
    let bank = await user.mrgnProgram.account.bank.fetch(usdcBank);
    assertI80F48Equal(bank.assetShareValue, 1);
    assertI80F48Equal(bank.totalAssetShares, expectedAmtNew);

    // the user account is now aware of the deposit
    let mrgnAcc = await user.mrgnProgram.account.marginfiAccount.fetch(
      mrgnAccount
    );
    const balance = mrgnAcc.lendingAccount.balances[0];
    assertI80F48Equal(balance.assetShares, expectedAmtNew);

    // No change
    assert.equal(balance.active, true);
    assertKeysEqual(balance.bankPk, usdcBank);
    assert.equal(balance.bankAssetTag, ASSET_TAG_DEFAULT);
  });

  // TODO accrue interest and validate sync?
});
