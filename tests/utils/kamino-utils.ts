import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
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
export const simpleRefresh = (
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
