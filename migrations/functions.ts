import { Program, AnchorProvider, BN, Wallet, workspace } from "@coral-xyz/anchor";
import { Marginfi } from "../target/types/marginfi";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { bigNumberToWrappedI80F48, WrappedI80F48 } from "@mrgnlabs/mrgn-common";
import { OperationalState, RiskTier } from "@mrgnlabs/marginfi-client-v2";
import { tokenConfigs } from "./config";
import * as anchor from "@coral-xyz/anchor";
import fs from "fs";
import { BankConfigOptRaw, InterestRateConfigRaw } from "./interfaces";
import { BANK_PKS, MARGINFI_PROGRAM_ID, ONE_YEAR_IN_SECONDS } from "./constants";
import { findVaultAddresses } from "./utils/findVaultAddresses";

import { ComputeBudgetProgram } from "@solana/web3.js";
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import { Transaction } from "@solana/web3.js";
import * as dotenv from "dotenv";
dotenv.config();

enum OracleSetup {
  None = "None",
  PythLegacy = "PythLegacy",
  SwitchboardV2 = "SwitchboardV2",
  PythPushOracle = "PythPushOracle",
  SwitchboardPull = "SwitchboardPull",
}

// Load the admin keypair
const adminKeypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync("keypairs/adminKeypair.json", "utf-8"))));

// Create a wallet instance with the admin keypair
const wallet = new anchor.Wallet(adminKeypair);

const connection = new Connection(process.env.SOLANA_RPC_URL!, {
  commitment: "confirmed",
  confirmTransactionInitialTimeout: 60000, // 60 seconds
  wsEndpoint: process.env.SOLANA_WS_ENDPOINT!,
});

const provider = new AnchorProvider(connection, wallet, {
  commitment: "confirmed",
  preflightCommitment: "confirmed",
  skipPreflight: true, // Can help with timeout issues
});

const idl = require("../target/idl/marginfi.json") as Marginfi; // Load the IDL as a TypeScript module
const lendingProgram = new Program<Marginfi>(idl, provider);

export async function initializeGroup(marginGroupKeyPair: Keypair, admin: Keypair) {
  await lendingProgram.methods
    .marginfiGroupInitialize()
    .accounts({
      marginfiGroup: marginGroupKeyPair.publicKey,
      admin: admin.publicKey,
    })
    .signers([admin, marginGroupKeyPair]) //@note this is correct
    .rpc({ commitment: "confirmed" });
}

export async function addBank(
  bankKeyPair: Keypair,
  marginGroupKeyPair: Keypair,
  admin: Keypair,
  bankConfig: any,
  bankMint: PublicKey,
  pythFeed: PublicKey
) {
  // Get mint account info to check if it's Token2022
  const mintAccountInfo = await provider.connection.getAccountInfo(bankMint);
  const remainingAccounts = [];
  // // If mint is Token2022, add it as the first remaining account
  // if (mintAccountInfo?.owner.equals(TOKEN_2022_PROGRAM_ID)) {
  //   remainingAccounts.push({
  //     pubkey: bankMint,
  //     isWritable: false,
  //     isSigner: false,
  //   });
  // }
  // Oracle account comes after the mint
  remainingAccounts.push({
    pubkey: pythFeed,
    isWritable: false,
    isSigner: false,
  });

  await lendingProgram.methods
    .lendingPoolAddBank(bankConfig)
    .accounts({
      marginfiGroup: marginGroupKeyPair.publicKey,
      admin: admin.publicKey,
      bank: bankKeyPair.publicKey,
      bankMint: bankMint,
      feePayer: admin.publicKey,
      tokenProgram: mintAccountInfo?.owner || TOKEN_PROGRAM_ID,
    })
    .remainingAccounts(remainingAccounts)
    .signers([bankKeyPair, admin])
    .rpc({ commitment: "confirmed" });
}

export async function addBankWithConfig(bankKeyPair: Keypair, marginGroupKeyPair: Keypair, admin: Keypair, assetSymbol: string) {
  const config = tokenConfigs[assetSymbol];

  // Helper function to get oracle setup configuration
  const getOracleSetupConfig = (setup: OracleSetup) => {
    switch (setup) {
      case OracleSetup.PythPushOracle:
        return { pythPushOracle: {} };
      case OracleSetup.SwitchboardV2:
        return { switchboardV2: {} };
      case OracleSetup.SwitchboardPull:
        return { switchboardPull: {} };
      case OracleSetup.PythLegacy:
        return { pythLegacy: {} };
      default:
        return { none: {} };
    }
  };

  const bankConfig = {
    assetWeightInit: config.assetWeightInit,
    assetWeightMaint: config.assetWeightMaint,
    liabilityWeightInit: config.liabilityWeightInit,
    liabilityWeightMaint: config.liabilityWeightMaint,
    depositLimit: new BN("18446744073709551615"), // u64::MAX
    borrowLimit: new BN("18446744073709551615"), // u64::MAX
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
    operationalState: { operational: {} },
    oracleSetup: getOracleSetupConfig(config.oracleSetup),
    oracleKey: config.oracleKey,
    riskTier: { collateral: {} },
    totalAssetValueInitLimit: new BN("18446744073709551615"), // u64::MAX
    oracleMaxAge: 60,
  };

  await addBank(bankKeyPair, marginGroupKeyPair, admin, bankConfig, config.tokenMint, config.pythFeed);
}

export async function configureBank(
  bankPubkey: PublicKey,
  marginGroupPubkey: PublicKey,
  admin: Keypair,
  bankConfigOpt: BankConfigOptRaw,
  remainingAccount?: PublicKey // for pythV2 when oracle and pythfeed is not the same
) {
  await lendingProgram.methods
    .lendingPoolConfigureBank(bankConfigOpt)
    .accounts({
      marginfiGroup: marginGroupPubkey,
      admin: admin.publicKey,
      bank: bankPubkey,
    })
    .remainingAccounts([
      //@note to be refactor but usable for now. Too many cases to cover
      {
        pubkey: remainingAccount,
        isWritable: false,
        isSigner: false,
      },
    ])
    .signers([admin])
    .rpc({ commitment: "confirmed" });
}

export function createBankConfigOpt(config: Partial<BankConfigOptRaw>): BankConfigOptRaw {
  return {
    assetWeightInit: config.assetWeightInit ?? null,
    assetWeightMaint: config.assetWeightMaint ?? null,
    liabilityWeightInit: config.liabilityWeightInit ?? null,
    liabilityWeightMaint: config.liabilityWeightMaint ?? null,
    depositLimit: config.depositLimit ?? null,
    borrowLimit: config.borrowLimit ?? null,
    riskTier: config.riskTier ?? null,
    totalAssetValueInitLimit: config.totalAssetValueInitLimit ?? null,
    interestRateConfig: config.interestRateConfig ?? null,
    operationalState: config.operationalState ?? null,
    oracle: config.oracle
      ? {
          setup: config.oracle.setup,
          keys: config.oracle.keys && config.oracle.keys.length > 0 ? [config.oracle.keys[0]] : null,
        }
      : null,
    oracleMaxAge: config.oracleMaxAge ?? null,
    permissionlessBadDebtSettlement: config.permissionlessBadDebtSettlement ?? null,
  };
}

const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
  microLamports: 500_000, // 500,000 micro-lamports per compute unit
});
// Set compute unit limit instruction
const computeUnitLimitIx = ComputeBudgetProgram.setComputeUnitLimit({
  units: 3_000_000, // 3000k compute units
});

export async function collectBankFees(bankPubkey: PublicKey, marginfiGroup: PublicKey) {
  const bankInfo = await getBankInfo(bankPubkey);
  const bankMint = bankInfo.mint;
  const tokenProgram = await getTokenProgramForBank(bankPubkey);

  const remainingAccounts = [];
  if (tokenProgram === TOKEN_2022_PROGRAM_ID) {
    remainingAccounts.push({
      pubkey: bankMint,
      isWritable: false,
      isSigner: false,
    });
  }

  await lendingProgram.methods
    .lendingPoolCollectBankFees()
    .accounts({
      marginfiGroup: marginfiGroup,
      bank: bankPubkey,
      tokenProgram: tokenProgram,
    })
    .preInstructions([priorityFeeIx, computeUnitLimitIx])
    .remainingAccounts(remainingAccounts)
    .signers([adminKeypair])
    .rpc({ commitment: "confirmed" });
}

export async function withdrawProtocolFees(bankPubkey: PublicKey, marginfiGroup: PublicKey, amount: number) {
  console.log("Starting withdrawProtocolFees...");
  console.log("Bank pubkey:", bankPubkey.toString());

  const destinationTokenAccount = await getAdminTokenAccountForBank(bankPubkey);
  console.log("Destination token account:", destinationTokenAccount.toString());

  const bankInfo = await getBankInfo(bankPubkey);
  const bankMint = bankInfo.mint;
  console.log("Bank mint:", bankMint.toString());

  const tokenProgram = await getTokenProgramForBank(bankPubkey);
  console.log("Token program:", tokenProgram.toString());

  const remainingAccounts = [];
  if (tokenProgram === TOKEN_2022_PROGRAM_ID) {
    console.log("Adding bank mint to remaining accounts for Token-2022");
    remainingAccounts.push({
      pubkey: bankMint,
      isWritable: false,
      isSigner: false,
    });
  }
  console.log("Remaining accounts:", remainingAccounts);

  try {
    console.log("Attempting to withdraw fees with params:", {
      marginfiGroup: marginfiGroup.toString(),
      bank: bankPubkey.toString(),
      admin: adminKeypair.publicKey.toString(),
      dstTokenAccount: destinationTokenAccount.toString(),
      amount: amount,
    });

    await lendingProgram.methods
      .lendingPoolWithdrawFees(new BN(amount))
      .accounts({
        marginfiGroup: marginfiGroup,
        bank: bankPubkey,
        admin: adminKeypair.publicKey,
        dstTokenAccount: destinationTokenAccount,
        tokenProgram: tokenProgram,
      })
      .preInstructions([priorityFeeIx, computeUnitLimitIx])
      .remainingAccounts(remainingAccounts)
      .signers([adminKeypair])
      .rpc({
        commitment: "confirmed",
        skipPreflight: true,
      });

    console.log("Withdrawal successful");
  } catch (error) {
    console.error("Error in withdrawProtocolFees:", error);
    console.error("Transaction params:", {
      marginfiGroup: marginfiGroup.toString(),
      bank: bankPubkey.toString(),
      tokenProgram: tokenProgram.toString(),
      remainingAccounts: remainingAccounts.map((acc) => acc.pubkey.toString()),
    });
    throw error;
  }
}

export async function withdrawInsuranceFees(bankPubkey: PublicKey, marginfiGroup: PublicKey, amount: number) {
  const destinationTokenAccount = await getAdminTokenAccountForBank(bankPubkey);
  const bankInfo = await getBankInfo(bankPubkey);
  const bankMint = bankInfo.mint;
  const tokenProgram = await getTokenProgramForBank(bankPubkey);

  const remainingAccounts = [];
  if (tokenProgram === TOKEN_2022_PROGRAM_ID) {
    remainingAccounts.push({
      pubkey: bankMint,
      isWritable: false,
      isSigner: false,
    });
  }

  await lendingProgram.methods
    .lendingPoolWithdrawInsurance(new BN(amount))
    .accounts({
      marginfiGroup: marginfiGroup,
      bank: bankPubkey,
      admin: adminKeypair.publicKey,
      dstTokenAccount: destinationTokenAccount,
      tokenProgram: tokenProgram,
    })
    .remainingAccounts(remainingAccounts)
    .preInstructions([priorityFeeIx, computeUnitLimitIx])
    .signers([adminKeypair])
    .rpc({ commitment: "confirmed" });
}

/*------------------Helper functions------------------*/

/**
 * Get the balance of a bank's fee vault
 */
export async function getFeeVaultBalance(bankPubkey: PublicKey): Promise<number> {
  const vaultAddresses = await findVaultAddresses(bankPubkey, MARGINFI_PROGRAM_ID);
  const tokenAccount = await lendingProgram.provider.connection.getTokenAccountBalance(vaultAddresses.feeVault);
  return Number(tokenAccount.value.amount);
}

/**
 * Get the balance of a bank's insurance vault
 */
export async function getInsuranceVaultBalance(bankPubkey: PublicKey): Promise<number> {
  const vaultAddresses = await findVaultAddresses(bankPubkey, MARGINFI_PROGRAM_ID);
  const tokenAccount = await lendingProgram.provider.connection.getTokenAccountBalance(vaultAddresses.insuranceVault);
  return Number(tokenAccount.value.amount);
}

/**
 * Get both fee and insurance vault balances for a bank
 */
export async function getBankVaultBalances(bankPubkey: PublicKey): Promise<{ feeVaultBalance: number; insuranceVaultBalance: number }> {
  const [feeVaultBalance, insuranceVaultBalance] = await Promise.all([
    getFeeVaultBalance(bankPubkey),
    getInsuranceVaultBalance(bankPubkey),
  ]);

  return {
    feeVaultBalance,
    insuranceVaultBalance,
  };
}

interface BankInfo {
  mint: PublicKey;
  vault: PublicKey;
  vaultAuthority: PublicKey;
  feeVault: PublicKey;
  feeVaultAuthority: PublicKey;
  insuranceVault: PublicKey;
  insuranceVaultAuthority: PublicKey;
  collectedInsuranceFeesOutstanding: BN;
  collectedGroupFeesOutstanding: BN;
  totalLiabilityShares: BN;
  totalAssetShares: BN;
}

export async function getBankInfo(bankPubkey: PublicKey): Promise<BankInfo> {
  const bankAccount = await lendingProgram.account.bank.fetch(bankPubkey);
  const vaultAddresses = await findVaultAddresses(bankPubkey, MARGINFI_PROGRAM_ID);

  return {
    mint: bankAccount.mint,
    vault: vaultAddresses.liquidityVault,
    vaultAuthority: vaultAddresses.liquidityVaultAuthority,
    feeVault: vaultAddresses.feeVault,
    feeVaultAuthority: vaultAddresses.feeVaultAuthority,
    insuranceVault: vaultAddresses.insuranceVault,
    insuranceVaultAuthority: vaultAddresses.insuranceVaultAuthority,
    collectedInsuranceFeesOutstanding: new BN(bankAccount.collectedInsuranceFeesOutstanding.value),
    collectedGroupFeesOutstanding: new BN(bankAccount.collectedGroupFeesOutstanding.value),
    totalLiabilityShares: new BN(bankAccount.totalLiabilityShares.value),
    totalAssetShares: new BN(bankAccount.totalAssetShares.value),
  };
}

export async function logBankDepositLimit(bankPubkey: PublicKey) {
  const bankAccount = await lendingProgram.account.bank.fetch(bankPubkey);
  console.log(`Bank ${bankPubkey.toString()}:`);
  console.log(`- Deposit limit: ${bankAccount.config.depositLimit} (raw)`);
  console.log(`- Mint decimals: ${bankAccount.mintDecimals}`);
  console.log(`- Deposit limit: ${Number(bankAccount.config.depositLimit) / Math.pow(10, bankAccount.mintDecimals)} (formatted)`);
}
33;
// Usage:
// await logBankDepositLimit(BANK_PKS.USDT);

async function getTokenProgramForBank(bankPubkey: PublicKey): Promise<PublicKey> {
  console.log("Getting token program for bank:", bankPubkey.toString());
  const isPYUSD = bankPubkey.equals(BANK_PKS.PYUSD);
  console.log("Is PYUSD bank:", isPYUSD);
  const tokenProgram = isPYUSD ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
  console.log("Selected token program:", tokenProgram.toString());
  return tokenProgram;
}

async function getAdminTokenAccountForBank(bankPubkey: PublicKey): Promise<PublicKey> {
  const bankInfo = await getBankInfo(bankPubkey);
  const bankMint = bankInfo.mint;
  const tokenProgram = await getTokenProgramForBank(bankPubkey);

  // Get associated token account address
  const ata = await getAssociatedTokenAddress(
    bankMint,
    adminKeypair.publicKey,
    true, // allowOwnerOffCurve
    tokenProgram // specify token program based on token type
  );

  // Check if account exists
  const account = await provider.connection.getAccountInfo(ata);

  // If account doesn't exist, create it
  if (!account) {
    console.log("Creating associated token account for admin...");
    const ix = createAssociatedTokenAccountInstruction(
      adminKeypair.publicKey, // payer
      ata, // associatedToken
      adminKeypair.publicKey, // owner
      bankMint, // mint
      tokenProgram // token program id
    );

    const tx = new Transaction().add(ix);
    await provider.sendAndConfirm(tx, [adminKeypair]);
  }

  return ata;
}
