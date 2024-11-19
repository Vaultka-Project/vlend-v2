import { PublicKey } from "@solana/web3.js";
import { KaminoWrap } from "../../target/types/kamino_wrap";
import { Program } from "@coral-xyz/anchor";

export type InitKwrapUser = {
  user: PublicKey;
  payer: PublicKey;
};

export const initKwrapUser = (
  program: Program<KaminoWrap>,
  args: InitKwrapUser
) => {
  const ix = program.methods
    .initUser()
    .accounts({
      payer: args.payer,
      user: args.user,
      // userAccount: deriveKwrapUser(program.programId, args.user)
      // rent
      // systemProgram
    })
    .instruction();

  return ix;
};
