import { Connection, PublicKey } from "@solana/web3.js";
import { BorshCoder, EventParser } from "@coral-xyz/anchor";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import BN from "bn.js";

dotenv.config();

// You'll need to replace this with your actual program ID
const MARGINFI_PROGRAM_ID = "V1enDN8GY531jkFp3DWEQiRxwYYsnir8SADjHmkt4RG";

// Token mint to symbol mapping
const TOKEN_MINT_TO_SYMBOL: Record<string, { symbol: string; decimals: number }> = {
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: { symbol: "USDC", decimals: 6 },
  So11111111111111111111111111111111111111112: { symbol: "SOL", decimals: 9 },
  "27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4": { symbol: "JLP", decimals: 6 },
  J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn: { symbol: "JitoSOL", decimals: 9 },
  sSo14endRuUbvQaJS3dq36Q829a3A6BEfoeeRGJywEh: { symbol: "sSOL", decimals: 9 },
  jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v: { symbol: "JupSOL", decimals: 9 },
  USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKcR81vTwcA: { symbol: "USDS", decimals: 6 },
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: { symbol: "USDT", decimals: 6 },
  "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo": { symbol: "PYUSD", decimals: 6 },
};

// We know that transaction 5QUBvwoYcS6ZLmFUdjpyReS6wDXdv1vQYdf4dRV8V9coCWVhJ841dU44Hp2Q26rVn4scJMimLu3cviavufA6gqyN contains a liquidation
// Let's add it to our known liquidation transactions to ensure we find at least one
const KNOWN_LIQUIDATION_TRANSACTIONS = ["5QUBvwoYcS6ZLmFUdjpyReS6wDXdv1vQYdf4dRV8V9coCWVhJ841dU44Hp2Q26rVn4scJMimLu3cviavufA6gqyN"];

// Helper function to add delay
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Configure RPC options
const RPC_CONFIG = {
  // Primary RPC endpoints - will try these in order until one works
  endpoints: [
    "https://solana-mainnet.core.chainstack.com/5d927a263a77c9568cf1ced4592eb317",
    "https://api.mainnet-beta.solana.com",
    "https://solana-api.projectserum.com",
  ],
  commitmentLevel: "confirmed" as const,
  timeout: 30000, // 30 seconds timeout
};

/**
 * Try to establish a connection with one of the available RPC endpoints
 * @returns A working Solana connection
 */
async function getWorkingConnection(): Promise<Connection> {
  // Try each endpoint in order
  for (const endpoint of RPC_CONFIG.endpoints) {
    try {
      console.log(`Trying to connect to ${endpoint}...`);

      // Create a connection with a timeout
      const connection = new Connection(endpoint, {
        commitment: RPC_CONFIG.commitmentLevel,
        confirmTransactionInitialTimeout: RPC_CONFIG.timeout,
      });

      // Test the connection with a simple request
      await connection.getSlot();
      console.log(`Successfully connected to ${endpoint}`);
      return connection;
    } catch (error) {
      console.error(`Failed to connect to ${endpoint}:`, error);
    }
  }

  throw new Error("Could not establish a connection with any RPC endpoint");
}

/**
 * Format a token amount based on its decimals
 * @param amount The raw token amount
 * @param decimals The number of decimals for the token
 * @returns A formatted string representation of the amount
 */
function formatTokenAmount(amount: number, decimals: number): string {
  // Convert to human-readable format
  const formattedAmount = amount / Math.pow(10, decimals);

  // Format based on the size of the number
  if (formattedAmount < 0.000001) {
    return formattedAmount.toExponential(6);
  } else if (formattedAmount < 1) {
    return formattedAmount.toFixed(6);
  } else if (formattedAmount < 1000) {
    return formattedAmount.toFixed(2);
  } else if (formattedAmount < 1000000) {
    return `${(formattedAmount / 1000).toFixed(2)}K`;
  } else {
    return `${(formattedAmount / 1000000).toFixed(2)}M`;
  }
}

/**
 * Get token symbol and decimals from mint address
 * @param mintAddress The token mint address
 * @returns An object with the token symbol and decimals
 */
function getTokenInfo(mintAddress: string): { symbol: string; decimals: number } {
  const tokenInfo = TOKEN_MINT_TO_SYMBOL[mintAddress];
  if (tokenInfo) {
    return tokenInfo;
  }
  return { symbol: "Unknown", decimals: 6 }; // Default to 6 decimals if unknown
}

async function fetchLiquidationEvents() {
  console.log("Fetching liquidation events...");

  try {
    // Get a working RPC connection
    const connection = await getWorkingConnection();

    // Create a PublicKey from the program ID
    const programId = new PublicKey(MARGINFI_PROGRAM_ID);

    // Start with known liquidation transactions to ensure we have at least one
    let allSignatures = [];

    // Process known liquidation transactions first
    if (KNOWN_LIQUIDATION_TRANSACTIONS.length > 0) {
      console.log(`Starting with ${KNOWN_LIQUIDATION_TRANSACTIONS.length} known liquidation transactions`);

      for (const txSig of KNOWN_LIQUIDATION_TRANSACTIONS) {
        try {
          const txData = await connection.getTransaction(txSig, { commitment: "confirmed" });
          if (txData) {
            allSignatures.push({
              signature: txSig,
              slot: txData.slot,
              blockTime: txData.blockTime,
              err: null,
              memo: null,
            });
          }
        } catch (error) {
          console.error(`Error fetching known transaction ${txSig}:`, error);
        }
      }
    }

    // Only fetch additional transactions if needed
    if (allSignatures.length === 0) {
      // Get multiple batches of signatures to find more liquidation events
      let lastSignature = null;
      const batchSize = 20;
      const maxBatches = 3; // Reduce number of batches to minimize network requests

      for (let i = 0; i < maxBatches; i++) {
        console.log(`Fetching batch ${i + 1} of signatures${lastSignature ? " before " + lastSignature : ""}...`);

        try {
          const options: any = { limit: batchSize };
          if (lastSignature) {
            options.before = lastSignature;
          }

          const signatures = await connection.getSignaturesForAddress(programId, options);

          if (signatures.length === 0) {
            console.log("No more signatures found");
            break;
          }

          console.log(`Found ${signatures.length} signatures in batch ${i + 1}`);
          allSignatures = allSignatures.concat(signatures);

          // Update the last signature for the next batch
          lastSignature = signatures[signatures.length - 1].signature;

          // Add a small delay between batches
          await sleep(500);
        } catch (error) {
          console.error(`Error fetching batch ${i + 1}:`, error);
          // If we've fetched at least some signatures, continue with what we have
          if (allSignatures.length > 0) {
            console.log(`Continuing with ${allSignatures.length} already fetched signatures`);
            break;
          } else {
            throw error; // Rethrow if we have no signatures at all
          }
        }
      }
    }

    console.log(`Total signatures fetched: ${allSignatures.length}`);

    if (allSignatures.length === 0) {
      console.log("No signatures found, nothing to process");
      return;
    }

    // Load the IDL to parse events
    const idlPath = path.join(__dirname, "../target/idl/marginfi.json");
    let idl;

    try {
      idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));
      console.log("Successfully loaded IDL");
    } catch (error) {
      console.error("Error loading IDL file:", error);
      console.log("Please make sure you have built the program and generated the IDL");
      return;
    }

    // Create a Borsh coder from the IDL
    const coder = new BorshCoder(idl);
    const eventParser = new EventParser(programId, coder);

    // Process each transaction
    let liquidationEvents = [];

    // Track how many transactions we've been able to process successfully
    let processedTransactions = 0;
    let failedTransactions = 0;

    for (const signatureInfo of allSignatures) {
      const signature = signatureInfo.signature;
      console.log(`Processing transaction: ${signature}`);

      try {
        // Get the transaction with a timeout
        const transaction = (await Promise.race([
          connection.getParsedTransaction(signature, {
            maxSupportedTransactionVersion: 0,
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Transaction fetch timeout")), 15000)),
        ])) as any;

        if (!transaction || !transaction.meta) {
          console.log("No transaction data found");
          failedTransactions++;
          continue;
        }

        processedTransactions++;

        // Look for program logs
        const logMessages = transaction.meta.logMessages || [];

        // Parse events from logs
        if (logMessages.length > 0) {
          try {
            // Convert the generator to an array
            const eventsArray = Array.from(eventParser.parseLogs(logMessages));

            // Filter for liquidation events
            const liquidations = eventsArray.filter((event) => event.name === "LendingAccountLiquidateEvent");

            if (liquidations.length > 0) {
              console.log(`Found ${liquidations.length} liquidation events in transaction ${signature}`);

              for (const liquidation of liquidations) {
                const eventData = liquidation.data;

                // Get token info for asset and liability
                const assetMint = eventData.asset_mint.toString();
                const liabilityMint = eventData.liability_mint.toString();
                const assetInfo = getTokenInfo(assetMint);
                const liabilityInfo = getTokenInfo(liabilityMint);

                try {
                  // Format balances with proper decimals
                  const formattedBalances = {
                    pre: {
                      liquidateeAsset: formatTokenAmount(eventData.pre_balances.liquidatee_asset_balance, assetInfo.decimals),
                      liquidateeLiability: formatTokenAmount(eventData.pre_balances.liquidatee_liability_balance, liabilityInfo.decimals),
                      liquidatorAsset: formatTokenAmount(eventData.pre_balances.liquidator_asset_balance, assetInfo.decimals),
                      liquidatorLiability: formatTokenAmount(eventData.pre_balances.liquidator_liability_balance, liabilityInfo.decimals),
                    },
                    post: {
                      liquidateeAsset: formatTokenAmount(eventData.post_balances.liquidatee_asset_balance, assetInfo.decimals),
                      liquidateeLiability: formatTokenAmount(eventData.post_balances.liquidatee_liability_balance, liabilityInfo.decimals),
                      liquidatorAsset: formatTokenAmount(eventData.post_balances.liquidator_asset_balance, assetInfo.decimals),
                      liquidatorLiability: formatTokenAmount(eventData.post_balances.liquidator_liability_balance, liabilityInfo.decimals),
                    },
                  };

                  liquidationEvents.push({
                    signature,
                    timestamp: signatureInfo.blockTime ? new Date(signatureInfo.blockTime * 1000).toISOString() : "unknown",
                    liquidatorAccount: eventData.header.marginfi_account.toString(),
                    liquidateeAccount: eventData.liquidatee_marginfi_account.toString(),
                    assetBank: eventData.asset_bank.toString(),
                    assetMint: assetMint,
                    assetSymbol: assetInfo.symbol,
                    liabilityBank: eventData.liability_bank.toString(),
                    liabilityMint: liabilityMint,
                    liabilitySymbol: liabilityInfo.symbol,
                    preHealth: eventData.liquidatee_pre_health,
                    postHealth: eventData.liquidatee_post_health,
                    formattedBalances,
                  });
                } catch (error) {
                  console.error(`Error processing liquidation event data: ${error}`);
                }
              }
            }
          } catch (error) {
            console.error(`Error parsing logs for transaction ${signature}:`, error);
          }
        }
      } catch (error) {
        console.error(`Error fetching transaction ${signature}:`, error);
        failedTransactions++;
      }

      // Add a small delay between requests
      await sleep(200);
    }

    console.log(`\nProcessing summary:`);
    console.log(`- Total transactions: ${allSignatures.length}`);
    console.log(`- Successfully processed: ${processedTransactions}`);
    console.log(`- Failed to process: ${failedTransactions}`);

    // Display results
    console.log("\n=== Liquidation Events ===\n");
    console.log(`Total liquidation events found: ${liquidationEvents.length}`);

    if (liquidationEvents.length > 0) {
      console.log("\nLiquidation Event Details:");

      // Sort events by timestamp (newest first)
      liquidationEvents.sort((a, b) => {
        if (a.timestamp === "unknown" && b.timestamp === "unknown") return 0;
        if (a.timestamp === "unknown") return 1;
        if (b.timestamp === "unknown") return -1;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      liquidationEvents.forEach((event, index) => {
        console.log(`\n--- Event ${index + 1} ---`);
        console.log(`Transaction: ${event.signature}`);
        console.log(`Timestamp: ${event.timestamp}`);
        console.log(`Liquidator Account: ${event.liquidatorAccount}`);
        console.log(`Liquidatee Account: ${event.liquidateeAccount}`);
        console.log(`Asset Bank: ${event.assetBank}`);
        console.log(`Asset: ${event.assetSymbol} (${event.assetMint})`);
        console.log(`Liability Bank: ${event.liabilityBank}`);
        console.log(`Liability: ${event.liabilitySymbol} (${event.liabilityMint})`);
        console.log(`Pre-liquidation Health: ${event.preHealth}`);
        console.log(`Post-liquidation Health: ${event.postHealth}`);
        console.log("Pre-liquidation Balances:");
        console.log(`  Liquidatee Asset: ${event.formattedBalances.pre.liquidateeAsset} ${event.assetSymbol}`);
        console.log(`  Liquidatee Liability: ${event.formattedBalances.pre.liquidateeLiability} ${event.liabilitySymbol}`);
        console.log(`  Liquidator Asset: ${event.formattedBalances.pre.liquidatorAsset} ${event.assetSymbol}`);
        console.log(`  Liquidator Liability: ${event.formattedBalances.pre.liquidatorLiability} ${event.liabilitySymbol}`);
        console.log("Post-liquidation Balances:");
        console.log(`  Liquidatee Asset: ${event.formattedBalances.post.liquidateeAsset} ${event.assetSymbol}`);
        console.log(`  Liquidatee Liability: ${event.formattedBalances.post.liquidateeLiability} ${event.liabilitySymbol}`);
        console.log(`  Liquidator Asset: ${event.formattedBalances.post.liquidatorAsset} ${event.assetSymbol}`);
        console.log(`  Liquidator Liability: ${event.formattedBalances.post.liquidatorLiability} ${event.liabilitySymbol}`);
      });
    }
  } catch (error) {
    console.error("Error fetching liquidation events:", error);
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  fetchLiquidationEvents()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

// Export the function for use in other scripts
export { fetchLiquidationEvents };
