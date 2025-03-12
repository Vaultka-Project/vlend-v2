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
      if (valueType === "balance") {
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
    return bn.toString();
  } catch (error) {
    // If all else fails, return a simple representation of the first few bytes
    return `[${bytes.slice(0, 3).join(",")}...]`;
  }
}

/**
 * Calculates the actual token balance from shares and share value
 * @param shares The number of shares
 * @param shareValue The value of each share
 * @param decimals The number of decimals for the token
 * @returns The actual token balance
 */
function calculateTokenBalance(shares: string, shareValue: string, decimals: number): string {
  try {
    // If either value is not a valid number, return "0"
    if (shares === "0.0" || shares === "0" || shareValue === "0.0" || shareValue === "0") {
      return "0";
    }

    // Try to convert to numbers
    const sharesNum = parseFloat(shares);
    const shareValueNum = parseFloat(shareValue);

    if (isNaN(sharesNum) || isNaN(shareValueNum)) {
      // If we have a BN string, try to use BN math
      try {
        const sharesBN = new BN(shares);
        const shareValueBN = new BN(shareValue);
        const result = sharesBN.mul(shareValueBN).div(new BN(10).pow(new BN(decimals)));
        return result.toString();
      } catch (e) {
        return "Unable to calculate";
      }
    }

    // Calculate the actual balance
    const balance = sharesNum * shareValueNum;

    // Format based on the size of the number
    if (balance < 0.000001) {
      return balance.toExponential(6);
    } else if (balance < 1) {
      return balance.toFixed(6);
    } else if (balance < 1000) {
      return balance.toFixed(2);
    } else if (balance < 1000000) {
      return `${(balance / 1000).toFixed(2)}K`;
    } else {
      return `${(balance / 1000000).toFixed(2)}M`;
    }
  } catch (error) {
    return "Error calculating balance";
  }
}

/**
 * Fetches a user's marginfi account information
 * @param userAddress The public key of the user
 * @returns Object containing the user's marginfi account information
 */
export async function fetchUserMarginfiAccount(userAddress: string = "73yaUC1fzgDJTjLVz6ChiUjSbqjULNZwdtZJdkjTro6w") {
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

  // Convert user address to PublicKey
  const userPublicKey = new PublicKey(userAddress);

  try {
    // Find all marginfi accounts for the user
    // The authority field is at offset 32 (after the group field which is 32 bytes)
    const marginfiAccounts = await lendingProgram.account.marginfiAccount.all([
      {
        memcmp: {
          offset: 32, // authority field is at offset 32 (after group field)
          bytes: userPublicKey.toBase58(),
        },
      },
    ]);

    if (marginfiAccounts.length === 0) {
      console.log(`No marginfi accounts found for user ${userAddress}`);

      // Try to find the account by getting all accounts and filtering
      console.log("Trying to find account by getting all accounts...");
      const allAccounts = await lendingProgram.account.marginfiAccount.all();

      // Log the first few accounts to understand their structure
      if (allAccounts.length > 0) {
        console.log(`Found ${allAccounts.length} total marginfi accounts`);
        console.log("First account authority:", allAccounts[0].account.authority.toString());

        // Filter accounts by authority
        const userAccounts = allAccounts.filter((account) => account.account.authority.toString() === userPublicKey.toString());

        if (userAccounts.length > 0) {
          console.log(`Found ${userAccounts.length} accounts for user ${userAddress} by filtering`);
          return processMarginfiAccounts(userAccounts, lendingProgram);
        }
      }

      return { accounts: [] };
    }

    return processMarginfiAccounts(marginfiAccounts, lendingProgram);
  } catch (error) {
    console.error(`Error fetching marginfi accounts for user ${userAddress}:`, error);
    return {
      error: `Failed to fetch marginfi accounts: ${error}`,
    };
  }
}

/**
 * Process marginfi accounts to extract relevant information
 * @param marginfiAccounts The marginfi accounts to process
 * @param lendingProgram The lending program instance
 * @returns Processed account information
 */
async function processMarginfiAccounts(marginfiAccounts: any[], lendingProgram: Program<Marginfi>) {
  // Process each account
  const processedAccounts = await Promise.all(
    marginfiAccounts.map(async (account) => {
      const marginfiAccount = account.account;

      // Extract active balances
      const activeBalances = await Promise.all(
        marginfiAccount.lendingAccount.balances
          .filter((balance: any) => balance.active)
          .map(async (balance: any) => {
            // Fetch the bank information for this balance
            let bankInfo;
            let assetShareValue = "1.0";
            let liabilityShareValue = "1.0";
            let tokenBalance = "0";
            let tokenDebt = "0";

            try {
              const bankAccount = await lendingProgram.account.bank.fetch(balance.bankPk);

              // Get token symbol from bank mint
              const bankMint = bankAccount.mint.toString();
              const tokenSymbol =
                Object.entries(tokenConfigs).find(([_, config]) => config.tokenMint.toString() === bankMint)?.[0] || "Unknown";

              // Get share values
              assetShareValue = interpretWrappedI80F48(bankAccount.assetShareValue, "share");
              liabilityShareValue = interpretWrappedI80F48(bankAccount.liabilityShareValue, "share");

              // Calculate actual token balances
              const assetShares = interpretWrappedI80F48(balance.assetShares, "balance");
              const liabilityShares = interpretWrappedI80F48(balance.liabilityShares, "balance");

              tokenBalance = calculateTokenBalance(assetShares, assetShareValue, bankAccount.mintDecimals);
              tokenDebt = calculateTokenBalance(liabilityShares, liabilityShareValue, bankAccount.mintDecimals);

              bankInfo = {
                bankAddress: balance.bankPk.toString(),
                tokenSymbol,
                tokenMint: bankMint,
                mintDecimals: bankAccount.mintDecimals,
              };
            } catch (error) {
              console.warn(`Error fetching bank info for ${balance.bankPk.toString()}:`, error);
              bankInfo = {
                bankAddress: balance.bankPk.toString(),
                tokenSymbol: "Unknown",
                tokenMint: "Unknown",
                error: "Failed to fetch bank info",
              };
            }

            return {
              bankInfo,
              assetShares: interpretWrappedI80F48(balance.assetShares, "balance"),
              liabilityShares: interpretWrappedI80F48(balance.liabilityShares, "balance"),
              assetShareValue,
              liabilityShareValue,
              tokenBalance,
              tokenDebt,
              lastUpdate: new Date(balance.lastUpdate * 1000).toISOString(),
            };
          })
      );

      // Calculate total value in USD
      let totalValueUSD = 0;
      let totalDebtUSD = 0;

      activeBalances.forEach((balance) => {
        if (balance.bankInfo.tokenSymbol === "USDC") {
          totalValueUSD += parseFloat(balance.tokenBalance) || 0;
          totalDebtUSD += parseFloat(balance.tokenDebt) || 0;
        }
        // Add other stablecoins if needed
      });

      // Format the balances for better readability
      const formattedBalances = activeBalances.map((balance) => ({
        token: balance.bankInfo.tokenSymbol,
        balance: balance.tokenBalance,
        debt: balance.tokenDebt,
        lastUpdate: balance.lastUpdate,
        details: {
          bankAddress: balance.bankInfo.bankAddress,
          tokenMint: balance.bankInfo.tokenMint,
          assetShares: balance.assetShares,
          liabilityShares: balance.liabilityShares,
          assetShareValue: balance.assetShareValue,
          liabilityShareValue: balance.liabilityShareValue,
        },
      }));

      return {
        address: account.publicKey.toString(),
        group: marginfiAccount.group.toString(),
        authority: marginfiAccount.authority.toString(),
        balances: formattedBalances,
        summary: {
          totalValueUSD: totalValueUSD.toFixed(2),
          totalDebtUSD: totalDebtUSD.toFixed(2),
          netValueUSD: (totalValueUSD - totalDebtUSD).toFixed(2),
        },
        accountFlags: marginfiAccount.accountFlags.toString(),
      };
    })
  );

  return {
    accounts: processedAccounts,
  };
}

/**
 * Fetches balances for a specific marginfi account
 * @param accountAddress The public key of the marginfi account
 * @returns Array of account balances
 */
export async function fetchAccountBalances(accountAddress: string) {
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

  // Convert account address to PublicKey
  const accountPublicKey = new PublicKey(accountAddress);

  try {
    // Fetch the marginfi account
    const marginfiAccount = await lendingProgram.account.marginfiAccount.fetch(accountPublicKey);

    // Extract active balances
    const activeBalances = await Promise.all(
      marginfiAccount.lendingAccount.balances
        .filter((balance: any) => balance.active)
        .map(async (balance: any) => {
          // Fetch the bank information for this balance
          let bankInfo;
          let assetShareValue = "1.0";
          let liabilityShareValue = "1.0";
          let tokenBalance = "0";
          let tokenDebt = "0";

          try {
            const bankAccount = await lendingProgram.account.bank.fetch(balance.bankPk);

            // Get token symbol from bank mint
            const bankMint = bankAccount.mint.toString();
            const tokenSymbol =
              Object.entries(tokenConfigs).find(([_, config]) => config.tokenMint.toString() === bankMint)?.[0] || "Unknown";

            // Get share values
            assetShareValue = interpretWrappedI80F48(bankAccount.assetShareValue, "share");
            liabilityShareValue = interpretWrappedI80F48(bankAccount.liabilityShareValue, "share");

            // Calculate actual token balances
            const assetShares = interpretWrappedI80F48(balance.assetShares, "balance");
            const liabilityShares = interpretWrappedI80F48(balance.liabilityShares, "balance");

            tokenBalance = calculateTokenBalance(assetShares, assetShareValue, bankAccount.mintDecimals);
            tokenDebt = calculateTokenBalance(liabilityShares, liabilityShareValue, bankAccount.mintDecimals);

            bankInfo = {
              bankAddress: balance.bankPk.toString(),
              tokenSymbol,
              tokenMint: bankMint,
              mintDecimals: bankAccount.mintDecimals,
            };
          } catch (error) {
            console.warn(`Error fetching bank info for ${balance.bankPk.toString()}:`, error);
            bankInfo = {
              bankAddress: balance.bankPk.toString(),
              tokenSymbol: "Unknown",
              tokenMint: "Unknown",
              error: "Failed to fetch bank info",
            };
          }

          return {
            token: bankInfo.tokenSymbol,
            balance: tokenBalance,
            debt: tokenDebt,
            lastUpdate: new Date(balance.lastUpdate * 1000).toISOString(),
            details: {
              bankAddress: bankInfo.bankAddress,
              tokenMint: bankInfo.tokenMint,
              assetShares: interpretWrappedI80F48(balance.assetShares, "balance"),
              liabilityShares: interpretWrappedI80F48(balance.liabilityShares, "balance"),
              assetShareValue,
              liabilityShareValue,
            },
          };
        })
    );

    return activeBalances;
  } catch (error) {
    console.error(`Error fetching balances for account ${accountAddress}:`, error);
    return [];
  }
}

/**
 * Example usage of the fetchUserMarginfiAccount function
 */
async function main() {
  try {
    const userAddress = process.argv[2] || "73yaUC1fzgDJTjLVz6ChiUjSbqjULNZwdtZJdkjTro6w";
    const userAccount = await fetchUserMarginfiAccount(userAddress);
    console.log("User Marginfi Account Information:");
    console.log(JSON.stringify(userAccount, null, 2));
  } catch (error) {
    console.error("Error fetching user marginfi account:", error);
    process.exit(1);
  }
}

// Run the script directly if executed directly
if (require.main === module) {
  main();
}
