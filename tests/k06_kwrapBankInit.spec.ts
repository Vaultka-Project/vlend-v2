import {
  Program,
  workspace,
  BN,
} from "@coral-xyz/anchor";
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
  verbose,
} from "./rootHooks";
import {
  assertBNEqual,
  assertI80F48Equal,
  assertKeysEqual,
} from "./utils/genericTests";
import { Marginfi } from "../target/types/marginfi";
import { ASSET_TAG_DEFAULT, defaultKwrapBankConfig } from "./utils/types";
import { addKwrapBank } from "./utils/kwrap-instructions";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { deriveBankWithSeed } from "./utils/pdas";
import { assert } from "chai";

describe("Init kwrapped banks", () => {
  const mrgnProgram = workspace.Marginfi as Program<Marginfi>;

  let market: PublicKey, usdcReserve: PublicKey, usdcOracle: PublicKey;
  const seed = 42;

  before(async () => {
    market = kaminoAccounts.get(MARKET);
    usdcReserve = kaminoAccounts.get(USDC_RESERVE);
    usdcOracle = oracles.usdcOracle.publicKey;
  });

  it("(admin) Add kwrapped bank (kamino USDC) - happy path", async () => {
    let defaultConfig = defaultKwrapBankConfig(market, usdcReserve, usdcOracle);
    const now = Date.now() / 1000;

    await groupAdmin.mrgnProgram.provider.sendAndConfirm!(
      new Transaction().add(
        await addKwrapBank(groupAdmin.mrgnProgram, {
          marginfiGroup: marginfiGroup.publicKey,
          feePayer: groupAdmin.wallet.publicKey,
          bankMint: ecosystem.usdcMint.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          config: defaultConfig,
          seed: seed,
        })
      )
    );

    const [bankKey, bump] = deriveBankWithSeed(
      mrgnProgram.programId,
      marginfiGroup.publicKey,
      ecosystem.usdcMint.publicKey,
      new BN(seed)
    );

    kaminoAccounts.set(KWRAPPED_USDC_BANK, bankKey);

    if (verbose) {
      console.log("*init kwrapped USDC bank " + bankKey);
    }
    const bank = await mrgnProgram.account.bank.fetch(bankKey);
    const config = bank.config;

    assertKeysEqual(bank.mint, ecosystem.usdcMint.publicKey);
    assert.equal(bank.mintDecimals, ecosystem.usdcDecimals);
    assertKeysEqual(bank.group, marginfiGroup.publicKey);

    assertKeysEqual(config.oracleKeys[0], usdcOracle);
    assertKeysEqual(config.oracleKeys[1], usdcReserve);
    assert.equal(bank.bump, bump);

    assertBNEqual(bank.flags, 0);

    let lastUpdate = bank.lastUpdate.toNumber();
    assert.approximately(now, lastUpdate, 2);
    assertI80F48Equal(config.assetWeightInit, 1);
    assertI80F48Equal(config.assetWeightMaint, 1);
    assertBNEqual(config.depositLimit, 100_000_000_000);

    assert.deepEqual(config.operationalState, { operational: {} });
    assert.deepEqual(config.oracleSetup, { kwrapPythPush: {} });
    assertBNEqual(config.borrowLimit, 0);
    assert.deepEqual(config.riskTier, { kwrap: {} });
    assert.equal(config.assetTag, ASSET_TAG_DEFAULT);
    assertBNEqual(config.totalAssetValueInitLimit, 1_000_000_000_000);
    assert.equal(config.oracleMaxAge, 100);

    assertBNEqual(bank.seed, seed);

    assertKeysEqual(bank.reserve, usdcReserve);

    // Note: Fields not checked above do not apply to this type of bank and could be any value.
  });

  // We might need other Kwrapped banks here, put them here eventually...
});
