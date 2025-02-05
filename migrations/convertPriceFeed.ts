import { PublicKey } from "@solana/web3.js";

function convertPythIdToPublicKey(pythId: string): PublicKey {
    // Remove '0x' prefix if present
    pythId = pythId.replace('0x', '');
    
    // Convert hex string to Buffer
    const buffer = Buffer.from(pythId, 'hex');
    
    // Create PublicKey from buffer
    const publicKey = new PublicKey(buffer);
    
    return publicKey;
}

// Example usage
const pythId = "add6499a420f809bbebc0b22fbf68acb8c119023897f6ea801688e0d6e391af4";
try {
    const publicKey = convertPythIdToPublicKey(pythId);
    console.log("Original Pyth ID:", pythId);
    console.log("Solana Public Key:", publicKey.toString());
} catch (error) {
    console.error("Error converting Pyth ID:", error);
}