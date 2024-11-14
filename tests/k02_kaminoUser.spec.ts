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
    users,
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
import { InitObligationArgs } from "@kamino-finance/klend-sdk/dist/idl_codegen/types";

  describe("Init Kamino instance", () => {
    const provider = getProvider() as AnchorProvider;
    const wallet = provider.wallet as Wallet;
  
    const klendProgram = new Program<KaminoLending>(
      idl as KaminoLending,
      new AnchorProvider(provider.connection, wallet, {})
    );
  
    it("(user 0) Init Kamino obligation - happy path", async () => {
        // TODO wip
//   let args: InitObligationArgs = new InitObligationArgs(fields:{})

//       let tx = new Transaction();
//       tx.add(
//         await klendProgram.methods.initObligation()
        
//       );
  
//       await users[0].userMarginProgram.provider.sendAndConfirm(tx);
  

    });
  

  
});