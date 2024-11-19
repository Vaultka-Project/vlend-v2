import {
  AnchorProvider,
  BN,
  getProvider,
  Program,
  Wallet,
  workspace,
} from "@coral-xyz/anchor";
import {
  AddressLookupTableProgram,
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import { users, verbose } from "./rootHooks";
import { KaminoLending } from "./fixtures/kamino_lending";
import idl from "./fixtures/kamino_lending.json";
import {
  KAMINO_LUT,
  KAMINO_METADATA,
  KWRAP_LUT,
  KWRAP_METADATA,
  KWRAP_USER_ACCOUNT,
} from "./utils/mocks";
import { KaminoWrap } from "../target/types/kamino_wrap";
import { initKwrapUser } from "./utils/kwrap-instructions";
import { deriveKwrapUser } from "./utils/pdas";
import { assertBNApproximately, assertKeysEqual } from "./utils/genericTests";
import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system";
import { deriveUserMetadata } from "./utils/kamino-utils";
import { assert } from "chai";

describe("Init Kamino user", () => {
  const provider = getProvider() as AnchorProvider;
  const wallet = provider.wallet as Wallet;

  const klendProgram = new Program<KaminoLending>(
    idl as KaminoLending,
    new AnchorProvider(provider.connection, wallet, {})
  );
  const kWrapProgram = workspace.kamino_wrap as Program<KaminoWrap>;

  it("(user 0) Init mrgn-kamino user - happy path", async () => {
    let tx = new Transaction().add(
      await initKwrapUser(kWrapProgram, {
        payer: users[0].wallet.publicKey,
        user: users[0].wallet.publicKey,
      })
    );

    await users[0].kwrapProgram.provider.sendAndConfirm(tx);
    const [userAccountKey, bump] = deriveKwrapUser(
      kWrapProgram.programId,
      users[0].wallet.publicKey
    );
    users[0].accounts.set(KWRAP_USER_ACCOUNT, userAccountKey);
    if (verbose) {
      console.log("user 0 kwrap account: " + userAccountKey);
    }

    const userAccount = await kWrapProgram.account.userAccount.fetch(
      userAccountKey
    );
    assertKeysEqual(userAccount.key, userAccountKey);
    assertKeysEqual(userAccount.user, users[0].wallet.publicKey);
    const now = Math.floor(Date.now() / 1000);
    assertBNApproximately(userAccount.lastActivity, now, 2);
    assert.equal(userAccount.bumpSeed, bump);
  });

  it("(user 0) Init user mrgn-controlled metadata - happy path", async () => {
    await initKwrapMetadata(0);

    const [userAccount] = deriveKwrapUser(
      kWrapProgram.programId,
      users[0].wallet.publicKey
    );
    const [metadataKey] = deriveUserMetadata(
      klendProgram.programId,
      userAccount
    );
    const metadataAcc = await klendProgram.account.userMetadata.fetch(
      metadataKey
    );
    assertKeysEqual(metadataAcc.owner, userAccount);
  });

  //   it("(user 1) Init user mrgn-controlled metadata - happy path", async () => {
  //     await initKwrapMetadata(0);

  //     const [userAccount] = deriveKwrapUser(
  //       kWrapProgram.programId,
  //       users[1].wallet.publicKey
  //     );
  //     const [metadataKey] = deriveUserMetadata(
  //       klendProgram.programId,
  //       userAccount
  //     );
  //     const metadataAcc = await klendProgram.account.userMetadata.fetch(
  //       metadataKey
  //     );
  //     assertKeysEqual(metadataAcc.owner, userAccount);
  //   });

  async function initKwrapMetadata(userIndex: number) {
    const user = users[userIndex];
    const slot = await user.kwrapProgram.provider.connection.getSlot(
      "finalized"
    );
    const [userKwrapAccount] = deriveKwrapUser(
      kWrapProgram.programId,
      user.wallet.publicKey
    );
    const [_lookupTableInst, lookupTableAddress] =
      AddressLookupTableProgram.createLookupTable({
        authority: userKwrapAccount,
        payer: user.wallet.publicKey,
        recentSlot: slot,
      });

    const [metadataKey, metadataBump] = deriveUserMetadata(
      klendProgram.programId,
      userKwrapAccount
    );

    let tx = new Transaction();
    tx.add(
      await user.kwrapProgram.methods
        .initMetadata(new BN(slot), metadataBump)
        .accounts({
          userAccount: userKwrapAccount,
          userMetadata: metadataKey,
          referrerUserMetadata: PublicKey.default,
          userLookupTable: lookupTableAddress,
        })
        .instruction()
    );

    try {
      await user.kwrapProgram.provider.sendAndConfirm(tx);
    } catch (err) {
      console.log(err);
    }

    if (verbose) {
      console.log(`user ${userIndex} kwrap LUT:        ` + lookupTableAddress);
      console.log(`user ${userIndex} kwrap metadata:   ` + metadataKey);
    }

    user.accounts.set(KWRAP_METADATA, metadataKey);
    user.accounts.set(KWRAP_LUT, lookupTableAddress);

    // TODO assertions
  }
});
