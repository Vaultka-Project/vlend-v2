import {
  AnchorProvider,
  getProvider,
  Program,
  Wallet,
} from "@coral-xyz/anchor";
import {
  ComputeBudgetProgram,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import {
  ecosystem,
  groupAdmin,
  kaminoAccounts,
  MARKET,
  oracles,
  TOKEN_A_RESERVE,
  USDC_RESERVE,
} from "./rootHooks";
import { KaminoLending } from "./fixtures/kamino_lending";
import idl from "./fixtures/kamino_lending.json";
import { assert } from "chai";
import {
  AssetReserveConfig,
  BorrowRateCurve,
  BorrowRateCurveFields,
  CurvePoint,
  LendingMarket,
  lendingMarketAuthPda,
  MarketWithAddress,
  PriceFeed,
  Reserve,
  reserveCollateralMintPda,
  reserveCollateralSupplyPda,
  reserveFeeVaultPda,
  reserveLiqSupplyPda,
  updateEntireReserveConfigIx,
} from "@kamino-finance/klend-sdk";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  assertBNApproximately,
  assertKeysEqual,
} from "./utils/genericTests";
import Decimal from "decimal.js";
import { Fraction } from "@kamino-finance/klend-sdk/dist/classes/fraction";
import { simpleRefresh } from "./utils/kamino-utils";

describe("Init Kamino instance", () => {
  const provider = getProvider() as AnchorProvider;
  const wallet = provider.wallet as Wallet;

  const klendProgram = new Program<KaminoLending>(
    idl as KaminoLending,
    new AnchorProvider(provider.connection, wallet, {})
  );

  // Note: We use the same admins for Kamino as for mrgn, but in practice the Kamino program is
  // adminstrated by a different organization
  it("(admin) Init Kamino bank - happy path", async () => {
    const usdcString = "USDC";
    const quoteCurrency = Array.from(usdcString.padEnd(32, "\0")).map((c) =>
      c.charCodeAt(0)
    );

    const lendingMarket = Keypair.generate();
    const [lendingMarketAuthority] = lendingMarketAuthPda(
      lendingMarket.publicKey,
      klendProgram.programId
    );

    let tx = new Transaction();
    tx.add(
      // Create a zeroed account that's large enough to hold the lending market
      SystemProgram.createAccount({
        fromPubkey: groupAdmin.wallet.publicKey,
        newAccountPubkey: lendingMarket.publicKey,
        space: LENDING_MARKET_SIZE + 8,
        lamports:
          await klendProgram.provider.connection.getMinimumBalanceForRentExemption(
            LENDING_MARKET_SIZE + 8
          ),
        programId: klendProgram.programId,
      }),
      // Init lending market
      await klendProgram.methods
        .initLendingMarket(quoteCurrency)
        .accounts({
          lendingMarketOwner: groupAdmin.wallet.publicKey,
          lendingMarket: lendingMarket.publicKey,
          lendingMarketAuthority: lendingMarketAuthority,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .instruction()
    );

    await klendProgram.provider.sendAndConfirm(tx, [
      lendingMarket,
      groupAdmin.wallet,
    ]);
    kaminoAccounts.set(MARKET, lendingMarket.publicKey);

    const marketAcc: LendingMarket = LendingMarket.decode(
      (
        await klendProgram.provider.connection.getAccountInfo(
          lendingMarket.publicKey
        )
      ).data
    );
    assertKeysEqual(marketAcc.lendingMarketOwner, groupAdmin.wallet.publicKey);
  });

  it("(admin) create USDC reserve", async () => {
    await createReserve(
      ecosystem.usdcMint.publicKey,
      USDC_RESERVE,
      ecosystem.usdcDecimals,
      // Note: Kamino performs zero oracle validation, it is happy to accept the mock program here
      // instead of Pyth, or any other spoof of Pyth with the same account strcuture, so be wary!
      oracles.usdcOracle.publicKey
    );
  });

  it("(admin) create token A reserve", async () => {
    await createReserve(
      ecosystem.tokenAMint.publicKey,
      TOKEN_A_RESERVE,
      ecosystem.tokenADecimals,
      oracles.tokenAOracle.publicKey
    );
  });

  it("(permissionless) refresh USDC reserve price", async () => {
    let marketKey = kaminoAccounts.get(MARKET);
    let reserveKey = kaminoAccounts.get(USDC_RESERVE);
    const tx = new Transaction().add(
      await simpleRefresh(
        klendProgram,
        reserveKey,
        marketKey,
        oracles.usdcOracle.publicKey
      )
    );

    await klendProgram.provider.sendAndConfirm(tx);
    const reserveAcc: Reserve = Reserve.decode(
      (await provider.connection.getAccountInfo(reserveKey)).data
    );

    // Note: prices are stored as scaled fraction (multiply price by 2^60)
    // E.g. the price is 10 so 10 * 2^60 ~= 1.15292e+19
    let expected = Fraction.fromDecimal(new Decimal(oracles.usdcPrice));
    assertBNApproximately(
      reserveAcc.liquidity.marketPriceSf,
      expected.valueSf,
      100_000
    );
  });

  it("(permissionless) refresh token A reserve price", async () => {
    let marketKey = kaminoAccounts.get(MARKET);
    let reserveKey = kaminoAccounts.get(TOKEN_A_RESERVE);
    const tx = new Transaction().add(
      await simpleRefresh(
        klendProgram,
        reserveKey,
        marketKey,
        oracles.tokenAOracle.publicKey
      )
    );

    await klendProgram.provider.sendAndConfirm(tx);
    const reserveAcc: Reserve = Reserve.decode(
      (await provider.connection.getAccountInfo(reserveKey)).data
    );

    // Note: prices are stored as scaled fraction (multiply price by 2^60)
    // E.g. the price is 10 so 10 * 2^60 ~= 1.15292e+19
    let expected = Fraction.fromDecimal(new Decimal(oracles.tokenAPrice));
    assertBNApproximately(
      reserveAcc.liquidity.marketPriceSf,
      expected.valueSf,
      100_000
    );
  });

  async function createReserve(
    mint: PublicKey,
    reserveLabel: string,
    decimals: number,
    oracle: PublicKey
  ) {
    const reserve = Keypair.generate();
    const market = kaminoAccounts.get(MARKET);
    const id = klendProgram.programId;

    const [lendingMarketAuthority] = lendingMarketAuthPda(market, id);
    const [reserveLiquiditySupply] = reserveLiqSupplyPda(market, mint, id);
    const [reserveFeeVault] = reserveFeeVaultPda(market, mint, id);
    const [collatMint] = reserveCollateralMintPda(market, mint, id);
    const [collatSupply] = reserveCollateralSupplyPda(market, mint, id);

    const tx = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: groupAdmin.wallet.publicKey,
        newAccountPubkey: reserve.publicKey,
        space: RESERVE_SIZE + 8,
        lamports:
          await klendProgram.provider.connection.getMinimumBalanceForRentExemption(
            RESERVE_SIZE + 8
          ),
        programId: klendProgram.programId,
      }),
      await klendProgram.methods
        .initReserve()
        .accounts({
          lendingMarketOwner: groupAdmin.wallet.publicKey,
          lendingMarket: market,
          lendingMarketAuthority,
          reserve: reserve.publicKey,
          reserveLiquidityMint: mint,
          reserveLiquiditySupply,
          feeReceiver: reserveFeeVault,
          reserveCollateralMint: collatMint,
          reserveCollateralSupply: collatSupply,
          rent: SYSVAR_RENT_PUBKEY,
          liquidityTokenProgram: TOKEN_PROGRAM_ID,
          collateralTokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .instruction()
    );

    await klendProgram.provider.sendAndConfirm(tx, [
      reserve,
      groupAdmin.wallet,
    ]);
    kaminoAccounts.set(reserveLabel, reserve.publicKey);

    const marketAcc: LendingMarket = LendingMarket.decode(
      (await provider.connection.getAccountInfo(market)).data
    );
    const reserveAcc: Reserve = Reserve.decode(
      (await provider.connection.getAccountInfo(reserve.publicKey)).data
    );
    assertKeysEqual(reserveAcc.lendingMarket, market);
    // Reserves start in an unconfigured "Hidden" state
    assert.equal(reserveAcc.config.status, 2);

    // Update the reserve to a sane operational state
    const marketWithAddress: MarketWithAddress = {
      address: market,
      state: marketAcc,
    };

    const borrowRateCurve = new BorrowRateCurve({
      points: [
        new CurvePoint({ utilizationRateBps: 0, borrowRateBps: 1000 }),
        new CurvePoint({ utilizationRateBps: 10000, borrowRateBps: 1000 }),
        ...Array(9).fill(
          new CurvePoint({ utilizationRateBps: 10000, borrowRateBps: 1000 })
        ),
      ],
    } as BorrowRateCurveFields);
    const assetReserveConfigParams = {
      loanToValuePct: 75, // 75%
      liquidationThresholdPct: 85, // 85%
      borrowRateCurve,
      depositLimit: new Decimal(1_000_000_000),
      borrowLimit: new Decimal(1_000_000_000),
    };
    const priceFeed: PriceFeed = {
      pythPrice: oracle,
      // switchboardPrice: NULL_PUBKEY,
      // switchboardTwapPrice: NULL_PUBKEY,
      // scopePriceConfigAddress: NULL_PUBKEY,
      // scopeChain: [0, 65535, 65535, 65535],
      // scopeTwapChain: [52, 65535, 65535, 65535],
    };
    const assetReserveConfig = new AssetReserveConfig({
      mint: mint,
      mintTokenProgram: TOKEN_PROGRAM_ID,
      tokenName: reserveLabel,
      mintDecimals: decimals,
      priceFeed: priceFeed,
      ...assetReserveConfigParams,
    }).getReserveConfig();

    const updateReserveIx = updateEntireReserveConfigIx(
      marketWithAddress,
      reserve.publicKey,
      assetReserveConfig,
      klendProgram.programId
    );

    const updateTx = new Transaction().add(
      ComputeBudgetProgram.setComputeUnitLimit({
        units: 1_000_000,
      }),
      updateReserveIx
    );
    await groupAdmin.userMarginProgram.provider.sendAndConfirm(updateTx);
  }
});
