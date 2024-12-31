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
  Keypair,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import {
  globalFeeWallet,
  groupAdmin,
  kaminoAccounts,
  marginfiGroup,
  MARKET,
  PROGRAM_FEE_FIXED,
  PROGRAM_FEE_RATE,
  users,
  verbose,
} from "./rootHooks";
import { KaminoLending } from "./fixtures/kamino_lending";
import idl from "./fixtures/kamino_lending.json";
import {
  KWRAP_LUT,
  KWRAP_METADATA,
  KWRAP_OBLIGATION,
  KWRAP_USER_ACCOUNT,
  USER_ACCOUNT,
} from "./utils/mocks";
import { KaminoWrap } from "../target/types/kamino_wrap";
import { Marginfi } from "../target/types/marginfi";
import {
  initKwrapMeta,
  initKwrapObligation,
  initKwrapUser,
} from "./utils/kwrap-instructions";
import { deriveKwrapUser } from "./utils/pdas";
import {
  assertBNApproximately,
  assertBNEqual,
  assertI80F48Approx,
  assertI80F48Equal,
  assertKeyDefault,
  assertKeysEqual,
} from "./utils/genericTests";
import { deriveObligation, deriveUserMetadata } from "./utils/kamino-utils";
import { assert } from "chai";
import { accountInit } from "./utils/user-instructions";
import { groupInitialize } from "./utils/group-instructions";
import { ACCOUNT_FREE_TO_WITHDRAW } from "./utils/types";

describe("Init kwrap-controlled Kamino user", () => {
  const provider = getProvider() as AnchorProvider;
  const wallet = provider.wallet as Wallet;

  const klendProgram = new Program<KaminoLending>(
    idl as KaminoLending,
    new AnchorProvider(provider.connection, wallet, {})
  );
  const kWrapProgram = workspace.kamino_wrap as Program<KaminoWrap>;
  const mrgnProgram = workspace.Marginfi as Program<Marginfi>;

  it("(admin) Init mrgn group (if needed)", async () => {
    try {
      let group = await mrgnProgram.account.marginfiGroup.fetch(
        marginfiGroup.publicKey
      );
      if (verbose) {
        console.log("*group already exists: " + marginfiGroup.publicKey);
        console.log(" admin: " + group.admin);
      }
    } catch (err) {
      await groupAdmin.mrgnProgram.provider.sendAndConfirm(
        new Transaction().add(
          await groupInitialize(mrgnProgram, {
            marginfiGroup: marginfiGroup.publicKey,
            admin: groupAdmin.wallet.publicKey,
          })
        ),
        [marginfiGroup]
      );

      let group = await mrgnProgram.account.marginfiGroup.fetch(
        marginfiGroup.publicKey
      );

      if (verbose) {
        console.log("*init group: " + marginfiGroup.publicKey);
        console.log(" admin: " + group.admin);
      }
    }
  });

  it("(users 0/1) Init mrgn users", async () => {
    await initUserMrgnAccount(0);
    await initUserMrgnAccount(1);
  });

  it("(users 0/1) Init mrgn-kamino (kwrap) users - happy path", async () => {
    await initMrgnKaminoUserHappyPath(0);
    await initMrgnKaminoUserHappyPath(1);
  });

  it("(user 0/1) Init user kwrap-controlled metadata - happy path", async () => {
    await initKwrapMetadataHappyPath(0);
    await initKwrapMetadataHappyPath(1);
  });

  it("(user 0/1) Init user kwrap-controlled obligation on main market - happy path", async () => {
    await initKwrapObligationHappyPath(0);
    await initKwrapObligationHappyPath(1);
  });

  async function initUserMrgnAccount(userIndex: number) {
    const user = users[userIndex];
    const accountKeypair = Keypair.generate();
    const accountKey = accountKeypair.publicKey;
    // Note: this over-rides the account used in the previous test suite if running the full
    // suite, which is fine.
    user.accounts.set(USER_ACCOUNT, accountKey);

    let tx: Transaction = new Transaction();
    tx.add(
      await accountInit(user.mrgnProgram, {
        marginfiGroup: marginfiGroup.publicKey,
        marginfiAccount: accountKey,
        authority: user.wallet.publicKey,
        feePayer: user.wallet.publicKey,
      })
    );
    await user.mrgnProgram.provider.sendAndConfirm(tx, [accountKeypair]);

    if (verbose) {
      console.log(`user ${userIndex} mrgnfi account: ` + accountKey);
    }

    // Validate fresh and empty
    const userAcc = await user.mrgnProgram.account.marginfiAccount.fetch(
      accountKey
    );
    assertKeysEqual(userAcc.group, marginfiGroup.publicKey);
    assertKeysEqual(userAcc.authority, user.wallet.publicKey);
    const balances = userAcc.lendingAccount.balances;
    for (let i = 0; i < balances.length; i++) {
      assert.equal(balances[i].active, false);
      assertKeyDefault(balances[i].bankPk);
      assertI80F48Equal(balances[i].assetShares, 0);
      assertI80F48Equal(balances[i].liabilityShares, 0);
      assertI80F48Equal(balances[i].emissionsOutstanding, 0);
      assertBNEqual(balances[i].lastUpdate, 0);
    }
    assertBNEqual(userAcc.accountFlags, 0);
  }

  async function initKwrapObligationHappyPath(userIndex: number) {
    const user = users[userIndex];
    const tag = 0;
    const id = 0;
    const [userKwrapAccount] = deriveKwrapUser(
      kWrapProgram.programId,
      user.wallet.publicKey,
      user.accounts.get(USER_ACCOUNT)
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

    const kwrappedObligation = await klendProgram.account.obligation.fetch(
      obligationKey
    );

    assertKeysEqual(kwrappedObligation.owner, userKwrapAccount);
    assertKeyDefault(kwrappedObligation.referrer);
    assertKeysEqual(kwrappedObligation.lendingMarket, marketKey);
    const deposits = kwrappedObligation.deposits;
    for (let i = 0; i < deposits.length; i++) {
      assertKeyDefault(deposits[i].depositReserve);
      assertBNEqual(deposits[i].depositedAmount, 0);
      assertBNEqual(deposits[i].marketValueSf, 0);
    }
    const borrows = kwrappedObligation.borrows;
    for (let i = 0; i < borrows.length; i++) {
      assertKeyDefault(borrows[i].borrowReserve);
      assertBNEqual(borrows[i].borrowedAmountSf, 0);
      assertBNEqual(borrows[i].marketValueSf, 0);
    }
    assert.equal(kwrappedObligation.hasDebt, 0);

    const kwrapAccount = await kWrapProgram.account.userAccount.fetch(
      userKwrapAccount
    );
    const info = kwrapAccount.marketInfo[0];
    assertKeysEqual(info.market, marketKey);
    assertKeysEqual(info.obligation, obligationKey);
    let collatPositions = info.positions;
    for (let k = 0; k < collatPositions.length; k++) {
      assertKeyDefault(collatPositions[k].bank);
      assertBNEqual(collatPositions[k].amount, 0);
      assertBNEqual(collatPositions[k].unsynced, 0);
      assert.equal(collatPositions[k].state, 0);
    }
    assert.equal(info.flags, ACCOUNT_FREE_TO_WITHDRAW);
  }

  async function initKwrapMetadataHappyPath(userIndex: number) {
    const user = users[userIndex];
    const slot = await user.kwrapProgram.provider.connection.getSlot(
      "finalized"
    );
    const [userKwrapAccount] = deriveKwrapUser(
      kWrapProgram.programId,
      user.wallet.publicKey,
      user.accounts.get(USER_ACCOUNT)
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
    const mrgnAccount = user.accounts.get(USER_ACCOUNT);
    let tx = new Transaction().add(
      await initKwrapUser(user.kwrapProgram, {
        payer: user.wallet.publicKey,
        user: user.wallet.publicKey,
        marginfiAccount: mrgnAccount,
      })
    );

    await user.kwrapProgram.provider.sendAndConfirm(tx);
    const [userAccountKey, bump] = deriveKwrapUser(
      kWrapProgram.programId,
      user.wallet.publicKey,
      user.accounts.get(USER_ACCOUNT)
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
    assertKeysEqual(userAccount.marginfiAccount, mrgnAccount);
    const now = Math.floor(Date.now() / 1000);
    assertBNApproximately(userAccount.lastActivity, now, 2);
    assert.equal(userAccount.bumpSeed, bump);
  }
});
