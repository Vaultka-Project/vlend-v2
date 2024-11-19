import {
  getProvider,
  AnchorProvider,
  Wallet,
  Program,
  BN,
} from "@coral-xyz/anchor";
import idl from "./fixtures/kamino_lending.json";
import { KaminoLending } from "./fixtures/kamino_lending";
import {
  ecosystem,
  kaminoAccounts,
  MARKET,
  oracles,
  USDC_RESERVE,
  users,
} from "./rootHooks";
import { lendingMarketAuthPda, Reserve } from "@kamino-finance/klend-sdk";
import { SYSVAR_INSTRUCTIONS_PUBKEY, Transaction } from "@solana/web3.js";
import { KAMINO_OBLIGATION } from "./utils/mocks";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  simpleRefreshObligation,
  simpleRefreshReserve,
} from "./utils/kamino-utils";
import { createMintToInstruction } from "@solana/spl-token";

describe("Deposit to Kamino reserve", () => {
  const provider = getProvider() as AnchorProvider;
  const wallet = provider.wallet as Wallet;

  const klendProgram = new Program<KaminoLending>(
    idl as KaminoLending,
    new AnchorProvider(provider.connection, wallet, {})
  );

  it("(Fund user 0 and user 1 USDC/Token A token accounts", async () => {
    let tx = new Transaction();
    for (let i = 0; i < users.length; i++) {
      tx.add(
        createMintToInstruction(
          ecosystem.tokenAMint.publicKey,
          users[i].tokenAAccount,
          wallet.publicKey,
          100 * 10 ** ecosystem.tokenADecimals
        )
      );
      tx.add(
        createMintToInstruction(
          ecosystem.usdcMint.publicKey,
          users[i].usdcAccount,
          wallet.publicKey,
          10000 * 10 ** ecosystem.usdcDecimals
        )
      );
    }
    await klendProgram.provider.sendAndConfirm(tx);
  });

  it("(user 0) Deposit USDC to Kamino reserve - happy path", async () => {
    const market = kaminoAccounts.get(MARKET);
    const usdcReserve = kaminoAccounts.get(USDC_RESERVE);
    const reserveAcc: Reserve = Reserve.decode(
      (await provider.connection.getAccountInfo(usdcReserve)).data
    );
    const liquidityMint = reserveAcc.liquidity.mintPubkey;
    const reserveLiquiditySupply = reserveAcc.liquidity.supplyVault;
    const collateralMint = reserveAcc.collateral.mintPubkey;
    const collateralVault = reserveAcc.collateral.supplyVault;

    const [lendingMarketAuthority] = lendingMarketAuthPda(
      market,
      klendProgram.programId
    );
    const obligation = users[0].accounts.get(KAMINO_OBLIGATION);

    const liquidityAmount = new BN(100_000);

    let tx = new Transaction();
    tx.add(
      await simpleRefreshReserve(
        klendProgram,
        usdcReserve,
        market,
        oracles.usdcOracle.publicKey
      ),
      await simpleRefreshObligation(klendProgram, market, obligation),
      await klendProgram.methods
        .depositReserveLiquidityAndObligationCollateral(liquidityAmount)
        .accounts({
          owner: users[0].wallet.publicKey,
          obligation: obligation,
          lendingMarket: market,
          lendingMarketAuthority: lendingMarketAuthority,
          reserve: usdcReserve,
          reserveLiquidityMint: liquidityMint,
          reserveLiquiditySupply: reserveLiquiditySupply,
          reserveCollateralMint: collateralMint,
          reserveDestinationDepositCollateral: collateralVault,
          userSourceLiquidity: users[0].usdcAccount,
          placeholderUserDestinationCollateral: null,
          collateralTokenProgram: TOKEN_PROGRAM_ID,
          liquidityTokenProgram: TOKEN_PROGRAM_ID,
          instructionSysvarAccount: SYSVAR_INSTRUCTIONS_PUBKEY,
        })
        .instruction()
    );

    await users[0].mrgnProgram.provider.sendAndConfirm(tx);
  });
});
