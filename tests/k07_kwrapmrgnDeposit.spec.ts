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
import { ASSET_TAG_DEFAULT, defaultKwrapBankConfig } from "./utils/types";
import { addKwrapBank, registerKwrapDeposit } from "./utils/kwrap-instructions";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { deriveBankWithSeed } from "./utils/pdas";
import { assert } from "chai";
import {
  KWRAP_OBLIGATION,
  KWRAP_USER_ACCOUNT,
  USER_ACCOUNT,
} from "./utils/mocks";
import { Obligation } from "@kamino-finance/klend-sdk";

describe("Deposit funds into kwrapped banks", () => {
  const mrgnProgram = workspace.Marginfi as Program<Marginfi>;
  const provider = getProvider() as AnchorProvider;
  const wallet = provider.wallet as Wallet;
  const klendProgram = new Program<KaminoLending>(
    idl as KaminoLending,
    new AnchorProvider(provider.connection, wallet, {})
  );

  let usdcBank: PublicKey;

  before(async () => {
    usdcBank = kaminoAccounts.get(KWRAPPED_USDC_BANK);
  });

  it("(user 0) Deposit kwrapped funds into kwrapped usdc bank - happy path", async () => {
    const user = users[0];
    const userMrgnAccount = user.accounts.get(USER_ACCOUNT);
    // You could also derive with `deriveKwrapUser`
    const userKwrapAccount = user.accounts.get(KWRAP_USER_ACCOUNT);
    // You could derive this `deriveObligation`, or read it from the userKwrapAccount.market_info list
    const userKwrappedObligation = user.accounts.get(KWRAP_OBLIGATION);

    await user.mrgnProgram.provider.sendAndConfirm!(
      new Transaction().add(
        await registerKwrapDeposit(user.mrgnProgram, {
          marginfiAccount: userMrgnAccount,
          bank: usdcBank,
          userKwrapAccount: userKwrapAccount,
          obligation: userKwrappedObligation,
        })
      )
    );

    // TODO assert other fields...

    // The position is now collateralized, which is recorded on the kwrap account
    let kwrapAcc = await user.kwrapProgram.account.userAccount.fetch(
      userKwrapAccount
    );

    const obAcc = Obligation.decode(
      (
        await klendProgram.provider.connection.getAccountInfo(
          userKwrappedObligation
        )
      ).data
    );
    assertBNEqual(
      kwrapAcc.marketInfo[0].collaterizatedAmounts[0],
      obAcc.deposits[0].depositedAmount
    );
    assertBNEqual(
      kwrapAcc.marketInfo[0].collaterizatedAmounts[0],
      20 * 10 ** ecosystem.usdcDecimals
    );
  });

  it("(user 0) Top up more usdc into kwrapped usdc bank - happy path", async () => {
    // TODO
  });
});
