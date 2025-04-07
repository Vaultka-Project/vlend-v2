import { fetchUserMarginfiAccount } from "./utils/fetchUserAccount";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Define types for the response of fetchUserMarginfiAccount
type AccountBalance = {
  token: string;
  balance: string;
  debt: string;
  lastUpdate: string;
  details: {
    bankAddress: string;
    tokenMint: string;
    assetShares: string;
    liabilityShares: string;
    assetShareValue: string;
    liabilityShareValue: string;
  };
};

type MarginfiAccount = {
  address: string;
  group: string;
  authority: string;
  balances: AccountBalance[];
  summary: {
    totalValueUSD: string;
    totalDebtUSD: string;
    netValueUSD: string;
  };
  accountFlags: string;
};

type SuccessResponse = {
  accounts: MarginfiAccount[];
  error?: undefined;
};

type ErrorResponse = {
  error: string;
  accounts?: undefined;
};

type MarginfiAccountResponse = SuccessResponse | ErrorResponse;

/**
 * Script to fetch a user's marginfi account information
 * Run with: npx ts-node migrations/fetch-user-account.ts <WALLET_ADDRESS>
 */
async function main() {
  try {
    // Get wallet address from command line arguments or use a default
    const userAddress = process.argv[2] || "2uhuQvAcvtwwa4Nfb4gAhCdSKam1bruk82rnr8uVYi58";

    console.log(`Fetching marginfi accounts for user: ${userAddress}`);

    // Call the function to fetch user's marginfi account
    const userAccounts: MarginfiAccountResponse = await fetchUserMarginfiAccount(userAddress);

    // Check if there was an error
    if ("error" in userAccounts) {
      console.error(`\n❌ Error: ${userAccounts.error}`);
      return;
    }

    // Check if any accounts were found
    if (userAccounts.accounts.length > 0) {
      console.log(`\n✅ Found ${userAccounts.accounts.length} marginfi accounts\n`);

      // Print details for each account
      userAccounts.accounts.forEach((account, index) => {
        console.log(`Account #${index + 1} Details:`);
        console.log(`- Address: ${account.address}`);
        console.log(`- Group: ${account.group}`);
        console.log(`- Authority: ${account.authority}`);
        console.log(`- Account Flags: ${account.accountFlags}`);

        console.log("\nBalances:");
        if (account.balances.length === 0) {
          console.log("  No active balances");
        } else {
          account.balances.forEach((balance) => {
            console.log(`  ${balance.token}:`);
            console.log(`    Balance: ${balance.balance}`);
            console.log(`    Debt: ${balance.debt}`);
            console.log(`    Last Update: ${balance.lastUpdate}`);
          });
        }

        console.log("\nSummary:");
        console.log(`- Total Value (USD): $${account.summary.totalValueUSD}`);
        console.log(`- Total Debt (USD): $${account.summary.totalDebtUSD}`);
        console.log(`- Net Value (USD): $${account.summary.netValueUSD}`);
        console.log("-".repeat(50));
      });
    } else {
      console.log(`\n❌ No marginfi accounts found for user ${userAddress}`);
    }
  } catch (error) {
    console.error("Error fetching user marginfi account:", error);
    process.exit(1);
  }
}

// Execute the main function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
