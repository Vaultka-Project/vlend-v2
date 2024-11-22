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
} from "./rootHooks";
import { deriveUserMetadata, deriveObligation } from "./utils/kamino-utils";
import { deriveKwrapUser } from "./utils/pdas";
import { KWRAP_OBLIGATION, KWRAP_USER_ACCOUNT } from "./utils/mocks";
import { freshDeposit } from "./utils/kwrap-instructions";
import { lendingMarketAuthPda } from "@kamino-finance/klend-sdk";
import { TOKEN_PROGRAM_ID, createTransferInstruction } from "@solana/spl-token";
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from "@mrgnlabs/mrgn-common";

describe("Deposit from Kamino account", () => {
  const provider = getProvider() as AnchorProvider;
  const wallet = provider.wallet as Wallet;

  const klendProgram = new Program<KaminoLending>(
    idl as KaminoLending,
    new AnchorProvider(provider.connection, wallet, {})
  );
  const kWrapProgram = workspace.kamino_wrap as Program<KaminoWrap>;

  const depositAmount = 10;

  it("(user 0) deposits USDC into mrgn-owned Kamino obligation - happy path", async () => {
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
      amt
    );

    let tx = new Transaction().add(
      createAtaIx,
      transferIx,
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

    // TODO assert balance changes
  });

  // TODO deposit assets from existing Kamino acc
});
