import { initializeGroup, addBankWithConfig, configureBank, createBankConfigOpt } from "./functions";
import { marginGroupKeyPair, adminKeypair, tokenConfigs } from "./config";
import { ONE_YEAR_IN_SECONDS } from "./constants";
import { OracleSetup } from "@mrgnlabs/marginfi-client-v2";
import { BankConfigOptRaw, InterestRateConfigRaw } from "./interfaces";
import { WrappedI80F48, bigNumberToWrappedI80F48 } from "@mrgnlabs/mrgn-common";

  

async function main() {
  let updatedBankConfig = createBankConfigOpt({
    interestRateConfig: {
      optimalUtilizationRate: bigNumberToWrappedI80F48(0.8),
      plateauInterestRate: bigNumberToWrappedI80F48(0.1),
      maxInterestRate: bigNumberToWrappedI80F48(2),
      insuranceFeeFixedApr: bigNumberToWrappedI80F48(0),
      insuranceIrFee: bigNumberToWrappedI80F48(0),
      protocolFixedFeeApr: bigNumberToWrappedI80F48(0.01),
      protocolIrFee: bigNumberToWrappedI80F48(0.05),
      startRateAtTarget: bigNumberToWrappedI80F48(0.04 / ONE_YEAR_IN_SECONDS),
      minRateAtTarget: bigNumberToWrappedI80F48(0.001 / ONE_YEAR_IN_SECONDS),
      adjustmentSpeed: bigNumberToWrappedI80F48(50 / ONE_YEAR_IN_SECONDS),
      curveSteepness: bigNumberToWrappedI80F48(4),
    },
  });

  for (const bank of [tokenConfigs["JLP"], tokenConfigs["SOL"], tokenConfigs["USDC"]]) {  
  await configureBank(
    bank.bankKeypair.publicKey,
    marginGroupKeyPair.publicKey,
    adminKeypair,
    updatedBankConfig,
      bank.pythFeed
    );
  }

  // async function main() {
  //   let updatedBankConfig = createBankConfigOpt({
  //     liabilityWeightInit: bigNumberToWrappedI80F48(1.15),
  //     liabilityWeightMaint: bigNumberToWrappedI80F48(1.1),
  //   });

  //   await configureBank(
  //     tokenConfigs["USDT"].bankKeypair.publicKey,
  //     marginGroupKeyPair.publicKey,
  //     adminKeypair,
  //     updatedBankConfig,
  //     tokenConfigs["USDT"].pythFeed
  //   );
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
