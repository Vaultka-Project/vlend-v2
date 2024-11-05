import {
  Connection,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { Marginfi } from "../target/types/marginfi";
import marginfiIdl from "../target/idl/marginfi.json";
import {
  InitGlobalFeeStateArgs,
  initGlobalFeeState,
} from "../tests/utils/instructions";
import { bigNumberToWrappedI80F48 } from "@mrgnlabs/mrgn-common";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { loadKeypairFromFile } from "./utils";

// Configurable
type Config = {
  PROGRAM_ID: string;
  ADMIN_PUBKEY: PublicKey;
  WALLET_PUBKEY: PublicKey;
};
const config: Config = {
  PROGRAM_ID: "stag8sTKds2h4KzjUw3zKTsxbqvT4XKHdaR9X9E6Rct",
  ADMIN_PUBKEY: new PublicKey("H4QMTHMVbJ3KrB5bz573cBBZKoYSZ2B4mSST1JKzPUrH"),
  WALLET_PUBKEY: new PublicKey("H4QMTHMVbJ3KrB5bz573cBBZKoYSZ2B4mSST1JKzPUrH")
}

async function main() {
  const connection = new Connection(
    "https://api.mainnet-beta.solana.com",
    "confirmed"
  );
  const wallet = loadKeypairFromFile(
    process.env.HOME + "/.config/solana/id.json"
  );

  const args: InitGlobalFeeStateArgs = {
    payer: wallet.publicKey,
    admin: ADMIN_PUBKEY,
    wallet: WALLET_PUBKEY,
    bankInitFlatSolFee: 5000,
    programFeeFixed: bigNumberToWrappedI80F48(0),
    programFeeRate: bigNumberToWrappedI80F48(0.01),
  };

  // @ts-ignore
  const provider = new AnchorProvider(connection, wallet, {
    preflightCommitment: "confirmed",
  });
  const program: Program<Marginfi> = new Program(
    marginfiIdl as Marginfi,
    provider
  );
  const transaction = new Transaction().add(
    await initGlobalFeeState(program, args)
  );

  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [
      wallet,
    ]);
    console.log("Transaction signature:", signature);
  } catch (error) {
    console.error("Transaction failed:", error);
  }
}

main().catch((err) => {
  console.error(err);
});
