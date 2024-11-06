import {
  Connection,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Marginfi } from "../target/types/marginfi";
import marginfiIdl from "../target/idl/marginfi.json";
import { loadKeypairFromFile } from "./utils";
import { deriveGlobalFeeState } from "../tests/utils/pdas";
import { assertI80F48Approx, assertKeysEqual } from "./softTests";

const verbose = true;

type Config = {
  PROGRAM_ID: string;
  GROUP_KEYS: PublicKey[];
};

// Define your configuration
const config: Config = {
  PROGRAM_ID: "stag8sTKds2h4KzjUw3zKTsxbqvT4XKHdaR9X9E6Rct",
  GROUP_KEYS: [
    new PublicKey("FCPfpHA69EbS8f9KKSreTRkXbzFpunsKuYf5qNmnJjpo"),
    // Up to ~30 groups per script execution
  ],
};

async function main() {
  marginfiIdl.address = config.PROGRAM_ID;
  const connection = new Connection(
    "https://api.mainnet-beta.solana.com",
    "confirmed"
  );
  const wallet = loadKeypairFromFile(
    process.env.HOME + "/.config/solana/id.json"
  );

  // @ts-ignore
  const provider = new AnchorProvider(connection, wallet, {
    preflightCommitment: "confirmed",
  });

  const program = new Program<Marginfi>(marginfiIdl as Marginfi, provider);

  // Create a new transaction
  const transaction = new Transaction();

  // Loop over each group key and add a `propagateFeeState` instruction for each one
  for (const groupKey of config.GROUP_KEYS) {
    const ix = await program.methods
      .propagateFeeState()
      .accounts({
        // feeState: derived automatically from static PDA
        marginfiGroup: groupKey,
      })
      .instruction();

    transaction.add(ix);
  }

  // Send and confirm the transaction
  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [
      wallet,
    ]);
    console.log("Transaction signature:", signature);
  } catch (error) {
    console.error("Transaction failed:", error);
  }

  const [feeStateKey] = deriveGlobalFeeState(program.programId);
  const feeState = await program.account.feeState.fetch(feeStateKey);
  const groups = await program.account.marginfiGroup.fetchMultiple(
    config.GROUP_KEYS
  );

  for (let i = 0; i < config.GROUP_KEYS.length; i++) {
    const group = groups[i];
    const cache = group.feeStateCache;

    if (verbose) {
      console.log("[" + i + "] checking group: " + config.GROUP_KEYS[i]);
    }

    assertKeysEqual(feeState.globalFeeWallet, cache.globalFeeWallet);
    assertI80F48Approx(feeState.programFeeFixed, cache.programFeeFixed);
    assertI80F48Approx(feeState.programFeeRate, cache.programFeeRate);

    if (verbose) {
      console.log(" " + config.GROUP_KEYS[i] + " ok");
    }
  }
}

main().catch((err) => {
  console.error(err);
});
