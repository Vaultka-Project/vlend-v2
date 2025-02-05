import { Keypair, PublicKey } from "@solana/web3.js";
import { collectBankFees, withdrawProtocolFees, withdrawInsuranceFees } from "./functions";
import { BANK_PKS, MARGINFI_GROUP_PK } from "./constants";
import { getBankVaultBalances } from "./functions";
import { logBankDepositLimit } from "./functions";

async function main() {
  await collectBankFees(BANK_PKS.PYUSD, MARGINFI_GROUP_PK);

  const { feeVaultBalance, insuranceVaultBalance } = await getBankVaultBalances(BANK_PKS.PYUSD);
  console.log("feeVaultBalance", feeVaultBalance);
  console.log("insuranceVaultBalance", insuranceVaultBalance);

  //only withdraw protocol fees if feeVaultBalance is greater than 0
  if (feeVaultBalance > 0) {
    await withdrawProtocolFees(BANK_PKS.PYUSD, MARGINFI_GROUP_PK, feeVaultBalance);
  }

  //only withdraw insurance fees if insuranceVaultBalance is greater than 0
  if (insuranceVaultBalance > 0) {
    await withdrawInsuranceFees(BANK_PKS.PYUSD, MARGINFI_GROUP_PK, insuranceVaultBalance);
  }

  console.log("Withdrawal complete");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
