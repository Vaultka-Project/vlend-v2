import {
  AnchorProvider,
  getProvider,
  Program,
  Wallet,
} from "@coral-xyz/anchor";
import {
  AddressLookupTableProgram,
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import { kaminoAccounts, MARKET, users, verbose } from "./rootHooks";
import { KaminoLending } from "./fixtures/kamino_lending";
import idl from "./fixtures/kamino_lending.json";
import { deriveObligation, deriveUserMetadata } from "./utils/kamino-utils";
import { InitObligationArgs } from "@kamino-finance/klend-sdk/dist/idl_codegen/types";
import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system";
import { KAMINO_LUT, KAMINO_METADATA, KAMINO_OBLIGATION } from "./utils/mocks";

describe("Init Kamino user", () => {
  const provider = getProvider() as AnchorProvider;
  const wallet = provider.wallet as Wallet;

  const klendProgram = new Program<KaminoLending>(
    idl as KaminoLending,
    new AnchorProvider(provider.connection, wallet, {})
  );

  it("(user 0) Init user metadata - happy path", async () => {
    await initUserMetadata(0);
  });

  it("(user 1) Init user metadata - happy path", async () => {
    await initUserMetadata(1);
  });

  it("(user 0) Init Kamino obligation - happy path", async () => {
    const initObligationArgs = new InitObligationArgs({ tag: 0, id: 0 });
    await initObligation(0, initObligationArgs);
  });

  it("(user 1) Init Kamino obligation - happy path", async () => {
    const initObligationArgs = new InitObligationArgs({ tag: 0, id: 0 });
    await initObligation(1, initObligationArgs);
  });

  async function initUserMetadata(userIndex: number) {
    const user = users[userIndex];
    const provider = user.mrgnProgram.provider;
    const connection = provider.connection;

    // Get the recent slot for LUT creation
    const slot = await connection.getSlot("finalized");

    // Create an Address Lookup Table (LUT)
    const [lookupTableInst, lookupTableAddress] =
      AddressLookupTableProgram.createLookupTable({
        authority: user.wallet.publicKey,
        payer: user.wallet.publicKey,
        recentSlot: slot,
      });

    const [metadataKey] = deriveUserMetadata(
      klendProgram.programId,
      user.wallet.publicKey
    );

    let tx = new Transaction();
    tx.add(
      lookupTableInst,
      await klendProgram.methods
        .initUserMetadata(lookupTableAddress)
        .accounts({
          owner: user.wallet.publicKey,
          feePayer: user.wallet.publicKey,
          userMetadata: metadataKey,
          referrerUserMetadata: null,
          rent: SYSVAR_RENT_PUBKEY,
          systemProgram: SYSTEM_PROGRAM_ID,
        })
        .instruction()
    );

    await provider.sendAndConfirm(tx);

    if (verbose) {
      console.log(`user ${userIndex} Kamino LUT: ` + lookupTableAddress);
      console.log(`user ${userIndex} metadata:   ` + metadataKey);
    }

    user.accounts.set(KAMINO_METADATA, metadataKey);
    user.accounts.set(KAMINO_LUT, lookupTableAddress);
  }

  async function initObligation(userIndex: number, args: InitObligationArgs) {
    const user = users[userIndex];

    const [obligationKey] = deriveObligation(
      klendProgram.programId,
      args.tag,
      args.id,
      user.wallet.publicKey,
      kaminoAccounts.get(MARKET),
      PublicKey.default,
      PublicKey.default
    );

    let tx = new Transaction();
    tx.add(
      await klendProgram.methods
        .initObligation(args)
        .accounts({
          obligationOwner: user.wallet.publicKey,
          feePayer: user.wallet.publicKey,
          obligation: obligationKey,
          lendingMarket: kaminoAccounts.get(MARKET),
          // Note: seed requirements for non-zero tag vary, see the ix for details
          seed1Account: args.tag === 0 ? PublicKey.default : PublicKey.unique(),
          seed2Account: args.tag === 0 ? PublicKey.default : PublicKey.unique(),
          ownerUserMetadata: user.accounts.get(KAMINO_METADATA),
          rent: SYSVAR_RENT_PUBKEY,
          systemProgram: SYSTEM_PROGRAM_ID,
        })
        .instruction()
    );

    await user.mrgnProgram.provider.sendAndConfirm(tx);
    user.accounts.set(KAMINO_OBLIGATION, obligationKey);

    if (verbose) {
      console.log("user " + userIndex + " obligation: " + obligationKey);
    }
  }
});
