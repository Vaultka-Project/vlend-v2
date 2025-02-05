import bs58 from "bs58";

function convertPrivateKey(base58Key: string): void {
  // Decode base58 string to buffer
  const decoded = bs58.decode(base58Key);

  // Convert buffer to array
  const array = Array.from(decoded);

  // Format array with line breaks and commas
  const formattedArray = JSON.stringify(array, null, 2);

  console.log(formattedArray);
}

// Example usage
const privateKey = "";
convertPrivateKey(privateKey);
