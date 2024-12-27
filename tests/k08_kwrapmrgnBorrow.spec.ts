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
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
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
import {
  ASSET_TAG_DEFAULT,
  BANK_TYPE_KWRAP,
  defaultBankConfig,
  defaultKwrapBankConfig,
} from "./utils/types";
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
import { updatePriceAccount } from "./utils/pyth_mocks";
import { addBankWithSeed } from "./utils/group-instructions";
import { accountInit, depositIx } from "./utils/user-instructions";
import { createMintToInstruction } from "@solana/spl-token";

describe("Deposit funds into kwrapped banks", () => {
  const mrgnProgram = workspace.Marginfi as Program<Marginfi>;
  const provider = getProvider() as AnchorProvider;
  const wallet = provider.wallet as Wallet;
  const klendProgram = new Program<KaminoLending>(
    idl as KaminoLending,
    new AnchorProvider(provider.connection, wallet, {})
  );

  let usdcBank: PublicKey;
  /** A regular USDC bank (not kwrapped, classic mrgn bank) */
  let regularUsdcBank: PublicKey;
  const depositAmount = 10;
  const depositAmountUsdc_native = new BN(10 * 10 ** ecosystem.usdcDecimals);
  const seed = new BN(1);

  before(async () => {
    usdcBank = kaminoAccounts.get(KWRAPPED_USDC_BANK);
    [regularUsdcBank] = deriveBankWithSeed(
      mrgnProgram.programId,
      marginfiGroup.publicKey,
      ecosystem.usdcMint.publicKey,
      seed
    );
  });

  // Note: the regular test suite also has a USDC bank, but we create a new one for this test for simplicitly...
  it("(admin) Add another regular (not kwrapped) USDC bank", async () => {
    let setConfig = defaultBankConfig(oracles.usdcOracle.publicKey);

    await groupAdmin.mrgnProgram.provider.sendAndConfirm!(
      new Transaction().add(
        await addBankWithSeed(
          groupAdmin.mrgnProgram,
          {
            marginfiGroup: marginfiGroup.publicKey,
            admin: groupAdmin.wallet.publicKey,
            feePayer: groupAdmin.wallet.publicKey,
            bankMint: ecosystem.usdcMint.publicKey,
            bank: regularUsdcBank, // bank arg does nothing with seed
            // globalFeeWallet: globalFeeWallet,
            config: setConfig,
          },
          seed
        )
      )
    );
  });

  it("(user 1) Init user account (if needed)", async () => {
    const user = users[1];
    try {
      const userAccKey = user.accounts.get(USER_ACCOUNT);
      await mrgnProgram.account.userAccount.fetch(
        user.accounts.get(USER_ACCOUNT)
      );
      if (verbose) {
        console.log("*acc already exists: " + userAccKey);
      }
    } catch (err) {
      const accountKeypair = Keypair.generate();
      const accountKey = accountKeypair.publicKey;
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
        console.log("*init acc: " + accountKey);
      }
    }
  });

  it("(Fund user 0 and user 1 USDC/Token A token accounts", async () => {
    let tx = new Transaction();
    for (let i = 0; i < users.length; i++) {
      tx.add(
        createMintToInstruction(
          ecosystem.tokenAMint.publicKey,
          users[i].tokenAAccount,
          wallet.publicKey,
          100 * 10 ** ecosystem.tokenADecimals
        )
      );
      tx.add(
        createMintToInstruction(
          ecosystem.usdcMint.publicKey,
          users[i].usdcAccount,
          wallet.publicKey,
          10000 * 10 ** ecosystem.usdcDecimals
        )
      );
    }
    await mrgnProgram.provider.sendAndConfirm(tx);
  });

  it("(user 1) Deposits USDC liquidity to USDC bank", async () => {
    const user = users[1];
    await user.mrgnProgram.provider.sendAndConfirm(
      new Transaction().add(
        await depositIx(user.mrgnProgram, {
          marginfiGroup: marginfiGroup.publicKey,
          marginfiAccount: user.accounts.get(USER_ACCOUNT),
          authority: user.wallet.publicKey,
          bank: regularUsdcBank,
          tokenAccount: user.usdcAccount,
          amount: depositAmountUsdc_native,
        })
      )
    );
  });

  it("Oracle data refreshes", async () => {
    const now = Math.round(Date.now() / 1000);
    const usdcPrice = BigInt(oracles.usdcPrice * 10 ** oracles.usdcDecimals);
    await updatePriceAccount(
      oracles.usdcOracle,
      {
        expo: -oracles.usdcDecimals,
        timestamp: BigInt(now),
        agg: {
          price: usdcPrice,
          conf: usdcPrice / BigInt(100), // 1% of the price
        },
        emaPrice: {
          val: usdcPrice,
          numer: usdcPrice,
          denom: BigInt(1),
        },
      },
      wallet
    );
  });

  // TODO...
  // it("(user 0) borrows USDC against Kwrapped USDC - happy path", async () => {
  //   const user = users[0];
  //   const mrgnAccount = user.accounts.get(USER_ACCOUNT);
  //   const kwrapAccount = user.accounts.get(KWRAP_USER_ACCOUNT);
  //   const obligation = user.accounts.get(KWRAP_OBLIGATION);
  //   await user.mrgnProgram.provider.sendAndConfirm(
  //     new Transaction().add(
  //       await syncKwrap(user.mrgnProgram, {
  //         userKwrapAccount: kwrapAccount,
  //         bank: usdcBank,
  //       })
  //     )
  //   );

  //   // TODO....
  // });
});
