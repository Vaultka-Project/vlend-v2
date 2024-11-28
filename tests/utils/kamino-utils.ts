import { Program } from "@coral-xyz/anchor";
import { AccountMeta, PublicKey } from "@solana/web3.js";
import { KaminoLending } from "../fixtures/kamino_lending";

export const LENDING_MARKET_SIZE = 4656;
export const RESERVE_SIZE = 8616;
export const OBLIGATION_SIZE = 3336;

/**
 * Refresh a generic Kamino reserve with a legacy Pyth oracle
 * @param program
 * @param reserve
 * @param market
 * @param oracle
 * @returns
 */
export const simpleRefreshReserve = (
  program: Program<KaminoLending>,
  reserve: PublicKey,
  market: PublicKey,
  oracle: PublicKey
) => {
  const ix = program.methods
    .refreshReserve()
    .accounts({
      reserve: reserve,
      lendingMarket: market,
      pythOracle: oracle,
      switchboardPriceOracle: null,
      switchboardTwapOracle: null,
      scopePrices: null,
    })
    .instruction();

  return ix;
};

/**
 * Refresh a generic Kamino obligation
 * @param program
 * @param market
 * @param obligation
 * @returns
 */
export const simpleRefreshObligation = (
  program: Program<KaminoLending>,
  market: PublicKey,
  obligation: PublicKey,
  remaining: PublicKey[] = []
) => {
  const accMeta: AccountMeta[] = remaining.map((pubkey) => ({
    pubkey,
    isSigner: false,
    isWritable: false,
  }));

  const ix = program.methods
    .refreshObligation()
    .accounts({
      lendingMarket: market,
      obligation: obligation,
    })
    .remainingAccounts(accMeta)
    .instruction();

  return ix;
};

const BASE_SEED_USER_METADATA = "user_meta";

export const deriveUserMetadata = (programId: PublicKey, wallet: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(BASE_SEED_USER_METADATA), wallet.toBuffer()],
    programId
  );
};

export const deriveObligation = (
  programId: PublicKey,
  tag: number,
  id: number,
  ownerPublicKey: PublicKey,
  marketPublicKey: PublicKey,
  seed1AccountKey: PublicKey,
  seed2AccountKey: PublicKey
) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from([tag]),
      Buffer.from([id]),
      ownerPublicKey.toBuffer(),
      marketPublicKey.toBuffer(),
      seed1AccountKey.toBuffer(),
      seed2AccountKey.toBuffer(),
    ],
    programId
  );
};
