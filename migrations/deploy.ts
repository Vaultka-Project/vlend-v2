import { initializeGroup, addBankWithConfig, configureBank } from "./functions";
import * as anchor from "@coral-xyz/anchor";
import { marginGroupKeyPair, adminKeypair, tokenConfigs } from "./config";
import { OracleSetup } from "@mrgnlabs/marginfi-client-v2";

async function main() {
  // await initializeGroup(marginGroupKeyPair, adminKeypair);
  // console.log("Group initialized:", marginGroupKeyPair.publicKey.toString());
  //"USDC"

  //not yet: sSOL, JupSOL, USDS, PYUSD
  const assets = ["PYUSD"];
  for (const asset of assets) {
    const bankKeyPair = tokenConfigs[asset].bankKeypair;
    console.log("Bank key pair:", bankKeyPair.publicKey.toString());
    await addBankWithConfig(bankKeyPair, marginGroupKeyPair, adminKeypair, asset);
    console.log(`Bank added successfully: ${asset}`);
  }
}
//with catching errors
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
