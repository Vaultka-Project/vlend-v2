import { AccountMeta, PublicKey, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { KaminoWrap } from "../../target/types/kamino_wrap";
import { BN, Program } from "@coral-xyz/anchor";
import { BankConfigKwrap } from "./types";
import { Marginfi } from "../../target/types/marginfi";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

export type InitKwrapUserArgs = {
  user: PublicKey;
  payer: PublicKey;
  boundAccount: PublicKey;
};

export const initKwrapUser = (
  program: Program<KaminoWrap>,
  args: InitKwrapUserArgs
) => {
  const ix = program.methods
    .initUser(args.boundAccount)
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

export type FreshDepositArgs = {
  /** In native decimals */
  liquidityAmount: BN;
  userAccount: PublicKey;
  obligation: PublicKey;
  lendingMarket: PublicKey;
  lendingMarketAuthority: PublicKey;
  reserve: PublicKey;
  reserveLiquidityMint: PublicKey;
  reserveLiquiditySupply: PublicKey;
  reserveCollateralMint: PublicKey;
  reserveDestinationDepositCollateral: PublicKey;
  userSourceLiquidity: PublicKey;
  liquidityTokenProgram: PublicKey;
  /** Currently does nothing */
  placeholderUserDestinationCollateral?: PublicKey;
};

export const freshDeposit = (
  program: Program<KaminoWrap>,
  args: FreshDepositArgs
) => {
  const ix = program.methods
    .freshDeposit(args.liquidityAmount)
    .accounts({
      // user (implied from userAccount), must sign
      userAccount: args.userAccount,
      obligation: args.obligation,
      lendingMarket: args.lendingMarket,
      lendingMarketAuthority: args.lendingMarketAuthority,
      reserve: args.reserve,
      reserveLiquidityMint: args.reserveLiquidityMint,
      reserveLiquiditySupply: args.reserveLiquiditySupply,
      reserveCollateralMint: args.reserveCollateralMint,
      reserveDestinationDepositCollateral:
        args.reserveDestinationDepositCollateral,
      userSourceLiquidity: args.userSourceLiquidity,
      placeholder: args.placeholderUserDestinationCollateral || null,
      // kaminoProgram: (hard coded)
      // collateralTokenProgram: // (hard coded to Token classic)
      liquidityTokenProgram: args.liquidityTokenProgram,
      // instructionSysvarAccount: // (hard coded)
    })
    .instruction();

  return ix;
};

export type ExistingDepositArgs = {
  /** In native decimals */
  liquidityAmount: BN;
  userAccount: PublicKey;
  /** kwrapped obligation (owned by userAccount) */
  obligation: PublicKey;
  /** users's obligation (owned by user) */
  userObligation: PublicKey;
  lendingMarket: PublicKey;
  lendingMarketAuthority: PublicKey;
  reserve: PublicKey;
  reserveLiquidityMint: PublicKey;
  reserveLiquiditySupply: PublicKey;
  reserveCollateralMint: PublicKey;
  reserveDestinationDepositCollateral: PublicKey;
  /** `userAccount`'s ATA for `reserveLiquidityMint` */
  userSourceLiquidity: PublicKey;
  /** `users`'s ATA for `reserveLiquidityMint` */
  userDestinationLiquidity: PublicKey;
  liquidityTokenProgram: PublicKey;
  /** Currently does nothing */
  placeholderUserDestinationCollateral?: PublicKey;
};

export const existingDeposit = (
  program: Program<KaminoWrap>,
  args: ExistingDepositArgs
) => {
  const ix = program.methods
    .existingDeposit(args.liquidityAmount)
    .accounts({
      // user (implied from userAccount), must sign
      userAccount: args.userAccount,
      obligation: args.obligation,
      userObligation: args.userObligation,
      lendingMarket: args.lendingMarket,
      lendingMarketAuthority: args.lendingMarketAuthority,
      reserve: args.reserve,
      reserveLiquidityMint: args.reserveLiquidityMint,
      reserveLiquiditySupply: args.reserveLiquiditySupply,
      reserveCollateralMint: args.reserveCollateralMint,
      reserveDestinationDepositCollateral:
        args.reserveDestinationDepositCollateral,
      userSourceLiquidity: args.userSourceLiquidity,
      userDestinationLiquidity: args.userDestinationLiquidity,
      placeholder: args.placeholderUserDestinationCollateral || null,
      // kaminoProgram: (hard coded)
      // collateralTokenProgram: // (hard coded to Token classic)
      liquidityTokenProgram: args.liquidityTokenProgram,
      // instructionSysvarAccount: // (hard coded)
    })
    .instruction();

  return ix;
};

//************************************************************************* */
//*************************MRGN LEND INSTRUCTIONS************************** */
//************************************************************************* */

/**
 * * admin/feePayer - must sign
 * * bank - derive resulting bank with (group, bankMint, seed)
 */
export type AddKwrapBankArgs = {
  marginfiGroup: PublicKey;
  feePayer: PublicKey;
  bankMint: PublicKey;
  tokenProgram: PublicKey;
  config: BankConfigKwrap;
  seed: number;
};

export const addKwrapBank = (program: Program<Marginfi>, args: AddKwrapBankArgs) => {
  // const id = program.programId;
  // const bank = args.bank;
  const config = args.config;

  // Note: oracle is passed as a key in config AND as an acc in remaining accs
  const oracleMeta: AccountMeta = {
    pubkey: config.oracle,
    isSigner: false,
    isWritable: false,
  };

  // Note: reserve is passed directly in accounts, which is slightly different from other setup
  // models where all oracle-checked accounts are passed in remaining accounts.

  const ix = program.methods
    .lendingPoolAddBankKwrapped(
      new BN(args.seed),
      {
        market: config.market,
        reserve: config.reserve,
        oracle: config.oracle,
        assetWeightInit: config.assetWeightInit,
        assetWeightMaint: config.assetWeightMaint,
        depositLimit: config.depositLimit,
        totalAssetValueInitLimit: config.totalAssetValueInitLimit,
        oracleSetup: config.oracleSetup,
        oracleMaxAge: config.oracleMaxAge,
        assetTag: config.assetTag,
        pad0: [0, 0, 0, 0],
        reserved0: [0, 0, 0, 0, 0, 0, 0, 0],
      },
    )
    .accounts({
      marginfiGroup: args.marginfiGroup,
      // admin: // implied from group
      feePayer: args.feePayer,
      bankMint: args.bankMint,
      // bank: // derived from (group, mint, seed)
      reserve: config.reserve,
      // rent: SYSVAR_RENT_PUBKEY
      tokenProgram: args.tokenProgram,
      // systemProgram: SystemProgram.programId,
    })
    .remainingAccounts([oracleMeta])
    .instruction();

  return ix;
};
