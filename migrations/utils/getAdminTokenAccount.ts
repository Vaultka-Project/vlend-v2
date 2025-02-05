import { PublicKey, Connection } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import { tokenConfigs } from "../config";
import { adminKeypair } from "../config";

export async function getAdminTokenAccountForBank(bankPubkey: PublicKey): Promise<PublicKey> {
  // Find the token config that matches the bank's keypair
  const tokenConfig = Object.values(tokenConfigs).find(
    config => config.bankKeypair.publicKey.equals(bankPubkey)
  );

  if (!tokenConfig) {
    throw new Error(`No token config found for bank: ${bankPubkey.toString()}`);
  }

  // Get the associated token account for admin
  const tokenAccount = await getAssociatedTokenAddress(
    tokenConfig.tokenMint,
    adminKeypair.publicKey,
    false,
    TOKEN_PROGRAM_ID
  );

  return tokenAccount;
}
