const { PublicKey } = require("@solana/web3.js");

/**
 * Generate the instruction data for marginfi_group_configure
 * @param {string|null} newAdminPublicKey - New admin public key as string, or null to keep current admin
 * @returns {Buffer} - Buffer containing the instruction data
 */
function createGroupConfigInstructionData(newAdminPublicKey) {
  // Instruction discriminator for marginfi_group_configure
  const discriminator = Buffer.from([62, 199, 81, 78, 33, 13, 236, 61]);

  // Serialize the GroupConfig
  let configBuffer;

  if (newAdminPublicKey === null) {
    // If admin is null, we serialize a 0 byte (for null option in Rust)
    configBuffer = Buffer.from([0]);
  } else {
    // If admin is a PublicKey, we serialize a 1 byte (for Some option in Rust)
    // followed by the 32 bytes of the public key
    const pubkeyBuffer = new PublicKey(newAdminPublicKey).toBuffer();
    configBuffer = Buffer.alloc(1 + pubkeyBuffer.length);
    configBuffer[0] = 1; // Some
    pubkeyBuffer.copy(configBuffer, 1);
  }

  // Combine discriminator and serialized config
  return Buffer.concat([discriminator, configBuffer]);
}

// Custom base58 encoding function
function toBase58(buffer) {
  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

  let i,
    j,
    digits = [0];
  for (i = 0; i < buffer.length; i++) {
    for (j = 0; j < digits.length; j++) digits[j] <<= 8;

    digits[0] += buffer[i];

    let carry = 0;
    for (j = 0; j < digits.length; ++j) {
      digits[j] += carry;
      carry = (digits[j] / 58) | 0;
      digits[j] %= 58;
    }

    while (carry) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }

  // Deal with leading zeros
  for (i = 0; buffer[i] === 0 && i < buffer.length - 1; i++) digits.push(0);

  return digits
    .reverse()
    .map((digit) => ALPHABET[digit])
    .join("");
}

// Example usage:
// 1. Set a new admin
const myPublicKey = "8UxRajknfEpWrtVDv51FRTR1yKjTXVoAzvNFHh8qVuyV";
console.log("Instruction data to set new admin to myPublicKey:");
console.log(toBase58(createGroupConfigInstructionData(myPublicKey)));

// 2. Set admin to multisig
const multisigPublicKey = "H7ZmLzPDgttBj4y77ztMhvTNPVsdXAegy8NgtNdxLY62";
console.log("\nInstruction data to set admin to multisig:");
console.log(toBase58(createGroupConfigInstructionData(multisigPublicKey)));

/* 
Instruction data to set new admin to myPublicKey:
EmYWiJ2trPJbXjVpnyzsT3qmPttRkmYMKUTG7TWPXebuva3Fung9jukX

Instruction data to set admin to multisig:
EmYWiJ2trPJbgN7AZEdJUhuSG5NJxhRTbwVcXdeZXKTRtn3hWUBGaXs4
*/
