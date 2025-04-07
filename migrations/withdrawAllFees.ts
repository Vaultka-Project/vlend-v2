import { PublicKey } from "@solana/web3.js";
import { collectBankFees, withdrawProtocolFees, withdrawInsuranceFees, getBankVaultBalances } from "./functions";
import { BANK_PKS, MARGINFI_GROUP_PK } from "./constants";

async function withdrawFeesForBank(bankPubkey: PublicKey) {
  // First collect fees and wait for confirmation
  console.log(`Collecting fees for bank ${bankPubkey.toString()}...`);
  await collectBankFees(bankPubkey, MARGINFI_GROUP_PK);

  // Add delay to ensure fees are collected
  //   await new Promise((resolve) => setTimeout(resolve, 20000));

  // Get balances after collection
  const { feeVaultBalance, insuranceVaultBalance } = await getBankVaultBalances(bankPubkey);
  console.log(`Bank ${bankPubkey.toString()}:`);
  console.log(`- Fee vault balance: ${feeVaultBalance}`);
  console.log(`- Insurance vault balance: ${insuranceVaultBalance}`);

  //   if (feeVaultBalance > 0) {
  //     console.log(`Withdrawing ${feeVaultBalance} from fee vault...`);
  //     await withdrawProtocolFees(bankPubkey, MARGINFI_GROUP_PK, feeVaultBalance);
  //   }
  //
  //   if (insuranceVaultBalance > 0) {
  //     console.log(`Withdrawing ${insuranceVaultBalance} from insurance vault...`);
  //     await withdrawInsuranceFees(bankPubkey, MARGINFI_GROUP_PK, insuranceVaultBalance);
  //   }
}

async function main() {
  const bankPubkeys = Object.values(BANK_PKS);
  console.log(`Processing ${bankPubkeys.length} banks...`);

  for (const bankPubkey of bankPubkeys) {
    try {
      // await withdrawFeesForBank(bankPubkey);
      console.log(await getBankVaultBalances(bankPubkey));
      console.log(`Successfully processed bank ${bankPubkey.toString()}\n`);
    } catch (error) {
      console.error(`Error processing bank ${bankPubkey.toString()}:`, error);
    }
  }

  console.log("All banks processed");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
