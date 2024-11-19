import { PublicKey } from "@solana/web3.js";
import { KaminoWrap } from "../../target/types/kamino_wrap";
import { BN, Program } from "@coral-xyz/anchor";

export type InitKwrapUserArgs = {
  user: PublicKey;
  payer: PublicKey;
};

export const initKwrapUser = (
  program: Program<KaminoWrap>,
  args: InitKwrapUserArgs
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

export type InitKwrapMetadataArgs = {
  userAccount: PublicKey;
  userMetadata: PublicKey;
  userLookupTable: PublicKey;
  slot: BN;
  referrerUserMetadata?: PublicKey;
};

export const initKwrapMeta = (
  program: Program<KaminoWrap>,
  args: InitKwrapMetadataArgs
) => {
  const ix = program.methods
    .initMetadata(args.slot)
    .accounts({
      // user (implied from userAccount), must sign
      userAccount: args.userAccount,
      userMetadata: args.userMetadata,
      referrerUserMetadata: args.referrerUserMetadata || PublicKey.default,
      userLookupTable: args.userLookupTable,
      // kamino program (hard code)
      // lut program (hard code)
      // rent
      // system program
    })
    .instruction();

  return ix;
};

export type InitKwrapObligationArgs = {
  userAccount: PublicKey;
  obligation: PublicKey;
  lendingMarket: PublicKey;
  userMetadata: PublicKey;
  tag: number;
  id: number;
  seed1?: PublicKey;
  seed2?: PublicKey;
};

export const initKwrapObligation = (
  program: Program<KaminoWrap>,
  args: InitKwrapObligationArgs
) => {
  const ix = program.methods
    .initObligation(args.tag, args.id)
    .accounts({
      // user (implied from userAccount), must sign
      userAccount: args.userAccount,
      obligation: args.obligation,
      lendingMarket: args.lendingMarket,
      seed1Account: args.seed1 || PublicKey.default,
      seed2Account: args.seed2 || PublicKey.default,
      ownerUserMetadata: args.userMetadata,
      // kamino program (hard code)
      // lut program (hard code)
      // rent
      // system program
    })
    .instruction();

  return ix;
};
