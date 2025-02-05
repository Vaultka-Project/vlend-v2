import { Keypair, PublicKey } from "@solana/web3.js";
import { WrappedI80F48, bigNumberToWrappedI80F48 } from "@mrgnlabs/mrgn-common";
import fs from "fs";
import path from "path";

enum OracleSetup {
  None = "None",
  PythLegacy = "PythLegacy",
  SwitchboardV2 = "SwitchboardV2",
  SwitchboardPull = "SwitchboardPull",
  PythPushOracle = "PythPushOracle",
}

export interface TokenConfig {
  tokenMint: PublicKey;
  oracleKey: PublicKey;
  pythFeed: PublicKey;
  assetWeightInit: WrappedI80F48;
  assetWeightMaint: WrappedI80F48;
  liabilityWeightInit: WrappedI80F48;
  liabilityWeightMaint: WrappedI80F48;
  oracleSetup: OracleSetup;
}

// Public Key: HBTCNvkwjVFGtPjEVkWizHDGRRXUPZqGrHQFwwVUYmZC

export const tokenConfigs: Record<string, TokenConfig & { bankKeypair: Keypair }> = {
  USDC: {
    tokenMint: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
    oracleKey: new PublicKey("Gnt27xtC473ZT2Mw5u8wZ68Z3gULkSTb5DuxJy7eJotD"),
    pythFeed: new PublicKey("Dpw1EAVrSB1ibxiDQyTAW6Zip3J4Btk2x4SgApQCeFbX"),
    assetWeightInit: bigNumberToWrappedI80F48(1),
    assetWeightMaint: bigNumberToWrappedI80F48(1),
    liabilityWeightInit: bigNumberToWrappedI80F48(1),
    liabilityWeightMaint: bigNumberToWrappedI80F48(1),
    oracleSetup: OracleSetup.PythPushOracle,
    bankKeypair: Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync(path.join(__dirname, "../keypairs/usdc_bank_keypair.json"), "utf-8")))
    ),
  },
  SOL: {
    tokenMint: new PublicKey("So11111111111111111111111111111111111111112"),
    oracleKey: new PublicKey("H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG"),
    pythFeed: new PublicKey("7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE"),
    assetWeightInit: bigNumberToWrappedI80F48(0.8),
    assetWeightMaint: bigNumberToWrappedI80F48(0.9),
    liabilityWeightInit: bigNumberToWrappedI80F48(1),
    liabilityWeightMaint: bigNumberToWrappedI80F48(1),
    oracleSetup: OracleSetup.PythPushOracle,
    bankKeypair: Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync(path.join(__dirname, "../keypairs/sol_bank_keypair.json"), "utf-8")))
    ),
  },
  JLP: {
    tokenMint: new PublicKey("27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4"),
    oracleKey: new PublicKey("ETzAjoG8xfhNzUD2ARvFncRf3K2qNokqGU9f5jeo2o1T"), //OG
    pythFeed: new PublicKey("2TTGSRSezqFzeLUH8JwRUbtN66XLLaymfYsWRTMjfiMw"), //OG
    assetWeightInit: bigNumberToWrappedI80F48(0.7),
    assetWeightMaint: bigNumberToWrappedI80F48(0.8),
    liabilityWeightInit: bigNumberToWrappedI80F48(1.23),
    liabilityWeightMaint: bigNumberToWrappedI80F48(1.1),
    oracleSetup: OracleSetup.PythPushOracle,
    bankKeypair: Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync(path.join(__dirname, "../keypairs/jlp_bank_keypair.json"), "utf-8")))
    ),
  },
  JitoSOL: {
    tokenMint: new PublicKey("J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn"),
    oracleKey: new PublicKey("7yyaeuJ1GGtVBLT2z2xub5ZWYKaNhF28mj1RdV4VDFVk"),
    pythFeed: new PublicKey("AxaxyeDT8JnWERSaTKvFXvPKkEdxnamKSqpWbsSjYg1g"),
    assetWeightInit: bigNumberToWrappedI80F48(0.8),
    assetWeightMaint: bigNumberToWrappedI80F48(0.9),
    liabilityWeightInit: bigNumberToWrappedI80F48(1.23),
    liabilityWeightMaint: bigNumberToWrappedI80F48(1.1),
    oracleSetup: OracleSetup.PythPushOracle,
    bankKeypair: Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync(path.join(__dirname, "../keypairs/jitosol_bank_keypair.json"), "utf-8")))
    ),
  },

  sSOL: {
    tokenMint: new PublicKey("sSo14endRuUbvQaJS3dq36Q829a3A6BEfoeeRGJywEh"),
    oracleKey: new PublicKey("9SvZYsEE6ade2gEc9bsCsfW9S7mR4RWAiNHh9cEiLZoT"),
    pythFeed: new PublicKey("9SvZYsEE6ade2gEc9bsCsfW9S7mR4RWAiNHh9cEiLZoT"),
    assetWeightInit: bigNumberToWrappedI80F48(0.8),
    assetWeightMaint: bigNumberToWrappedI80F48(0.9),
    liabilityWeightInit: bigNumberToWrappedI80F48(1.23),
    liabilityWeightMaint: bigNumberToWrappedI80F48(1.1),
    oracleSetup: OracleSetup.PythPushOracle,
    bankKeypair: Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync(path.join(__dirname, "../keypairs/ssol_bank_keypair.json"), "utf-8")))
    ),
  },
  JupSOL: {
    tokenMint: new PublicKey("jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v"),
    oracleKey: new PublicKey("HX5WM3qzogAfRCjBUWwnniLByMfFrjm1b5yo4KoWGR27"),
    pythFeed: new PublicKey("HX5WM3qzogAfRCjBUWwnniLByMfFrjm1b5yo4KoWGR27"),
    assetWeightInit: bigNumberToWrappedI80F48(0.8),
    assetWeightMaint: bigNumberToWrappedI80F48(0.9),
    liabilityWeightInit: bigNumberToWrappedI80F48(1.23),
    liabilityWeightMaint: bigNumberToWrappedI80F48(1.1),
    oracleSetup: OracleSetup.SwitchboardPull,
    bankKeypair: Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync(path.join(__dirname, "../keypairs/jups_bank_keypair.json"), "utf-8")))
    ),
  },
  USDS: {
    tokenMint: new PublicKey("USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKcR81vTwcA"),
    oracleKey: new PublicKey("95CJ8Jd54H97mBPuZnRWajUsaZnP2VFV522WYxJ5ppsz"),
    pythFeed: new PublicKey("8uSm82cstM5CxhHhCFY5v7Qxbc4YjmAt5gjeMMaLzoM8"),
    assetWeightInit: bigNumberToWrappedI80F48(0.85),
    assetWeightMaint: bigNumberToWrappedI80F48(0.9),
    liabilityWeightInit: bigNumberToWrappedI80F48(1.15),
    liabilityWeightMaint: bigNumberToWrappedI80F48(1.1),
    oracleSetup: OracleSetup.PythPushOracle,
    bankKeypair: Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync(path.join(__dirname, "../keypairs/usds_bank_keypair.json"), "utf-8")))
    ),
  },
  USDT: {
    tokenMint: new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"),
    oracleKey: new PublicKey("3vxLXJqLqF3JG5TCbYycbKWRBbCJQLxQmBGCkyqEEefL"), // Mock oracle address
    pythFeed: new PublicKey("HT2PLQBcG5EiCcNSaMHAjSgd9F98ecpATbk4Sk5oYuM"), // Mock pyth address
    assetWeightInit: bigNumberToWrappedI80F48(0.85),
    assetWeightMaint: bigNumberToWrappedI80F48(0.9),
    liabilityWeightInit: bigNumberToWrappedI80F48(1.15),
    liabilityWeightMaint: bigNumberToWrappedI80F48(1.1),
    oracleSetup: OracleSetup.PythPushOracle,
    bankKeypair: Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync(path.join(__dirname, "../keypairs/usdt_bank_keypair.json"), "utf-8")))
    ),
  },
  PYUSD: {
    tokenMint: new PublicKey("2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo"),
    oracleKey: new PublicKey("E3iagrg2kXyNJ9Ad2R2pNUsRmXutyQScu3m1FcQmBsAH"), // Mock oracle address
    pythFeed: new PublicKey("A52UBHzxnKrH17zjhajRTgHcWwtxN7KYDAzBgraqFxQJ"), // Moc3k pyth address
    assetWeightInit: bigNumberToWrappedI80F48(0.85),
    assetWeightMaint: bigNumberToWrappedI80F48(0.9),
    liabilityWeightInit: bigNumberToWrappedI80F48(1.15),
    liabilityWeightMaint: bigNumberToWrappedI80F48(1.1),
    oracleSetup: OracleSetup.PythPushOracle,
    bankKeypair: Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync(path.join(__dirname, "../keypairs/pyusd_bank_keypair.json"), "utf-8")))
    ),
  },
};

// Load keypairs from files
export const marginGroupKeyPair = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync("keypairs/marginGroupKeyPair.json", "utf-8")))
);
export const adminKeypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync("keypairs/adminKeypair.json", "utf-8"))));
