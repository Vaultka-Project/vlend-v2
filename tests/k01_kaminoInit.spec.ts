import {
  AnchorProvider,
  getProvider,
  Program,
  Wallet,
} from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import {
  ecosystem,
  groupAdmin,
  kaminoAccounts,
  MARKET,
  TOKEN_A_RESERVE,
  USDC_RESERVE,
} from "./rootHooks";
import { KaminoLending } from "./fixtures/kamino_lending";
import idl from "./fixtures/kamino_lending.json";
import { assert } from "chai";
import {
  lendingMarketAuthPda,
  reserveCollateralMintPda,
  reserveCollateralSupplyPda,
  reserveFeeVaultPda,
  reserveLiqSupplyPda,
} from "@kamino-finance/klend-sdk";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

const LENDING_MARKET_SIZE = 4656;
const RESERVE_SIZE = 8616;

describe("Init Kamino instance", () => {
  const provider = getProvider() as AnchorProvider;
  const wallet = provider.wallet as Wallet;

  const klendProgram = new Program<KaminoLending>(
    idl as KaminoLending,
    new AnchorProvider(provider.connection, wallet, {})
  );

  // Note: We use the same admins for Kamino as for mrgn, but in practice the Kamino program is
  // adminstrated by a different organization
  it("(admin) Init Kamino bank - happy path", async () => {
    const usdcString = "USDC";
    const quoteCurrency = Array.from(usdcString.padEnd(32, "\0")).map((c) =>
      c.charCodeAt(0)
    );

    const lendingMarket = Keypair.generate();
    const [lendingMarketAuthority] = lendingMarketAuthPda(
      lendingMarket.publicKey,
      klendProgram.programId
    );

    let tx = new Transaction();
    tx.add(
      // Create a zeroed account that's large enough to hold the lending market
      SystemProgram.createAccount({
        fromPubkey: groupAdmin.wallet.publicKey,
        newAccountPubkey: lendingMarket.publicKey,
        space: LENDING_MARKET_SIZE + 8,
        lamports:
          await klendProgram.provider.connection.getMinimumBalanceForRentExemption(
            LENDING_MARKET_SIZE + 8
          ),
        programId: klendProgram.programId,
      }),
      // Init lending market
      await klendProgram.methods
        .initLendingMarket(quoteCurrency)
        .accounts({
          lendingMarketOwner: groupAdmin.wallet.publicKey,
          lendingMarket: lendingMarket.publicKey,
          lendingMarketAuthority: lendingMarketAuthority,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .instruction()
    );

    await klendProgram.provider.sendAndConfirm(tx, [
      lendingMarket,
      groupAdmin.wallet,
    ]);
    kaminoAccounts.set(MARKET, lendingMarket.publicKey);
  });

  it("(admin) create USDC reserve", async () => {
    await createReserve(ecosystem.usdcMint.publicKey, USDC_RESERVE);
  });

  it("(admin) create token A reserve", async () => {
    await createReserve(ecosystem.tokenAMint.publicKey, TOKEN_A_RESERVE);
  });

  async function createReserve(mint: PublicKey, reserveLabel: string) {
    const reserve = Keypair.generate();
    const market = kaminoAccounts.get(MARKET);
    const id = klendProgram.programId;

    const [lendingMarketAuthority] = lendingMarketAuthPda(market, id);
    const [reserveLiquiditySupply] = reserveLiqSupplyPda(market, mint, id);
    const [reserveFeeVault] = reserveFeeVaultPda(market, mint, id);
    const [collatMint] = reserveCollateralMintPda(market, mint, id);
    const [collatSupply] = reserveCollateralSupplyPda(market, mint, id);

    const tx = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: groupAdmin.wallet.publicKey,
        newAccountPubkey: reserve.publicKey,
        space: RESERVE_SIZE + 8,
        lamports:
          await klendProgram.provider.connection.getMinimumBalanceForRentExemption(
            RESERVE_SIZE + 8
          ),
        programId: klendProgram.programId,
      }),
      await klendProgram.methods
        .initReserve()
        .accounts({
          lendingMarketOwner: groupAdmin.wallet.publicKey,
          lendingMarket: market,
          lendingMarketAuthority,
          reserve: reserve.publicKey,
          reserveLiquidityMint: mint,
          reserveLiquiditySupply,
          feeReceiver: reserveFeeVault,
          reserveCollateralMint: collatMint,
          reserveCollateralSupply: collatSupply,
          rent: SYSVAR_RENT_PUBKEY,
          liquidityTokenProgram: TOKEN_PROGRAM_ID,
          collateralTokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .instruction()
    );

    await klendProgram.provider.sendAndConfirm(tx, [
      reserve,
      groupAdmin.wallet,
    ]);
    kaminoAccounts.set(reserveLabel, reserve.publicKey);
  }
});
