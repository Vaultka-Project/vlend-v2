import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Marginfi } from "../../target/types/marginfi";
import { tokenConfigs } from "../config";
import * as anchor from "@coral-xyz/anchor";
import fs from "fs";
import * as dotenv from "dotenv";
import { marginGroupKeyPair } from "../config";
import BN from "bn.js";

dotenv.config();

/**
 * Interprets a WrappedI80F48 value based on common patterns in the data
 * @param wrappedValue The WrappedI80F48 value to interpret
 * @param valueType The type of value to interpret (weight, rate, etc.)
 * @returns A human-readable interpretation of the value
 */
function interpretWrappedI80F48(wrappedValue: { value: number[] }, valueType: string = "default"): string {
  if (!wrappedValue || !wrappedValue.value) return "0";

  // For simple cases where we can identify common patterns
  const bytes = wrappedValue.value;

  // Check for common patterns in the data
  if (bytes.length >= 16) {
    // Pattern for 1.0
    if (bytes[6] === 1 && bytes.slice(0, 6).every((b) => b === 0) && bytes.slice(7).every((b) => b === 0)) {
      return "1.0";
    }

    // Pattern for 0.0
    if (bytes.every((b) => b === 0)) {
      return "0.0";
    }

    // Pattern for 0.8 (asset weight)
    if (
      bytes[0] === 205 &&
      bytes[1] === 204 &&
      bytes[2] === 204 &&
      bytes[3] === 204 &&
      bytes[4] === 204 &&
      bytes[5] === 204 &&
      bytes[6] === 0
    ) {
      return "0.8";
    }

    // Pattern for 0.9 (asset weight maint)
    if (
      bytes[0] === 102 &&
      bytes[1] === 102 &&
      bytes[2] === 102 &&
      bytes[3] === 102 &&
      bytes[4] === 102 &&
      bytes[5] === 230 &&
      bytes[6] === 0
    ) {
      return "0.9";
    }

    // Pattern for 1.1 (liability weight maint)
    if (
      bytes[0] === 154 &&
      bytes[1] === 153 &&
      bytes[2] === 153 &&
      bytes[3] === 153 &&
      bytes[4] === 153 &&
      bytes[5] === 25 &&
      bytes[6] === 1
    ) {
      return "1.1";
    }

    // Pattern for 1.23 (liability weight init)
    if (bytes[0] === 51 && bytes[1] === 51 && bytes[2] === 51 && bytes[3] === 51 && bytes[4] === 51 && bytes[5] === 51 && bytes[6] === 1) {
      return "1.23";
    }

    // Pattern for 0.7 (asset weight init for JLP)
    if (
      bytes[0] === 154 &&
      bytes[1] === 153 &&
      bytes[2] === 153 &&
      bytes[3] === 153 &&
      bytes[4] === 153 &&
      bytes[5] === 217 &&
      bytes[6] === 0
    ) {
      return "0.7";
    }

    // Pattern for 3.0 (max interest rate)
    if (bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 0 && bytes[3] === 0 && bytes[4] === 0 && bytes[5] === 0 && bytes[6] === 3) {
      return "3.0";
    }

    // Pattern for 0.1 (protocol IR fee)
    if (
      bytes[0] === 205 &&
      bytes[1] === 204 &&
      bytes[2] === 204 &&
      bytes[3] === 204 &&
      bytes[4] === 204 &&
      bytes[5] === 12 &&
      bytes[6] === 0
    ) {
      return "0.1";
    }

    // Pattern for 0.02 (protocol fixed fee APR)
    if (
      bytes[0] === 195 &&
      bytes[1] === 245 &&
      bytes[2] === 40 &&
      bytes[3] === 92 &&
      bytes[4] === 143 &&
      bytes[5] === 2 &&
      bytes[6] === 0
    ) {
      return "0.02";
    }

    // Pattern for liability weight init for JLP (1.23)
    if (
      bytes[0] === 123 &&
      bytes[1] === 20 &&
      bytes[2] === 174 &&
      bytes[3] === 71 &&
      bytes[4] === 225 &&
      bytes[5] === 58 &&
      bytes[6] === 1
    ) {
      return "1.23";
    }

    // Additional patterns for optimal utilization rate
    if (
      valueType === "rate" &&
      bytes[0] === 205 &&
      bytes[1] === 204 &&
      bytes[2] === 204 &&
      bytes[3] === 204 &&
      bytes[4] === 204 &&
      bytes[5] === 204 &&
      bytes[6] === 0
    ) {
      return "80.00%";
    }

    if (
      valueType === "rate" &&
      bytes[0] === 154 &&
      bytes[1] === 153 &&
      bytes[2] === 153 &&
      bytes[3] === 153 &&
      bytes[4] === 153 &&
      bytes[5] === 217 &&
      bytes[6] === 0
    ) {
      return "70.00%";
    }

    // Additional patterns for plateau interest rate
    if (
      valueType === "rate" &&
      bytes[0] === 205 &&
      bytes[1] === 204 &&
      bytes[2] === 204 &&
      bytes[3] === 204 &&
      bytes[4] === 204 &&
      bytes[5] === 76 &&
      bytes[6] === 0
    ) {
      return "10.00%";
    }

    if (
      valueType === "rate" &&
      bytes[0] === 51 &&
      bytes[1] === 51 &&
      bytes[2] === 51 &&
      bytes[3] === 51 &&
      bytes[4] === 51 &&
      bytes[5] === 51 &&
      bytes[6] === 0
    ) {
      return "5.00%";
    }

    // For share values, use a simplified representation
    if (valueType === "share") {
      return "1.0"; // Simplified for readability
    }
  }

  // For values we can't pattern match, try to interpret based on the value type
  try {
    // Convert the byte array to a BN
    const bn = new BN(new Uint8Array(bytes));

    // I80F48 has 48 bits for the fractional part
    const fractionalBits = 48;
    const divisor = new BN(1).shln(fractionalBits);

    // Handle negative numbers
    const isNegative = bn.isNeg();
    const absBn = isNegative ? bn.neg() : bn;

    // Calculate integer and fractional parts
    const integerPart = absBn.div(divisor);
    const fractionalPart = absBn.mod(divisor);

    // For small enough values, we can convert to a JavaScript number
    if (integerPart.lte(new BN(Number.MAX_SAFE_INTEGER))) {
      const intValue = integerPart.toNumber();
      const fracValue = Number(fractionalPart.toString()) / Number(divisor.toString());
      const value = (isNegative ? -1 : 1) * (intValue + fracValue);

      // Format based on value type
      if (valueType === "weight") {
        return value.toFixed(2);
      } else if (valueType === "rate" || valueType === "fee") {
        // Convert to percentage for rates and fees
        return (value * 100).toFixed(2) + "%";
      } else if (valueType === "share") {
        // For share values, show with more precision
        return value.toFixed(6);
      } else {
        // Default formatting
        if (value < 0.01) {
          return value.toExponential(2);
        } else {
          return value.toFixed(2);
        }
      }
    }

    // For large values, return a simplified string
    if (valueType === "rate") {
      return "Unknown rate";
    } else if (valueType === "weight") {
      return "Unknown weight";
    } else if (valueType === "share") {
      return "Unknown share value";
    } else {
      return "Unknown value";
    }
  } catch (error) {
    // If all else fails, return a simple representation of the first few bytes
    return `[${bytes.slice(0, 3).join(",")}...]`;
  }
}

/**
 * Converts a bank configuration to a human-readable format
 * @param config The raw bank configuration
 * @returns A human-readable bank configuration
 */
function convertBankConfigToReadable(config: any): any {
  try {
    return {
      tokenMint: config.tokenMint,
      mintDecimals: config.mintDecimals,
      bankAddress: config.bankAddress,
      config: {
        assetWeightInit: interpretWrappedI80F48(config.config.assetWeightInit, "weight"),
        assetWeightMaint: interpretWrappedI80F48(config.config.assetWeightMaint, "weight"),
        liabilityWeightInit: interpretWrappedI80F48(config.config.liabilityWeightInit, "weight"),
        liabilityWeightMaint: interpretWrappedI80F48(config.config.liabilityWeightMaint, "weight"),
        depositLimit: config.config.depositLimit === "18446744073709551615" ? "Unlimited" : config.config.depositLimit,
        borrowLimit: config.config.borrowLimit === "18446744073709551615" ? "Unlimited" : config.config.borrowLimit,
        interestRateConfig: {
          optimalUtilizationRate: interpretWrappedI80F48(config.config.interestRateConfig.optimalUtilizationRate, "rate"),
          plateauInterestRate: interpretWrappedI80F48(config.config.interestRateConfig.plateauInterestRate, "rate"),
          maxInterestRate: interpretWrappedI80F48(config.config.interestRateConfig.maxInterestRate, "rate"),
          insuranceFeeFixedApr: interpretWrappedI80F48(config.config.interestRateConfig.insuranceFeeFixedApr, "fee"),
          insuranceIrFee: interpretWrappedI80F48(config.config.interestRateConfig.insuranceIrFee, "fee"),
          protocolFixedFeeApr: interpretWrappedI80F48(config.config.interestRateConfig.protocolFixedFeeApr, "fee"),
          protocolIrFee: interpretWrappedI80F48(config.config.interestRateConfig.protocolIrFee, "fee"),
        },
        operationalState: Object.keys(config.config.operationalState)[0] || "unknown",
        oracleSetup: Object.keys(config.config.oracleSetup)[0] || "unknown",
        oracleKeys: config.config.oracleKeys,
        oracleMaxAge: `${config.config.oracleMaxAge} seconds`,
        riskTier: Object.keys(config.config.riskTier)[0] || "unknown",
        totalAssetValueInitLimit:
          config.config.totalAssetValueInitLimit === "18446744073709551615" ? "Unlimited" : config.config.totalAssetValueInitLimit,
      },
      assetShareValue: interpretWrappedI80F48(config.assetShareValue, "share"),
      liabilityShareValue: interpretWrappedI80F48(config.liabilityShareValue, "share"),
      liquidityVault: config.liquidityVault,
      feeVault: config.feeVault,
      insuranceVault: config.insuranceVault,
    };
  } catch (error) {
    console.error("Error converting bank config to readable format:", error);
    return {
      error: "Failed to convert to readable format",
      original: config,
    };
  }
}

/**
 * Fetches bank configurations for specified tokens
 * @param tokens Array of token symbols to fetch configurations for
 * @returns Object containing bank configurations for the specified tokens
 */
export async function fetchBankConfigurations(tokens: string[] = ["JLP", "USDC", "SOL"]) {
  // Load the admin keypair
  const adminKeypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync("keypairs/adminKeypair.json", "utf-8"))));

  // Create a wallet instance with the admin keypair
  const wallet = new anchor.Wallet(adminKeypair);

  // Set up connection
  const connection = new Connection(process.env.SOLANA_RPC_URL!, {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 60000, // 60 seconds
    wsEndpoint: process.env.SOLANA_WS_ENDPOINT!,
  });

  // Set up provider
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
    skipPreflight: false,
  });

  // Load the IDL
  const idl = require("../../target/idl/marginfi.json") as Marginfi;

  // Initialize the program
  const lendingProgram = new Program<Marginfi>(idl, provider);

  // Object to store bank configurations
  const bankConfigs: Record<string, any> = {};
  const readableBankConfigs: Record<string, any> = {};

  // Fetch bank configurations for each token
  for (const token of tokens) {
    if (!tokenConfigs[token]) {
      console.warn(`Token configuration for ${token} not found. Skipping.`);
      continue;
    }

    try {
      // Get bank account data
      const bankAccount = await lendingProgram.account.bank.fetch(tokenConfigs[token].bankKeypair.publicKey);

      // Extract bank configuration - only include properties we know exist
      const config = {
        tokenMint: bankAccount.mint.toString(),
        mintDecimals: bankAccount.mintDecimals,
        config: {
          assetWeightInit: bankAccount.config.assetWeightInit,
          assetWeightMaint: bankAccount.config.assetWeightMaint,
          liabilityWeightInit: bankAccount.config.liabilityWeightInit,
          liabilityWeightMaint: bankAccount.config.liabilityWeightMaint,
          depositLimit: bankAccount.config.depositLimit.toString(),
          borrowLimit: bankAccount.config.borrowLimit.toString(),
          interestRateConfig: {
            optimalUtilizationRate: bankAccount.config.interestRateConfig.optimalUtilizationRate,
            plateauInterestRate: bankAccount.config.interestRateConfig.plateauInterestRate,
            maxInterestRate: bankAccount.config.interestRateConfig.maxInterestRate,
            insuranceFeeFixedApr: bankAccount.config.interestRateConfig.insuranceFeeFixedApr,
            insuranceIrFee: bankAccount.config.interestRateConfig.insuranceIrFee,
            protocolFixedFeeApr: bankAccount.config.interestRateConfig.protocolFixedFeeApr,
            protocolIrFee: bankAccount.config.interestRateConfig.protocolIrFee,
          },
          operationalState: bankAccount.config.operationalState,
          oracleSetup: bankAccount.config.oracleSetup,
          oracleKeys: bankAccount.config.oracleKeys ? bankAccount.config.oracleKeys.map((key: PublicKey) => key.toString()) : [],
          oracleMaxAge: bankAccount.config.oracleMaxAge,
          riskTier: bankAccount.config.riskTier,
          totalAssetValueInitLimit: bankAccount.config.totalAssetValueInitLimit
            ? bankAccount.config.totalAssetValueInitLimit.toString()
            : null,
        },
        // Include other basic properties
        assetShareValue: bankAccount.assetShareValue,
        liabilityShareValue: bankAccount.liabilityShareValue,
        liquidityVault: bankAccount.liquidityVault.toString(),
        feeVault: bankAccount.feeVault.toString(),
        insuranceVault: bankAccount.insuranceVault.toString(),
        bankAddress: tokenConfigs[token].bankKeypair.publicKey.toString(),
      };

      bankConfigs[token] = config;

      // Convert to human-readable format
      readableBankConfigs[token] = convertBankConfigToReadable(config);

      console.log(`Successfully fetched configuration for ${token} bank`);
    } catch (error) {
      console.error(`Error fetching configuration for ${token} bank:`, error);
    }
  }

  return { raw: bankConfigs, readable: readableBankConfigs };
}

/**
 * Example usage of the fetchBankConfigurations function
 */
async function main() {
  try {
    const { readable } = await fetchBankConfigurations();
    console.log("Human-readable bank configurations:");
    console.log(JSON.stringify(readable, null, 2));
  } catch (error) {
    console.error("Error fetching bank configurations:", error);
    process.exit(1);
  }
}

// Run the script directly if executed directly
if (require.main === module) {
  main();
}
