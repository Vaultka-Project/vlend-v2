import { wrappedI80F48toBigNumber } from "@mrgnlabs/mrgn-common";

/**
 * Parses the lending account balances from a marginfi account.
 *
 * @param lendingAccount - The lending account data from a marginfi account.
 * @returns An array of parsed balance objects.
 *
 * Usage example:
 * const updatedMarginfiAccount = await program.account.marginfiAccount.fetch(marginfiAccountKeypair.publicKey);
 * const parsedBalances = parseLendingAccountBalances(updatedMarginfiAccount.lendingAccount);
 */
export function parseLendingAccountBalances(lendingAccount: any) {
  
  return lendingAccount.balances.map((balance: any, index: number) => {
    return {
      index,
      active: balance.active,
      bankPk: balance.bankPk.toString(),
      assetShares: balance.assetShares.value ? wrappedI80F48toBigNumber(balance.assetShares).toFixed() : "0",
      liabilityShares: balance.liabilityShares.value = wrappedI80F48toBigNumber(balance.liabilityShares).toFixed(),
      emissionsOutstanding: balance.emissionsOutstanding.value ? wrappedI80F48toBigNumber(balance.emissionsOutstanding).toFixed() : "0",
      lastUpdate: balance.lastUpdate.toString(),
    };
  });
}

/**
 * Parses the bank info into a more readable format.
 *
 * @param bankInfo - The raw bank info object.
 * @returns A parsed bank info object.
 *
 * Usage example:
 * const bankInfo = await program.account.bank.fetch(bankKeypairA.publicKey);
 * console.log("Bank Info:", parseBankInfo(bankInfo));
 */

export function parseBankInfo(bankInfo: any) {
  const parseI80F48 = (value: any) => {
    return wrappedI80F48toBigNumber(value).toString();
  };

  return {
    mint: bankInfo.mint.toString(),
    mintDecimals: bankInfo.mintDecimals,
    group: bankInfo.group.toString(),
    assetShareValue: parseI80F48(bankInfo.assetShareValue),
    liabilityShareValue: parseI80F48(bankInfo.liabilityShareValue),
    liquidityVault: bankInfo.liquidityVault.toString(),
    liquidityVaultBump: bankInfo.liquidityVaultBump,
    liquidityVaultAuthorityBump: bankInfo.liquidityVaultAuthorityBump,
    insuranceVault: bankInfo.insuranceVault.toString(),
    insuranceVaultBump: bankInfo.insuranceVaultBump,
    insuranceVaultAuthorityBump: bankInfo.insuranceVaultAuthorityBump,
    collectedInsuranceFeesOutstanding: parseI80F48(bankInfo.collectedInsuranceFeesOutstanding),
    feeVault: bankInfo.feeVault.toString(),
    feeVaultBump: bankInfo.feeVaultBump,
    feeVaultAuthorityBump: bankInfo.feeVaultAuthorityBump,
    collectedGroupFeesOutstanding: parseI80F48(bankInfo.collectedGroupFeesOutstanding),
    totalLiabilityShares: parseI80F48(bankInfo.totalLiabilityShares),
    totalAssetShares: parseI80F48(bankInfo.totalAssetShares),
    lastUpdate: bankInfo.lastUpdate.toString(),
    config: {
      assetWeightInit: parseI80F48(bankInfo.config.assetWeightInit),
      assetWeightMaint: parseI80F48(bankInfo.config.assetWeightMaint),
      liabilityWeightInit: parseI80F48(bankInfo.config.liabilityWeightInit),
      liabilityWeightMaint: parseI80F48(bankInfo.config.liabilityWeightMaint),
      depositLimit: bankInfo.config.depositLimit.toString(),
      borrowLimit: bankInfo.config.borrowLimit.toString(),
      operationalState: Object.keys(bankInfo.config.operationalState)[0],
      oracleSetup: Object.keys(bankInfo.config.oracleSetup)[0],
      oracleKeys: bankInfo.config.oracleKeys.filter((key: string) => key !== "11111111111111111111111111111111"),
      riskTier: Object.keys(bankInfo.config.riskTier)[0],
      totalAssetValueInitLimit: bankInfo.config.totalAssetValueInitLimit.toString(),
      oracleMaxAge: bankInfo.config.oracleMaxAge,
    },
    flags: bankInfo.flags.toString(),
    emissionsRate: bankInfo.emissionsRate.toString(),
    emissionsRemaining: parseI80F48(bankInfo.emissionsRemaining),
    emissionsMint: bankInfo.emissionsMint.toString(),
  };
}

/**
 * Filters and returns only the active balances from an array of balance objects.
 *
 * @param balances - An array of balance objects.
 * @returns An array of active balance objects.
 *
 * Usage example:
 * const activeBalances = getActiveBalances(parsedBalances);
 * console.log("Active Balances:", activeBalances);
 */

export function getActiveBalances(balances: any[]) {
  return balances.filter((balance) => balance.active);
}

/* usage for reference: 

import { BN, Program, workspace } from "@coral-xyz/anchor";
import { PublicKey, Connection } from "@solana/web3.js";
import { bankKeypairA, marginfiGroup, users } from "./rootHooks";
import { Marginfi } from "../target/types/marginfi";
import { Keypair } from "@solana/web3.js";
import { parseLendingAccountBalances, getActiveBalances, parseBankInfo } from "./utils";

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

describe("user init account", () => {
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");
  const program = workspace.Marginfi as Program<Marginfi>;

  it("user init account and deposit", async () => {
    const marginfiAccountKeypair = Keypair.generate();

    // Initialize marginfi account
    const initTx = await program.methods
      .marginfiAccountInitialize()
      .accounts({
        marginfiGroup: marginfiGroup.publicKey,
        marginfiAccount: marginfiAccountKeypair.publicKey,
        authority: users[0].wallet.publicKey,
        feePayer: users[0].wallet.publicKey,
      })
      .signers([users[0].wallet, marginfiAccountKeypair])
      .rpc();

    await connection.confirmTransaction(initTx, "confirmed");

    // Perform deposit
    const depositTx = await program.methods
      .lendingAccountDeposit(new BN(1000000))
      .accounts({
        marginfiGroup: marginfiGroup.publicKey,
        marginfiAccount: marginfiAccountKeypair.publicKey,
        signer: users[0].wallet.publicKey,
        signerTokenAccount: users[0].tokenAAccount,
        bank: bankKeypairA.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([users[0].wallet])
      .rpc();

    await connection.confirmTransaction(depositTx, "confirmed");

    // Fetch and log the account after deposit
    const updatedMarginfiAccount = await program.account.marginfiAccount.fetch(marginfiAccountKeypair.publicKey);

    // Fetch and log bank info
    const bankInfo = await program.account.bank.fetch(bankKeypairA.publicKey);
    console.log("Bank Info:", parseBankInfo(bankInfo));

    const activeBalances = getActiveBalances(parseLendingAccountBalances(updatedMarginfiAccount.lendingAccount));
    console.log("Active Balances:", activeBalances);
  });
});
*/
