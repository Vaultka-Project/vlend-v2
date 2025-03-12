import { bigNumberToWrappedI80F48, WrappedI80F48 } from "@mrgnlabs/mrgn-common";
import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";

export interface InterestRateConfigRaw {
  // Curve Params
  optimalUtilizationRate: WrappedI80F48 | null;
  plateauInterestRate: WrappedI80F48 | null;
  maxInterestRate: WrappedI80F48 | null;

  // Fees
  insuranceFeeFixedApr: WrappedI80F48 | null;
  insuranceIrFee: WrappedI80F48 | null;
  protocolFixedFeeApr: WrappedI80F48 | null;
  protocolIrFee: WrappedI80F48 | null;

  // Curve Params
  startRateAtTarget: WrappedI80F48 | null;
  minRateAtTarget: WrappedI80F48 | null;
  adjustmentSpeed: WrappedI80F48 | null;
  curveSteepness: WrappedI80F48 | null;
}

export interface BankConfigOptRaw {
  assetWeightInit: WrappedI80F48 | null;
  assetWeightMaint: WrappedI80F48 | null;

  liabilityWeightInit: WrappedI80F48 | null;
  liabilityWeightMaint: WrappedI80F48 | null;

  depositLimit: BN | null;
  borrowLimit: BN | null;
  riskTier: { collateral: {} } | { isolated: {} } | null;
  totalAssetValueInitLimit: BN | null;

  interestRateConfig: InterestRateConfigRaw | null;
  operationalState: { paused: {} } | { operational: {} } | { reduceOnly: {} } | null;

  oracle: {
    setup: { none: {} } | { pythLegacy: {} } | { switchboardV2: {} } | { pythPushOracle: {} } | { switchboardPull: {} };
    keys: PublicKey[] | null;
  } | null;

  oracleMaxAge: number | null;
  permissionlessBadDebtSettlement: boolean | null;
}
