import { PublicKey } from "@solana/web3.js";

const INSURANCE_VAULT_SEED = "insurance_vault";
const FEE_VAULT_SEED = "fee_vault";

async function findInsuranceVaultAddress(bankPubkey: PublicKey, programId: PublicKey): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddress([Buffer.from(INSURANCE_VAULT_SEED), bankPubkey.toBuffer()], programId);
}

async function findFeeVaultAddress(bankPubkey: PublicKey, programId: PublicKey): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddress([Buffer.from(FEE_VAULT_SEED), bankPubkey.toBuffer()], programId);
}

// Example usage
async function main() {
  // Replace these with your actual values
  const bankAddress = new PublicKey("USDCa9ErM9mCiQKQDrLgsJmrAvd7HbDiwdkpiW72LXi");
  const programId = new PublicKey("V1enDN8GY531jkFp3DWEQiRxwYYsnir8SADjHmkt4RG");

  try {
    const [insuranceVaultAddress, bump] = await findInsuranceVaultAddress(bankAddress, programId);
    const [feeVaultAddress, feeBump] = await findFeeVaultAddress(bankAddress, programId);
    console.log("Insurance Vault Address:", insuranceVaultAddress.toString());
    console.log("Bump:", bump);
    console.log("Fee Vault Address:", feeVaultAddress.toString());
    console.log("Fee Bump:", feeBump);
  } catch (error) {
    console.error("Error finding insurance vault address:", error);
  }
}

main();
