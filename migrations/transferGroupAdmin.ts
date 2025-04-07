import { marginfiGroupConfigure } from "./functions";
import { marginGroupKeyPair, adminKeypair } from "./config";
import { Connection, PublicKey } from "@solana/web3.js";

async function main() {
  const connection = new Connection(process.env.SOLANA_RPC_URL, {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 60000, // 60 seconds
    wsEndpoint: process.env.SOLANA_WS_ENDPOINT,
  });
  const multiSig = new PublicKey("H7ZmLzPDgttBj4y77ztMhvTNPVsdXAegy8NgtNdxLY62");
  await marginfiGroupConfigure(marginGroupKeyPair, adminKeypair, multiSig);

  console.log("Group configured");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
