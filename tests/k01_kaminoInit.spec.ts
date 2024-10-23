import {
  AnchorProvider,
  getProvider,
  Program,
  Wallet,
} from "@coral-xyz/anchor";
import {
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import { groupAdmin } from "./rootHooks";
import { KaminoLending } from "./fixtures/kamino_lending";
import idl from "./fixtures/kamino_lending.json";
import { assert } from "chai";
import { lendingMarketAuthPda } from "@kamino-finance/klend-sdk";

const LENDING_MARKET_SIZE = 4656;

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
  });

  it("do nothing", async () => {
    assert.equal(1, 1);
  });
});
