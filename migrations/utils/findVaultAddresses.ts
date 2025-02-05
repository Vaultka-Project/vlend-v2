import { PublicKey } from "@solana/web3.js";

// Vault seeds must match exactly with the Anchor program
const LIQUIDITY_VAULT_AUTHORITY_SEED = "liquidity_vault_auth";
const INSURANCE_VAULT_AUTHORITY_SEED = "insurance_vault_auth";
const FEE_VAULT_AUTHORITY_SEED = "fee_vault_auth";

const LIQUIDITY_VAULT_SEED = "liquidity_vault";
const INSURANCE_VAULT_SEED = "insurance_vault";
const FEE_VAULT_SEED = "fee_vault";

export interface VaultAddresses {
  liquidityVault: PublicKey;
  liquidityVaultAuthority: PublicKey;
  insuranceVault: PublicKey;
  insuranceVaultAuthority: PublicKey;
  feeVault: PublicKey;
  feeVaultAuthority: PublicKey;
  bumps: {
    liquidityVault: number;
    liquidityVaultAuthority: number;
    insuranceVault: number;
    insuranceVaultAuthority: number;
    feeVault: number;
    feeVaultAuthority: number;
  };
}

export async function findVaultAddresses(bankPubkey: PublicKey, programId: PublicKey): Promise<VaultAddresses> {
  // Find Liquidity Vault and Authority
  const [liquidityVault, liquidityVaultBump] = await PublicKey.findProgramAddress(
    [Buffer.from(LIQUIDITY_VAULT_SEED), bankPubkey.toBuffer()],
    programId
  );

  const [liquidityVaultAuthority, liquidityVaultAuthorityBump] = await PublicKey.findProgramAddress(
    [Buffer.from(LIQUIDITY_VAULT_AUTHORITY_SEED), bankPubkey.toBuffer()],
    programId
  );

  // Find Insurance Vault and Authority
  const [insuranceVault, insuranceVaultBump] = await PublicKey.findProgramAddress(
    [Buffer.from(INSURANCE_VAULT_SEED), bankPubkey.toBuffer()],
    programId
  );

  const [insuranceVaultAuthority, insuranceVaultAuthorityBump] = await PublicKey.findProgramAddress(
    [Buffer.from(INSURANCE_VAULT_AUTHORITY_SEED), bankPubkey.toBuffer()],
    programId
  );

  // Find Fee Vault and Authority
  const [feeVault, feeVaultBump] = await PublicKey.findProgramAddress([Buffer.from(FEE_VAULT_SEED), bankPubkey.toBuffer()], programId);

  const [feeVaultAuthority, feeVaultAuthorityBump] = await PublicKey.findProgramAddress(
    [Buffer.from(FEE_VAULT_AUTHORITY_SEED), bankPubkey.toBuffer()],
    programId
  );

  return {
    liquidityVault,
    liquidityVaultAuthority,
    insuranceVault,
    insuranceVaultAuthority,
    feeVault,
    feeVaultAuthority,
    bumps: {
      liquidityVault: liquidityVaultBump,
      liquidityVaultAuthority: liquidityVaultAuthorityBump,
      insuranceVault: insuranceVaultBump,
      insuranceVaultAuthority: insuranceVaultAuthorityBump,
      feeVault: feeVaultBump,
      feeVaultAuthority: feeVaultAuthorityBump,
    },
  };
}
