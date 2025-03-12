import { PublicKey } from "@solana/web3.js";

function convertPythIdToPublicKey(pythId: string): PublicKey {
  // Remove '0x' prefix if present
  pythId = pythId.replace("0x", "");

  // Convert hex string to Buffer
  const buffer = Buffer.from(pythId, "hex");

  // Create PublicKey from buffer
  const publicKey = new PublicKey(buffer);

  return publicKey;
}

// Example usage
const pythId = "c811abc82b4bad1f9bd711a2773ccaa935b03ecef974236942cec5e0eb845a3a";
try {
  const publicKey = convertPythIdToPublicKey(pythId);
  console.log("Original Pyth ID:", pythId);
  console.log("Solana Public Key:", publicKey.toString());
} catch (error) {
  console.error("Error converting Pyth ID:", error);
}
