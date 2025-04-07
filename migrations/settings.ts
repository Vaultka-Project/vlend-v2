import { initializeGroup, addBankWithConfig, configureBank, createBankConfigOpt, marginfiGroupConfigure } from "./functions";
import { marginGroupKeyPair, adminKeypair, tokenConfigs } from "./config";
import { ONE_YEAR_IN_SECONDS } from "./constants";
import { OracleSetup } from "@mrgnlabs/marginfi-client-v2";
import { BankConfigOptRaw, InterestRateConfigRaw } from "./interfaces";
import { WrappedI80F48, bigNumberToWrappedI80F48 } from "@mrgnlabs/mrgn-common";
import { createAssociatedTokenAccount } from "@solana/spl-token";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import fs from "fs";

async function main() {
  //create a usdc ata for this user: GwkqtKNeVMpT9UWkH5g9gzmVSdu32yYEMWuvs9iH5JWW

  const usdcMint = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
  const user = new PublicKey("GwkqtKNeVMpT9UWkH5g9gzmVSdu32yYEMWuvs9iH5JWW");

  const connection = new Connection(process.env.SOLANA_RPC_URL, {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 60000, // 60 seconds
    wsEndpoint: process.env.SOLANA_WS_ENDPOINT,
  });

  //
  let updatedBankConfig = createBankConfigOpt({
    assetWeightInit: bigNumberToWrappedI80F48(0.9),
    assetWeightMaint: bigNumberToWrappedI80F48(0.95),
    liabilityWeightInit: bigNumberToWrappedI80F48(1.23),
    liabilityWeightMaint: bigNumberToWrappedI80F48(1.1),
  });
  //   //
  for (const bank of [tokenConfigs["JLP"]]) {
    await configureBank(bank.bankKeypair.publicKey, marginGroupKeyPair.publicKey, adminKeypair, updatedBankConfig, bank.pythFeed);
  }

  // async function main() {
  //   let updatedBankConfig = createBankConfigOpt({
  //     liabilityWeightInit: bigNumberToWrappedI80F48(1.15),
  //     liabilityWeightMaint: bigNumberToWrappedI80F48(1.1),
  //   });

  //
  //   await configureBank(
  //     tokenConfigs["USDS"].bankKeypair.publicKey,
  //     marginGroupKeyPair.publicKey,
  //     adminKeypair,
  //     updatedBankConfig,
  //     tokenConfigs["USDS"].pythFeed
  //   );

  // await configureBank(
  //   tokenConfigs["JitoSOL"].bankKeypair.publicKey,
  //   marginGroupKeyPair.publicKey,
  //   adminKeypair,
  //   updatedBankConfig,
  //   tokenConfigs["JitoSOL"].pythFeed
  // );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
