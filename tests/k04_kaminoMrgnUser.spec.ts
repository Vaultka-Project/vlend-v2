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
  Transaction,
} from "@solana/web3.js";
import { kaminoAccounts, MARKET, users, verbose } from "./rootHooks";
import { KaminoLending } from "./fixtures/kamino_lending";
import idl from "./fixtures/kamino_lending.json";
import {
  KWRAP_LUT,
  KWRAP_METADATA,
  KWRAP_OBLIGATION,
  KWRAP_USER_ACCOUNT,
} from "./utils/mocks";
import { KaminoWrap } from "../target/types/kamino_wrap";
import {
  initKwrapMeta,
  initKwrapObligation,
  initKwrapUser,
} from "./utils/kwrap-instructions";
import { deriveKwrapUser } from "./utils/pdas";
import {
  assertBNApproximately,
  assertBNEqual,
  assertKeyDefault,
  assertKeysEqual,
} from "./utils/genericTests";
import { deriveObligation, deriveUserMetadata } from "./utils/kamino-utils";
import { assert } from "chai";

describe("Init Kamino user", () => {
  const provider = getProvider() as AnchorProvider;
  const wallet = provider.wallet as Wallet;

  const klendProgram = new Program<KaminoLending>(
    idl as KaminoLending,
    new AnchorProvider(provider.connection, wallet, {})
  );
  const kWrapProgram = workspace.kamino_wrap as Program<KaminoWrap>;

  it("Init mrgn-kamino users - happy path", async () => {
    await initMrgnKaminoUserHappyPath(0, verbose);
    await initMrgnKaminoUserHappyPath(1, verbose);
  });

  it("(user 0) Init user mrgn-controlled metadata - happy path", async () => {
    await initKwrapMetadataHappyPath(0);
  });

  it("(user 1) Init user mrgn-controlled metadata - happy path", async () => {
    await initKwrapMetadataHappyPath(1);
  });

  it("(user 0) Init user mrgn-controlled obligation on main market - happy path", async () => {
    await initKwrapObligationHappyPath(0);
  });

  async function initKwrapObligationHappyPath(userIndex: number) {
    const user = users[userIndex];
    const tag = 0;
    const id = 0;
    const [userKwrapAccount] = deriveKwrapUser(
      kWrapProgram.programId,
      user.wallet.publicKey
    );
    const [metadataKey] = deriveUserMetadata(
      klendProgram.programId,
      userKwrapAccount
    );
    const [obligationKey] = deriveObligation(
      klendProgram.programId,
      tag,
      id,
      userKwrapAccount,
      kaminoAccounts.get(MARKET),
      PublicKey.default,
      PublicKey.default
    );
    const marketKey = kaminoAccounts.get(MARKET);

    let tx = new Transaction().add(
      await initKwrapObligation(user.kwrapProgram, {
        userAccount: userKwrapAccount,
        obligation: obligationKey,
        lendingMarket: marketKey,
        userMetadata: metadataKey,
        tag: tag,
        id: id,
      })
    );

    await user.kwrapProgram.provider.sendAndConfirm(tx);

    if (verbose) {
      console.log(`user ${userIndex} kwrap obligation: ` + obligationKey);
    }

    user.accounts.set(KWRAP_OBLIGATION, obligationKey);

    // TODO assertions
  }

  async function initKwrapMetadataHappyPath(userIndex: number) {
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

    let tx = new Transaction().add(
      await initKwrapMeta(user.kwrapProgram, {
        userAccount: userKwrapAccount,
        userMetadata: metadataKey,
        userLookupTable: lookupTableAddress,
        slot: new BN(slot),
      })
    );

    await user.kwrapProgram.provider.sendAndConfirm(tx);

    if (verbose) {
      console.log(`user ${userIndex} kwrap LUT:        ` + lookupTableAddress);
      console.log(`user ${userIndex} kwrap metadata:   ` + metadataKey);
    }

    user.accounts.set(KWRAP_METADATA, metadataKey);
    user.accounts.set(KWRAP_LUT, lookupTableAddress);

    const userMetadata = await klendProgram.account.userMetadata.fetch(
      metadataKey
    );

    assertKeyDefault(userMetadata.referrer);
    assertKeysEqual(userMetadata.userLookupTable, lookupTableAddress);
    assertKeysEqual(userMetadata.owner, userKwrapAccount);
    assertBNEqual(userMetadata.bump, metadataBump);
  }

  async function initMrgnKaminoUserHappyPath(
    userIndex: number,
    verbose = false
  ) {
    const user = users[userIndex];
    let tx = new Transaction().add(
      await initKwrapUser(kWrapProgram, {
        payer: user.wallet.publicKey,
        user: user.wallet.publicKey,
      })
    );

    await user.kwrapProgram.provider.sendAndConfirm(tx);
    const [userAccountKey, bump] = deriveKwrapUser(
      kWrapProgram.programId,
      user.wallet.publicKey
    );
    user.accounts.set(KWRAP_USER_ACCOUNT, userAccountKey);
    if (verbose) {
      console.log(`user ${userIndex} kwrap acc: ${userAccountKey}`);
    }

    const userAccount = await kWrapProgram.account.userAccount.fetch(
      userAccountKey
    );
    assertKeysEqual(userAccount.key, userAccountKey);
    assertKeysEqual(userAccount.user, user.wallet.publicKey);
    const now = Math.floor(Date.now() / 1000);
    assertBNApproximately(userAccount.lastActivity, now, 2);
    assert.equal(userAccount.bumpSeed, bump);
  }
});
