/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/kamino_lending.json`.
 */
export type KaminoLending = {
  "address": "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD",
  "metadata": {
    "name": "kaminoLending",
    "version": "0.1.0",
    "spec": "0.1.0"
  },
  "instructions": [
    {
      "name": "initLendingMarket",
      "discriminator": [
        34,
        162,
        116,
        14,
        101,
        137,
        94,
        239
      ],
      "accounts": [
        {
          "name": "lendingMarketOwner",
          "writable": true,
          "signer": true
        },
        {
          "name": "lendingMarket",
          "writable": true
        },
        {
          "name": "lendingMarketAuthority"
        },
        {
          "name": "systemProgram"
        },
        {
          "name": "rent"
        }
      ],
      "args": [
        {
          "name": "quoteCurrency",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "updateLendingMarket",
      "discriminator": [
        209,
        157,
        53,
        210,
        97,
        180,
        31,
        45
      ],
      "accounts": [
        {
          "name": "lendingMarketOwner",
          "signer": true
        },
        {
          "name": "lendingMarket",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "mode",
          "type": "u64"
        },
        {
          "name": "value",
          "type": {
            "array": [
              "u8",
              72
            ]
          }
        }
      ]
    },
    {
      "name": "updateLendingMarketOwner",
      "discriminator": [
        118,
        224,
        10,
        62,
        196,
        230,
        184,
        89
      ],
      "accounts": [
        {
          "name": "lendingMarketOwnerCached",
          "signer": true
        },
        {
          "name": "lendingMarket",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "initReserve",
      "discriminator": [
        138,
        245,
        71,
        225,
        153,
        4,
        3,
        43
      ],
      "accounts": [
        {
          "name": "lendingMarketOwner",
          "writable": true,
          "signer": true
        },
        {
          "name": "lendingMarket"
        },
        {
          "name": "lendingMarketAuthority"
        },
        {
          "name": "reserve",
          "writable": true
        },
        {
          "name": "reserveLiquidityMint"
        },
        {
          "name": "reserveLiquiditySupply",
          "writable": true
        },
        {
          "name": "feeReceiver",
          "writable": true
        },
        {
          "name": "reserveCollateralMint",
          "writable": true
        },
        {
          "name": "reserveCollateralSupply",
          "writable": true
        },
        {
          "name": "rent"
        },
        {
          "name": "liquidityTokenProgram"
        },
        {
          "name": "collateralTokenProgram"
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": []
    },
    {
      "name": "initFarmsForReserve",
      "discriminator": [
        218,
        6,
        62,
        233,
        1,
        33,
        232,
        82
      ],
      "accounts": [
        {
          "name": "lendingMarketOwner",
          "writable": true,
          "signer": true
        },
        {
          "name": "lendingMarket"
        },
        {
          "name": "lendingMarketAuthority",
          "writable": true
        },
        {
          "name": "reserve",
          "writable": true
        },
        {
          "name": "farmsProgram"
        },
        {
          "name": "farmsGlobalConfig"
        },
        {
          "name": "farmState",
          "writable": true
        },
        {
          "name": "farmsVaultAuthority"
        },
        {
          "name": "rent"
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": [
        {
          "name": "mode",
          "type": "u8"
        }
      ]
    },
    {
      "name": "updateReserveConfig",
      "discriminator": [
        61,
        148,
        100,
        70,
        143,
        107,
        17,
        13
      ],
      "accounts": [
        {
          "name": "lendingMarketOwner",
          "signer": true
        },
        {
          "name": "lendingMarket"
        },
        {
          "name": "reserve",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "mode",
          "type": "u64"
        },
        {
          "name": "value",
          "type": "bytes"
        },
        {
          "name": "skipValidation",
          "type": "bool"
        }
      ]
    },
    {
      "name": "redeemFees",
      "discriminator": [
        215,
        39,
        180,
        41,
        173,
        46,
        248,
        220
      ],
      "accounts": [
        {
          "name": "reserve",
          "writable": true
        },
        {
          "name": "reserveLiquidityMint",
          "writable": true
        },
        {
          "name": "reserveLiquidityFeeReceiver",
          "writable": true
        },
        {
          "name": "reserveSupplyLiquidity",
          "writable": true
        },
        {
          "name": "lendingMarket"
        },
        {
          "name": "lendingMarketAuthority"
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "socializeLoss",
      "discriminator": [
        245,
        75,
        91,
        0,
        236,
        97,
        19,
        3
      ],
      "accounts": [
        {
          "name": "riskCouncil",
          "signer": true
        },
        {
          "name": "obligation",
          "writable": true
        },
        {
          "name": "lendingMarket"
        },
        {
          "name": "reserve",
          "writable": true
        },
        {
          "name": "instructionSysvarAccount"
        }
      ],
      "args": [
        {
          "name": "liquidityAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "withdrawProtocolFee",
      "discriminator": [
        158,
        201,
        158,
        189,
        33,
        93,
        162,
        103
      ],
      "accounts": [
        {
          "name": "lendingMarketOwner",
          "signer": true
        },
        {
          "name": "lendingMarket"
        },
        {
          "name": "reserve"
        },
        {
          "name": "reserveLiquidityMint",
          "writable": true
        },
        {
          "name": "lendingMarketAuthority"
        },
        {
          "name": "feeVault",
          "writable": true
        },
        {
          "name": "lendingMarketOwnerAta",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "refreshReserve",
      "discriminator": [
        2,
        218,
        138,
        235,
        79,
        201,
        25,
        102
      ],
      "accounts": [
        {
          "name": "reserve",
          "writable": true
        },
        {
          "name": "lendingMarket"
        },
        {
          "name": "pythOracle",
          "optional": true
        },
        {
          "name": "switchboardPriceOracle",
          "optional": true
        },
        {
          "name": "switchboardTwapOracle",
          "optional": true
        },
        {
          "name": "scopePrices",
          "optional": true
        }
      ],
      "args": []
    },
    {
      "name": "refreshReservesBatch",
      "discriminator": [
        144,
        110,
        26,
        103,
        162,
        204,
        252,
        147
      ],
      "accounts": [],
      "args": [
        {
          "name": "skipPriceUpdates",
          "type": "bool"
        }
      ]
    },
    {
      "name": "depositReserveLiquidity",
      "discriminator": [
        169,
        201,
        30,
        126,
        6,
        205,
        102,
        68
      ],
      "accounts": [
        {
          "name": "owner",
          "signer": true
        },
        {
          "name": "reserve",
          "writable": true
        },
        {
          "name": "lendingMarket"
        },
        {
          "name": "lendingMarketAuthority"
        },
        {
          "name": "reserveLiquidityMint",
          "writable": true
        },
        {
          "name": "reserveLiquiditySupply",
          "writable": true
        },
        {
          "name": "reserveCollateralMint",
          "writable": true
        },
        {
          "name": "userSourceLiquidity",
          "writable": true
        },
        {
          "name": "userDestinationCollateral",
          "writable": true
        },
        {
          "name": "collateralTokenProgram"
        },
        {
          "name": "liquidityTokenProgram"
        },
        {
          "name": "instructionSysvarAccount"
        }
      ],
      "args": [
        {
          "name": "liquidityAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "redeemReserveCollateral",
      "discriminator": [
        234,
        117,
        181,
        125,
        185,
        142,
        220,
        29
      ],
      "accounts": [
        {
          "name": "owner",
          "signer": true
        },
        {
          "name": "lendingMarket"
        },
        {
          "name": "reserve",
          "writable": true
        },
        {
          "name": "lendingMarketAuthority"
        },
        {
          "name": "reserveLiquidityMint",
          "writable": true
        },
        {
          "name": "reserveCollateralMint",
          "writable": true
        },
        {
          "name": "reserveLiquiditySupply",
          "writable": true
        },
        {
          "name": "userSourceCollateral",
          "writable": true
        },
        {
          "name": "userDestinationLiquidity",
          "writable": true
        },
        {
          "name": "collateralTokenProgram"
        },
        {
          "name": "liquidityTokenProgram"
        },
        {
          "name": "instructionSysvarAccount"
        }
      ],
      "args": [
        {
          "name": "collateralAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initObligation",
      "discriminator": [
        251,
        10,
        231,
        76,
        27,
        11,
        159,
        96
      ],
      "accounts": [
        {
          "name": "obligationOwner",
          "signer": true
        },
        {
          "name": "feePayer",
          "writable": true,
          "signer": true
        },
        {
          "name": "obligation",
          "writable": true
        },
        {
          "name": "lendingMarket"
        },
        {
          "name": "seed1Account"
        },
        {
          "name": "seed2Account"
        },
        {
          "name": "ownerUserMetadata"
        },
        {
          "name": "rent"
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "initObligationArgs"
            }
          }
        }
      ]
    },
    {
      "name": "initObligationFarmsForReserve",
      "discriminator": [
        136,
        63,
        15,
        186,
        211,
        152,
        168,
        164
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "owner"
        },
        {
          "name": "obligation",
          "writable": true
        },
        {
          "name": "lendingMarketAuthority",
          "writable": true
        },
        {
          "name": "reserve",
          "writable": true
        },
        {
          "name": "reserveFarmState",
          "writable": true
        },
        {
          "name": "obligationFarm",
          "writable": true
        },
        {
          "name": "lendingMarket"
        },
        {
          "name": "farmsProgram"
        },
        {
          "name": "rent"
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": [
        {
          "name": "mode",
          "type": "u8"
        }
      ]
    },
    {
      "name": "refreshObligationFarmsForReserve",
      "discriminator": [
        140,
        144,
        253,
        21,
        10,
        74,
        248,
        3
      ],
      "accounts": [
        {
          "name": "crank",
          "writable": true,
          "signer": true
        },
        {
          "name": "obligation"
        },
        {
          "name": "lendingMarketAuthority",
          "writable": true
        },
        {
          "name": "reserve"
        },
        {
          "name": "reserveFarmState",
          "writable": true
        },
        {
          "name": "obligationFarmUserState",
          "writable": true
        },
        {
          "name": "lendingMarket"
        },
        {
          "name": "farmsProgram"
        },
        {
          "name": "rent"
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": [
        {
          "name": "mode",
          "type": "u8"
        }
      ]
    },
    {
      "name": "refreshObligation",
      "discriminator": [
        33,
        132,
        147,
        228,
        151,
        192,
        72,
        89
      ],
      "accounts": [
        {
          "name": "lendingMarket"
        },
        {
          "name": "obligation",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "depositObligationCollateral",
      "discriminator": [
        108,
        209,
        4,
        72,
        21,
        22,
        118,
        133
      ],
      "accounts": [
        {
          "name": "owner",
          "signer": true
        },
        {
          "name": "obligation",
          "writable": true
        },
        {
          "name": "lendingMarket"
        },
        {
          "name": "depositReserve",
          "writable": true
        },
        {
          "name": "reserveDestinationCollateral",
          "writable": true
        },
        {
          "name": "userSourceCollateral",
          "writable": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "instructionSysvarAccount"
        }
      ],
      "args": [
        {
          "name": "collateralAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "withdrawObligationCollateral",
      "discriminator": [
        37,
        116,
        205,
        103,
        243,
        192,
        92,
        198
      ],
      "accounts": [
        {
          "name": "owner",
          "signer": true
        },
        {
          "name": "obligation",
          "writable": true
        },
        {
          "name": "lendingMarket"
        },
        {
          "name": "lendingMarketAuthority"
        },
        {
          "name": "withdrawReserve",
          "writable": true
        },
        {
          "name": "reserveSourceCollateral",
          "writable": true
        },
        {
          "name": "userDestinationCollateral",
          "writable": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "instructionSysvarAccount"
        }
      ],
      "args": [
        {
          "name": "collateralAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "borrowObligationLiquidity",
      "discriminator": [
        121,
        127,
        18,
        204,
        73,
        245,
        225,
        65
      ],
      "accounts": [
        {
          "name": "owner",
          "signer": true
        },
        {
          "name": "obligation",
          "writable": true
        },
        {
          "name": "lendingMarket"
        },
        {
          "name": "lendingMarketAuthority"
        },
        {
          "name": "borrowReserve",
          "writable": true
        },
        {
          "name": "borrowReserveLiquidityMint",
          "writable": true
        },
        {
          "name": "reserveSourceLiquidity",
          "writable": true
        },
        {
          "name": "borrowReserveLiquidityFeeReceiver",
          "writable": true
        },
        {
          "name": "userDestinationLiquidity",
          "writable": true
        },
        {
          "name": "referrerTokenState",
          "writable": true,
          "optional": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "instructionSysvarAccount"
        }
      ],
      "args": [
        {
          "name": "liquidityAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "repayObligationLiquidity",
      "discriminator": [
        145,
        178,
        13,
        225,
        76,
        240,
        147,
        72
      ],
      "accounts": [
        {
          "name": "owner",
          "signer": true
        },
        {
          "name": "obligation",
          "writable": true
        },
        {
          "name": "lendingMarket"
        },
        {
          "name": "repayReserve",
          "writable": true
        },
        {
          "name": "reserveLiquidityMint",
          "writable": true
        },
        {
          "name": "reserveDestinationLiquidity",
          "writable": true
        },
        {
          "name": "userSourceLiquidity",
          "writable": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "instructionSysvarAccount"
        }
      ],
      "args": [
        {
          "name": "liquidityAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "depositReserveLiquidityAndObligationCollateral",
      "discriminator": [
        129,
        199,
        4,
        2,
        222,
        39,
        26,
        46
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "obligation",
          "writable": true
        },
        {
          "name": "lendingMarket"
        },
        {
          "name": "lendingMarketAuthority"
        },
        {
          "name": "reserve",
          "writable": true
        },
        {
          "name": "reserveLiquidityMint",
          "writable": true
        },
        {
          "name": "reserveLiquiditySupply",
          "writable": true
        },
        {
          "name": "reserveCollateralMint",
          "writable": true
        },
        {
          "name": "reserveDestinationDepositCollateral",
          "writable": true
        },
        {
          "name": "userSourceLiquidity",
          "writable": true
        },
        {
          "name": "placeholderUserDestinationCollateral",
          "optional": true
        },
        {
          "name": "collateralTokenProgram"
        },
        {
          "name": "liquidityTokenProgram"
        },
        {
          "name": "instructionSysvarAccount"
        }
      ],
      "args": [
        {
          "name": "liquidityAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "withdrawObligationCollateralAndRedeemReserveCollateral",
      "discriminator": [
        75,
        93,
        93,
        220,
        34,
        150,
        218,
        196
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "obligation",
          "writable": true
        },
        {
          "name": "lendingMarket"
        },
        {
          "name": "lendingMarketAuthority"
        },
        {
          "name": "withdrawReserve",
          "writable": true
        },
        {
          "name": "reserveLiquidityMint",
          "writable": true
        },
        {
          "name": "reserveSourceCollateral",
          "writable": true
        },
        {
          "name": "reserveCollateralMint",
          "writable": true
        },
        {
          "name": "reserveLiquiditySupply",
          "writable": true
        },
        {
          "name": "userDestinationLiquidity",
          "writable": true
        },
        {
          "name": "placeholderUserDestinationCollateral",
          "optional": true
        },
        {
          "name": "collateralTokenProgram"
        },
        {
          "name": "liquidityTokenProgram"
        },
        {
          "name": "instructionSysvarAccount"
        }
      ],
      "args": [
        {
          "name": "collateralAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "liquidateObligationAndRedeemReserveCollateral",
      "discriminator": [
        177,
        71,
        154,
        188,
        226,
        133,
        74,
        55
      ],
      "accounts": [
        {
          "name": "liquidator",
          "signer": true
        },
        {
          "name": "obligation",
          "writable": true
        },
        {
          "name": "lendingMarket"
        },
        {
          "name": "lendingMarketAuthority"
        },
        {
          "name": "repayReserve",
          "writable": true
        },
        {
          "name": "repayReserveLiquidityMint",
          "writable": true
        },
        {
          "name": "repayReserveLiquiditySupply",
          "writable": true
        },
        {
          "name": "withdrawReserve",
          "writable": true
        },
        {
          "name": "withdrawReserveLiquidityMint",
          "writable": true
        },
        {
          "name": "withdrawReserveCollateralMint",
          "writable": true
        },
        {
          "name": "withdrawReserveCollateralSupply",
          "writable": true
        },
        {
          "name": "withdrawReserveLiquiditySupply",
          "writable": true
        },
        {
          "name": "withdrawReserveLiquidityFeeReceiver",
          "writable": true
        },
        {
          "name": "userSourceLiquidity",
          "writable": true
        },
        {
          "name": "userDestinationCollateral",
          "writable": true
        },
        {
          "name": "userDestinationLiquidity",
          "writable": true
        },
        {
          "name": "collateralTokenProgram"
        },
        {
          "name": "repayLiquidityTokenProgram"
        },
        {
          "name": "withdrawLiquidityTokenProgram"
        },
        {
          "name": "instructionSysvarAccount"
        }
      ],
      "args": [
        {
          "name": "liquidityAmount",
          "type": "u64"
        },
        {
          "name": "minAcceptableReceivedLiquidityAmount",
          "type": "u64"
        },
        {
          "name": "maxAllowedLtvOverridePercent",
          "type": "u64"
        }
      ]
    },
    {
      "name": "flashRepayReserveLiquidity",
      "discriminator": [
        185,
        117,
        0,
        203,
        96,
        245,
        180,
        186
      ],
      "accounts": [
        {
          "name": "userTransferAuthority",
          "signer": true
        },
        {
          "name": "lendingMarketAuthority"
        },
        {
          "name": "lendingMarket"
        },
        {
          "name": "reserve",
          "writable": true
        },
        {
          "name": "reserveLiquidityMint"
        },
        {
          "name": "reserveDestinationLiquidity",
          "writable": true
        },
        {
          "name": "userSourceLiquidity",
          "writable": true
        },
        {
          "name": "reserveLiquidityFeeReceiver",
          "writable": true
        },
        {
          "name": "referrerTokenState",
          "writable": true,
          "optional": true
        },
        {
          "name": "referrerAccount",
          "writable": true,
          "optional": true
        },
        {
          "name": "sysvarInfo"
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "liquidityAmount",
          "type": "u64"
        },
        {
          "name": "borrowInstructionIndex",
          "type": "u8"
        }
      ]
    },
    {
      "name": "flashBorrowReserveLiquidity",
      "discriminator": [
        135,
        231,
        52,
        167,
        7,
        52,
        212,
        193
      ],
      "accounts": [
        {
          "name": "userTransferAuthority",
          "signer": true
        },
        {
          "name": "lendingMarketAuthority"
        },
        {
          "name": "lendingMarket"
        },
        {
          "name": "reserve",
          "writable": true
        },
        {
          "name": "reserveLiquidityMint"
        },
        {
          "name": "reserveSourceLiquidity",
          "writable": true
        },
        {
          "name": "userDestinationLiquidity",
          "writable": true
        },
        {
          "name": "reserveLiquidityFeeReceiver",
          "writable": true
        },
        {
          "name": "referrerTokenState",
          "writable": true,
          "optional": true
        },
        {
          "name": "referrerAccount",
          "writable": true,
          "optional": true
        },
        {
          "name": "sysvarInfo"
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "liquidityAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "requestElevationGroup",
      "discriminator": [
        36,
        119,
        251,
        129,
        34,
        240,
        7,
        147
      ],
      "accounts": [
        {
          "name": "owner",
          "signer": true
        },
        {
          "name": "obligation",
          "writable": true
        },
        {
          "name": "lendingMarket"
        }
      ],
      "args": [
        {
          "name": "elevationGroup",
          "type": "u8"
        }
      ]
    },
    {
      "name": "initReferrerTokenState",
      "discriminator": [
        116,
        45,
        66,
        148,
        58,
        13,
        218,
        115
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "lendingMarket"
        },
        {
          "name": "reserve"
        },
        {
          "name": "referrerTokenState",
          "writable": true
        },
        {
          "name": "rent"
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": [
        {
          "name": "referrer",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "initUserMetadata",
      "discriminator": [
        117,
        169,
        176,
        69,
        197,
        23,
        15,
        162
      ],
      "accounts": [
        {
          "name": "owner",
          "signer": true
        },
        {
          "name": "feePayer",
          "writable": true,
          "signer": true
        },
        {
          "name": "userMetadata",
          "writable": true
        },
        {
          "name": "referrerUserMetadata",
          "optional": true
        },
        {
          "name": "rent"
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": [
        {
          "name": "userLookupTable",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "withdrawReferrerFees",
      "discriminator": [
        171,
        118,
        121,
        201,
        233,
        140,
        23,
        228
      ],
      "accounts": [
        {
          "name": "referrer",
          "writable": true,
          "signer": true
        },
        {
          "name": "referrerTokenState",
          "writable": true
        },
        {
          "name": "reserve",
          "writable": true
        },
        {
          "name": "reserveLiquidityMint",
          "writable": true
        },
        {
          "name": "reserveSupplyLiquidity",
          "writable": true
        },
        {
          "name": "referrerTokenAccount",
          "writable": true
        },
        {
          "name": "lendingMarket"
        },
        {
          "name": "lendingMarketAuthority"
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "initReferrerStateAndShortUrl",
      "discriminator": [
        165,
        19,
        25,
        127,
        100,
        55,
        31,
        90
      ],
      "accounts": [
        {
          "name": "referrer",
          "writable": true,
          "signer": true
        },
        {
          "name": "referrerState",
          "writable": true
        },
        {
          "name": "referrerShortUrl",
          "writable": true
        },
        {
          "name": "referrerUserMetadata"
        },
        {
          "name": "rent"
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": [
        {
          "name": "shortUrl",
          "type": "string"
        }
      ]
    },
    {
      "name": "deleteReferrerStateAndShortUrl",
      "discriminator": [
        153,
        185,
        99,
        28,
        228,
        179,
        187,
        150
      ],
      "accounts": [
        {
          "name": "referrer",
          "writable": true,
          "signer": true
        },
        {
          "name": "referrerState",
          "writable": true
        },
        {
          "name": "shortUrl",
          "writable": true
        },
        {
          "name": "rent"
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": []
    },
    {
      "name": "idlMissingTypes",
      "discriminator": [
        130,
        80,
        38,
        153,
        80,
        212,
        182,
        253
      ],
      "accounts": [
        {
          "name": "lendingMarketOwner",
          "signer": true
        },
        {
          "name": "lendingMarket"
        },
        {
          "name": "reserve",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "reserveFarmKind",
          "type": {
            "defined": {
              "name": "reserveFarmKind"
            }
          }
        },
        {
          "name": "assetTier",
          "type": {
            "defined": {
              "name": "assetTier"
            }
          }
        },
        {
          "name": "feeCalculation",
          "type": {
            "defined": {
              "name": "feeCalculation"
            }
          }
        },
        {
          "name": "reserveStatus",
          "type": {
            "defined": {
              "name": "reserveStatus"
            }
          }
        },
        {
          "name": "updateConfigMode",
          "type": {
            "defined": {
              "name": "updateConfigMode"
            }
          }
        },
        {
          "name": "updateLendingMarketConfigValue",
          "type": {
            "defined": {
              "name": "updateLendingMarketConfigValue"
            }
          }
        },
        {
          "name": "updateLendingMarketConfigMode",
          "type": {
            "defined": {
              "name": "updateLendingMarketMode"
            }
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "userState",
      "discriminator": [
        72,
        177,
        85,
        249,
        76,
        167,
        186,
        126
      ]
    },
    {
      "name": "lendingMarket",
      "discriminator": [
        246,
        114,
        50,
        98,
        72,
        157,
        28,
        120
      ]
    },
    {
      "name": "obligation",
      "discriminator": [
        168,
        206,
        141,
        106,
        88,
        76,
        172,
        167
      ]
    },
    {
      "name": "referrerState",
      "discriminator": [
        194,
        81,
        217,
        103,
        12,
        19,
        12,
        66
      ]
    },
    {
      "name": "referrerTokenState",
      "discriminator": [
        39,
        15,
        208,
        77,
        32,
        195,
        105,
        56
      ]
    },
    {
      "name": "shortUrl",
      "discriminator": [
        28,
        89,
        174,
        25,
        226,
        124,
        126,
        212
      ]
    },
    {
      "name": "userMetadata",
      "discriminator": [
        157,
        214,
        220,
        235,
        98,
        135,
        171,
        28
      ]
    },
    {
      "name": "reserve",
      "discriminator": [
        43,
        242,
        204,
        202,
        26,
        247,
        59,
        127
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidMarketAuthority",
      "msg": "Market authority is invalid"
    },
    {
      "code": 6001,
      "name": "invalidMarketOwner",
      "msg": "Market owner is invalid"
    },
    {
      "code": 6002,
      "name": "invalidAccountOwner",
      "msg": "Input account owner is not the program address"
    },
    {
      "code": 6003,
      "name": "invalidAmount",
      "msg": "Input amount is invalid"
    },
    {
      "code": 6004,
      "name": "invalidConfig",
      "msg": "Input config value is invalid"
    },
    {
      "code": 6005,
      "name": "invalidSigner",
      "msg": "Input account must be a signer"
    },
    {
      "code": 6006,
      "name": "invalidAccountInput",
      "msg": "Invalid account input"
    },
    {
      "code": 6007,
      "name": "mathOverflow",
      "msg": "Math operation overflow"
    },
    {
      "code": 6008,
      "name": "insufficientLiquidity",
      "msg": "Insufficient liquidity available"
    },
    {
      "code": 6009,
      "name": "reserveStale",
      "msg": "Reserve state needs to be refreshed"
    },
    {
      "code": 6010,
      "name": "withdrawTooSmall",
      "msg": "Withdraw amount too small"
    },
    {
      "code": 6011,
      "name": "withdrawTooLarge",
      "msg": "Withdraw amount too large"
    },
    {
      "code": 6012,
      "name": "borrowTooSmall",
      "msg": "Borrow amount too small to receive liquidity after fees"
    },
    {
      "code": 6013,
      "name": "borrowTooLarge",
      "msg": "Borrow amount too large for deposited collateral"
    },
    {
      "code": 6014,
      "name": "repayTooSmall",
      "msg": "Repay amount too small to transfer liquidity"
    },
    {
      "code": 6015,
      "name": "liquidationTooSmall",
      "msg": "Liquidation amount too small to receive collateral"
    },
    {
      "code": 6016,
      "name": "obligationHealthy",
      "msg": "Cannot liquidate healthy obligations"
    },
    {
      "code": 6017,
      "name": "obligationStale",
      "msg": "Obligation state needs to be refreshed"
    },
    {
      "code": 6018,
      "name": "obligationReserveLimit",
      "msg": "Obligation reserve limit exceeded"
    },
    {
      "code": 6019,
      "name": "invalidObligationOwner",
      "msg": "Obligation owner is invalid"
    },
    {
      "code": 6020,
      "name": "obligationDepositsEmpty",
      "msg": "Obligation deposits are empty"
    },
    {
      "code": 6021,
      "name": "obligationBorrowsEmpty",
      "msg": "Obligation borrows are empty"
    },
    {
      "code": 6022,
      "name": "obligationDepositsZero",
      "msg": "Obligation deposits have zero value"
    },
    {
      "code": 6023,
      "name": "obligationBorrowsZero",
      "msg": "Obligation borrows have zero value"
    },
    {
      "code": 6024,
      "name": "invalidObligationCollateral",
      "msg": "Invalid obligation collateral"
    },
    {
      "code": 6025,
      "name": "invalidObligationLiquidity",
      "msg": "Invalid obligation liquidity"
    },
    {
      "code": 6026,
      "name": "obligationCollateralEmpty",
      "msg": "Obligation collateral is empty"
    },
    {
      "code": 6027,
      "name": "obligationLiquidityEmpty",
      "msg": "Obligation liquidity is empty"
    },
    {
      "code": 6028,
      "name": "negativeInterestRate",
      "msg": "Interest rate is negative"
    },
    {
      "code": 6029,
      "name": "invalidOracleConfig",
      "msg": "Input oracle config is invalid"
    },
    {
      "code": 6030,
      "name": "insufficientProtocolFeesToRedeem",
      "msg": "Insufficient protocol fees to claim or no liquidity available"
    },
    {
      "code": 6031,
      "name": "flashBorrowCpi",
      "msg": "No cpi flash borrows allowed"
    },
    {
      "code": 6032,
      "name": "noFlashRepayFound",
      "msg": "No corresponding repay found for flash borrow"
    },
    {
      "code": 6033,
      "name": "invalidFlashRepay",
      "msg": "Invalid repay found"
    },
    {
      "code": 6034,
      "name": "flashRepayCpi",
      "msg": "No cpi flash repays allowed"
    },
    {
      "code": 6035,
      "name": "multipleFlashBorrows",
      "msg": "Multiple flash borrows not allowed in the same transaction"
    },
    {
      "code": 6036,
      "name": "flashLoansDisabled",
      "msg": "Flash loans are disabled for this reserve"
    },
    {
      "code": 6037,
      "name": "switchboardV2Error",
      "msg": "Switchboard error"
    },
    {
      "code": 6038,
      "name": "couldNotDeserializeScope",
      "msg": "Cannot deserialize the scope price account"
    },
    {
      "code": 6039,
      "name": "priceTooOld",
      "msg": "Price too old"
    },
    {
      "code": 6040,
      "name": "priceTooDivergentFromTwap",
      "msg": "Price too divergent from twap"
    },
    {
      "code": 6041,
      "name": "invalidTwapPrice",
      "msg": "Invalid twap price"
    },
    {
      "code": 6042,
      "name": "globalEmergencyMode",
      "msg": "Emergency mode is enabled"
    },
    {
      "code": 6043,
      "name": "invalidFlag",
      "msg": "Invalid lending market config"
    },
    {
      "code": 6044,
      "name": "priceNotValid",
      "msg": "Price is not valid"
    },
    {
      "code": 6045,
      "name": "priceIsBiggerThanHeuristic",
      "msg": "Price is bigger than allowed by heuristic"
    },
    {
      "code": 6046,
      "name": "priceIsLowerThanHeuristic",
      "msg": "Price lower than allowed by heuristic"
    },
    {
      "code": 6047,
      "name": "priceIsZero",
      "msg": "Price is zero"
    },
    {
      "code": 6048,
      "name": "priceConfidenceTooWide",
      "msg": "Price confidence too wide"
    },
    {
      "code": 6049,
      "name": "integerOverflow",
      "msg": "Conversion between integers failed"
    },
    {
      "code": 6050,
      "name": "noFarmForReserve",
      "msg": "This reserve does not have a farm"
    },
    {
      "code": 6051,
      "name": "incorrectInstructionInPosition",
      "msg": "Wrong instruction at expected position"
    },
    {
      "code": 6052,
      "name": "noPriceFound",
      "msg": "No price found"
    },
    {
      "code": 6053,
      "name": "invalidTwapConfig",
      "msg": "Invalid Twap configuration: Twap is enabled but one of the enabled price doesn't have a twap"
    },
    {
      "code": 6054,
      "name": "invalidPythPriceAccount",
      "msg": "Pyth price account does not match configuration"
    },
    {
      "code": 6055,
      "name": "invalidSwitchboardAccount",
      "msg": "Switchboard account(s) do not match configuration"
    },
    {
      "code": 6056,
      "name": "invalidScopePriceAccount",
      "msg": "Scope price account does not match configuration"
    },
    {
      "code": 6057,
      "name": "obligationCollateralLtvZero",
      "msg": "The obligation has one collateral with an LTV set to 0. Withdraw it before withdrawing other collaterals"
    },
    {
      "code": 6058,
      "name": "invalidObligationSeedsValue",
      "msg": "Seeds must be default pubkeys for tag 0, and mint addresses for tag 1 or 2"
    },
    {
      "code": 6059,
      "name": "invalidObligationId",
      "msg": "Obligation id must be 0"
    },
    {
      "code": 6060,
      "name": "invalidBorrowRateCurvePoint",
      "msg": "Invalid borrow rate curve point"
    },
    {
      "code": 6061,
      "name": "invalidUtilizationRate",
      "msg": "Invalid utilization rate"
    },
    {
      "code": 6062,
      "name": "cannotSocializeObligationWithCollateral",
      "msg": "Obligation hasn't been fully liquidated and debt cannot be socialized."
    },
    {
      "code": 6063,
      "name": "obligationEmpty",
      "msg": "Obligation has no borrows or deposits."
    },
    {
      "code": 6064,
      "name": "withdrawalCapReached",
      "msg": "Withdrawal cap is reached"
    },
    {
      "code": 6065,
      "name": "lastTimestampGreaterThanCurrent",
      "msg": "The last interval start timestamp is greater than the current timestamp"
    },
    {
      "code": 6066,
      "name": "liquidationRewardTooSmall",
      "msg": "The reward amount is less than the minimum acceptable received liquidity"
    },
    {
      "code": 6067,
      "name": "isolatedAssetTierViolation",
      "msg": "Isolated Asset Tier Violation"
    },
    {
      "code": 6068,
      "name": "inconsistentElevationGroup",
      "msg": "The obligation's elevation group and the reserve's are not the same"
    },
    {
      "code": 6069,
      "name": "invalidElevationGroup",
      "msg": "The elevation group chosen for the reserve does not exist in the lending market"
    },
    {
      "code": 6070,
      "name": "invalidElevationGroupConfig",
      "msg": "The elevation group updated has wrong parameters set"
    },
    {
      "code": 6071,
      "name": "unhealthyElevationGroupLtv",
      "msg": "The current obligation must have most or all its debt repaid before changing the elevation group"
    },
    {
      "code": 6072,
      "name": "elevationGroupNewLoansDisabled",
      "msg": "Elevation group does not accept any new loans or any new borrows/withdrawals"
    },
    {
      "code": 6073,
      "name": "reserveDeprecated",
      "msg": "Reserve was deprecated, no longer usable"
    },
    {
      "code": 6074,
      "name": "referrerAccountNotInitialized",
      "msg": "Referrer account not initialized"
    },
    {
      "code": 6075,
      "name": "referrerAccountMintMissmatch",
      "msg": "Referrer account mint does not match the operation reserve mint"
    },
    {
      "code": 6076,
      "name": "referrerAccountWrongAddress",
      "msg": "Referrer account address is not a valid program address"
    },
    {
      "code": 6077,
      "name": "referrerAccountReferrerMissmatch",
      "msg": "Referrer account referrer does not match the owner referrer"
    },
    {
      "code": 6078,
      "name": "referrerAccountMissing",
      "msg": "Referrer account missing for obligation with referrer"
    },
    {
      "code": 6079,
      "name": "insufficientReferralFeesToRedeem",
      "msg": "Insufficient referral fees to claim or no liquidity available"
    },
    {
      "code": 6080,
      "name": "cpiDisabled",
      "msg": "CPI disabled for this instruction"
    },
    {
      "code": 6081,
      "name": "shortUrlNotAsciiAlphanumeric",
      "msg": "Referrer short_url is not ascii alphanumeric"
    },
    {
      "code": 6082,
      "name": "reserveObsolete",
      "msg": "Reserve is marked as obsolete"
    },
    {
      "code": 6083,
      "name": "elevationGroupAlreadyActivated",
      "msg": "Obligation already part of the same elevation group"
    },
    {
      "code": 6084,
      "name": "obligationInDeprecatedReserve",
      "msg": "Obligation has a deposit in a deprecated reserve"
    },
    {
      "code": 6085,
      "name": "referrerStateOwnerMismatch",
      "msg": "Referrer state owner does not match the given signer"
    },
    {
      "code": 6086,
      "name": "userMetadataOwnerAlreadySet",
      "msg": "User metadata owner is already set"
    },
    {
      "code": 6087,
      "name": "collateralNonLiquidatable",
      "msg": "This collateral cannot be liquidated (LTV set to 0)"
    },
    {
      "code": 6088,
      "name": "borrowingDisabled",
      "msg": "Borrowing is disabled"
    },
    {
      "code": 6089,
      "name": "borrowLimitExceeded",
      "msg": "Cannot borrow above borrow limit"
    },
    {
      "code": 6090,
      "name": "depositLimitExceeded",
      "msg": "Cannot deposit above deposit limit"
    },
    {
      "code": 6091,
      "name": "borrowingDisabledOutsideElevationGroup",
      "msg": "Reserve does not accept any new borrows outside elevation group"
    },
    {
      "code": 6092,
      "name": "netValueRemainingTooSmall",
      "msg": "Net value remaining too small"
    },
    {
      "code": 6093,
      "name": "worseLtvBlocked",
      "msg": "Cannot get the obligation in a worse position"
    },
    {
      "code": 6094,
      "name": "liabilitiesBiggerThanAssets",
      "msg": "Cannot have more liabilities than assets in a position"
    },
    {
      "code": 6095,
      "name": "reserveTokenBalanceMismatch",
      "msg": "Reserve state and token account cannot drift"
    },
    {
      "code": 6096,
      "name": "reserveVaultBalanceMismatch",
      "msg": "Reserve token account has been unexpectedly modified"
    },
    {
      "code": 6097,
      "name": "reserveAccountingMismatch",
      "msg": "Reserve internal state accounting has been unexpectedly modified"
    },
    {
      "code": 6098,
      "name": "borrowingAboveUtilizationRateDisabled",
      "msg": "Borrowing above set utilization rate is disabled"
    },
    {
      "code": 6099,
      "name": "liquidationBorrowFactorPriority",
      "msg": "Liquidation must prioritize the debt with the highest borrow factor"
    },
    {
      "code": 6100,
      "name": "liquidationLowestLtvPriority",
      "msg": "Liquidation must prioritize the collateral with the lowest LTV"
    },
    {
      "code": 6101,
      "name": "elevationGroupBorrowLimitExceeded",
      "msg": "Elevation group borrow limit exceeded"
    },
    {
      "code": 6102,
      "name": "elevationGroupWithoutDebtReserve",
      "msg": "The elevation group does not have a debt reserve defined"
    },
    {
      "code": 6103,
      "name": "elevationGroupMaxCollateralReserveZero",
      "msg": "The elevation group does not allow any collateral reserves"
    },
    {
      "code": 6104,
      "name": "elevationGroupHasAnotherDebtReserve",
      "msg": "In elevation group attempt to borrow from a reserve that is not the debt reserve"
    },
    {
      "code": 6105,
      "name": "elevationGroupDebtReserveAsCollateral",
      "msg": "The elevation group's debt reserve cannot be used as a collateral reserve"
    },
    {
      "code": 6106,
      "name": "obligationCollateralExceedsElevationGroupLimit",
      "msg": "Obligation have more collateral than the maximum allowed by the elevation group"
    },
    {
      "code": 6107,
      "name": "obligationElevationGroupMultipleDebtReserve",
      "msg": "Obligation is an elevation group but have more than one debt reserve"
    },
    {
      "code": 6108,
      "name": "unsupportedTokenExtension",
      "msg": "Mint has a token (2022) extension that is not supported"
    },
    {
      "code": 6109,
      "name": "invalidTokenAccount",
      "msg": "Can't have an spl token mint with a t22 account"
    },
    {
      "code": 6110,
      "name": "depositDisabledOutsideElevationGroup",
      "msg": "Can't deposit into this reserve outside elevation group"
    },
    {
      "code": 6111,
      "name": "cannotCalculateReferralAmountDueToSlotsMismatch",
      "msg": "Cannot calculate referral amount due to slots mismatch"
    }
  ],
  "types": [
    {
      "name": "updateConfigMode",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "updateLoanToValuePct"
          },
          {
            "name": "updateMaxLiquidationBonusBps"
          },
          {
            "name": "updateLiquidationThresholdPct"
          },
          {
            "name": "updateProtocolLiquidationFee"
          },
          {
            "name": "updateProtocolTakeRate"
          },
          {
            "name": "updateFeesBorrowFee"
          },
          {
            "name": "updateFeesFlashLoanFee"
          },
          {
            "name": "updateFeesReferralFeeBps"
          },
          {
            "name": "updateDepositLimit"
          },
          {
            "name": "updateBorrowLimit"
          },
          {
            "name": "updateTokenInfoLowerHeuristic"
          },
          {
            "name": "updateTokenInfoUpperHeuristic"
          },
          {
            "name": "updateTokenInfoExpHeuristic"
          },
          {
            "name": "updateTokenInfoTwapDivergence"
          },
          {
            "name": "updateTokenInfoScopeTwap"
          },
          {
            "name": "updateTokenInfoScopeChain"
          },
          {
            "name": "updateTokenInfoName"
          },
          {
            "name": "updateTokenInfoPriceMaxAge"
          },
          {
            "name": "updateTokenInfoTwapMaxAge"
          },
          {
            "name": "updateScopePriceFeed"
          },
          {
            "name": "updatePythPrice"
          },
          {
            "name": "updateSwitchboardFeed"
          },
          {
            "name": "updateSwitchboardTwapFeed"
          },
          {
            "name": "updateBorrowRateCurve"
          },
          {
            "name": "updateEntireReserveConfig"
          },
          {
            "name": "updateDebtWithdrawalCap"
          },
          {
            "name": "updateDepositWithdrawalCap"
          },
          {
            "name": "updateDebtWithdrawalCapCurrentTotal"
          },
          {
            "name": "updateDepositWithdrawalCapCurrentTotal"
          },
          {
            "name": "updateBadDebtLiquidationBonusBps"
          },
          {
            "name": "updateMinLiquidationBonusBps"
          },
          {
            "name": "deleveragingMarginCallPeriod"
          },
          {
            "name": "updateBorrowFactor"
          },
          {
            "name": "updateAssetTier"
          },
          {
            "name": "updateElevationGroup"
          },
          {
            "name": "deleveragingThresholdSlotsPerBps"
          },
          {
            "name": "deprecatedUpdateMultiplierSideBoost"
          },
          {
            "name": "deprecatedUpdateMultiplierTagBoost"
          },
          {
            "name": "updateReserveStatus"
          },
          {
            "name": "updateFarmCollateral"
          },
          {
            "name": "updateFarmDebt"
          },
          {
            "name": "updateDisableUsageAsCollateralOutsideEmode"
          },
          {
            "name": "updateBlockBorrowingAboveUtilization"
          },
          {
            "name": "updateBlockPriceUsage"
          },
          {
            "name": "updateBorrowLimitOutsideElevationGroup"
          },
          {
            "name": "updateBorrowLimitsInElevationGroupAgainstThisReserve"
          },
          {
            "name": "updateHostFixedInterestRateBps"
          }
        ]
      }
    },
    {
      "name": "updateLendingMarketConfigValue",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "bool",
            "fields": [
              "bool"
            ]
          },
          {
            "name": "u8",
            "fields": [
              "u8"
            ]
          },
          {
            "name": "u8Array",
            "fields": [
              {
                "array": [
                  "u8",
                  8
                ]
              }
            ]
          },
          {
            "name": "u16",
            "fields": [
              "u16"
            ]
          },
          {
            "name": "u64",
            "fields": [
              "u64"
            ]
          },
          {
            "name": "u128",
            "fields": [
              "u128"
            ]
          },
          {
            "name": "pubkey",
            "fields": [
              "pubkey"
            ]
          },
          {
            "name": "elevationGroup",
            "fields": [
              {
                "defined": {
                  "name": "elevationGroup"
                }
              }
            ]
          }
        ]
      }
    },
    {
      "name": "updateLendingMarketMode",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "updateOwner"
          },
          {
            "name": "updateEmergencyMode"
          },
          {
            "name": "updateLiquidationCloseFactor"
          },
          {
            "name": "updateLiquidationMaxValue"
          },
          {
            "name": "updateGlobalUnhealthyBorrow"
          },
          {
            "name": "updateGlobalAllowedBorrow"
          },
          {
            "name": "updateRiskCouncil"
          },
          {
            "name": "updateMinFullLiquidationThreshold"
          },
          {
            "name": "updateInsolvencyRiskLtv"
          },
          {
            "name": "updateElevationGroup"
          },
          {
            "name": "updateReferralFeeBps"
          },
          {
            "name": "deprecatedUpdateMultiplierPoints"
          },
          {
            "name": "updatePriceRefreshTriggerToMaxAgePct"
          },
          {
            "name": "updateAutodeleverageEnabled"
          },
          {
            "name": "updateBorrowingDisabled"
          },
          {
            "name": "updateMinNetValueObligationPostAction"
          },
          {
            "name": "updateMinValueSkipPriorityLiqCheck"
          },
          {
            "name": "updatePaddingFields"
          }
        ]
      }
    },
    {
      "name": "lastUpdate",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "slot",
            "type": "u64"
          },
          {
            "name": "stale",
            "type": "u8"
          },
          {
            "name": "priceStatus",
            "type": "u8"
          },
          {
            "name": "placeholder",
            "type": {
              "array": [
                "u8",
                6
              ]
            }
          }
        ]
      }
    },
    {
      "name": "elevationGroup",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "maxLiquidationBonusBps",
            "type": "u16"
          },
          {
            "name": "id",
            "type": "u8"
          },
          {
            "name": "ltvPct",
            "type": "u8"
          },
          {
            "name": "liquidationThresholdPct",
            "type": "u8"
          },
          {
            "name": "allowNewLoans",
            "type": "u8"
          },
          {
            "name": "maxReservesAsCollateral",
            "type": "u8"
          },
          {
            "name": "padding0",
            "type": "u8"
          },
          {
            "name": "debtReserve",
            "type": "pubkey"
          },
          {
            "name": "padding1",
            "type": {
              "array": [
                "u64",
                4
              ]
            }
          }
        ]
      }
    },
    {
      "name": "initObligationArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tag",
            "type": "u8"
          },
          {
            "name": "id",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "obligationCollateral",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "depositReserve",
            "type": "pubkey"
          },
          {
            "name": "depositedAmount",
            "type": "u64"
          },
          {
            "name": "marketValueSf",
            "type": "u128"
          },
          {
            "name": "borrowedAmountAgainstThisCollateralInElevationGroup",
            "type": "u64"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u64",
                9
              ]
            }
          }
        ]
      }
    },
    {
      "name": "obligationLiquidity",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "borrowReserve",
            "type": "pubkey"
          },
          {
            "name": "cumulativeBorrowRateBsf",
            "type": {
              "defined": {
                "name": "bigFractionBytes"
              }
            }
          },
          {
            "name": "padding",
            "type": "u64"
          },
          {
            "name": "borrowedAmountSf",
            "type": "u128"
          },
          {
            "name": "marketValueSf",
            "type": "u128"
          },
          {
            "name": "borrowFactorAdjustedMarketValueSf",
            "type": "u128"
          },
          {
            "name": "borrowedAmountOutsideElevationGroups",
            "type": "u64"
          },
          {
            "name": "padding2",
            "type": {
              "array": [
                "u64",
                7
              ]
            }
          }
        ]
      }
    },
    {
      "name": "assetTier",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "regular"
          },
          {
            "name": "isolatedCollateral"
          },
          {
            "name": "isolatedDebt"
          }
        ]
      }
    },
    {
      "name": "bigFractionBytes",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "value",
            "type": {
              "array": [
                "u64",
                4
              ]
            }
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u64",
                2
              ]
            }
          }
        ]
      }
    },
    {
      "name": "feeCalculation",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "exclusive"
          },
          {
            "name": "inclusive"
          }
        ]
      }
    },
    {
      "name": "reserveCollateral",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mintPubkey",
            "type": "pubkey"
          },
          {
            "name": "mintTotalSupply",
            "type": "u64"
          },
          {
            "name": "supplyVault",
            "type": "pubkey"
          },
          {
            "name": "padding1",
            "type": {
              "array": [
                "u128",
                32
              ]
            }
          },
          {
            "name": "padding2",
            "type": {
              "array": [
                "u128",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "reserveConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "status",
            "type": "u8"
          },
          {
            "name": "assetTier",
            "type": "u8"
          },
          {
            "name": "hostFixedInterestRateBps",
            "type": "u16"
          },
          {
            "name": "reserved2",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "reserved3",
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "protocolTakeRatePct",
            "type": "u8"
          },
          {
            "name": "protocolLiquidationFeePct",
            "type": "u8"
          },
          {
            "name": "loanToValuePct",
            "type": "u8"
          },
          {
            "name": "liquidationThresholdPct",
            "type": "u8"
          },
          {
            "name": "minLiquidationBonusBps",
            "type": "u16"
          },
          {
            "name": "maxLiquidationBonusBps",
            "type": "u16"
          },
          {
            "name": "badDebtLiquidationBonusBps",
            "type": "u16"
          },
          {
            "name": "deleveragingMarginCallPeriodSecs",
            "type": "u64"
          },
          {
            "name": "deleveragingThresholdSlotsPerBps",
            "type": "u64"
          },
          {
            "name": "fees",
            "type": {
              "defined": {
                "name": "reserveFees"
              }
            }
          },
          {
            "name": "borrowRateCurve",
            "type": {
              "defined": {
                "name": "borrowRateCurve"
              }
            }
          },
          {
            "name": "borrowFactorPct",
            "type": "u64"
          },
          {
            "name": "depositLimit",
            "type": "u64"
          },
          {
            "name": "borrowLimit",
            "type": "u64"
          },
          {
            "name": "tokenInfo",
            "type": {
              "defined": {
                "name": "tokenInfo"
              }
            }
          },
          {
            "name": "depositWithdrawalCap",
            "type": {
              "defined": {
                "name": "withdrawalCaps"
              }
            }
          },
          {
            "name": "debtWithdrawalCap",
            "type": {
              "defined": {
                "name": "withdrawalCaps"
              }
            }
          },
          {
            "name": "elevationGroups",
            "type": {
              "array": [
                "u8",
                20
              ]
            }
          },
          {
            "name": "disableUsageAsCollOutsideEmode",
            "type": "u8"
          },
          {
            "name": "utilizationLimitBlockBorrowingAbove",
            "type": "u8"
          },
          {
            "name": "reserved1",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "borrowLimitOutsideElevationGroup",
            "type": "u64"
          },
          {
            "name": "borrowLimitAgainstThisCollateralInElevationGroup",
            "type": {
              "array": [
                "u64",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "reserveFarmKind",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "collateral"
          },
          {
            "name": "debt"
          }
        ]
      }
    },
    {
      "name": "reserveFees",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "borrowFeeSf",
            "type": "u64"
          },
          {
            "name": "flashLoanFeeSf",
            "type": "u64"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          }
        ]
      }
    },
    {
      "name": "reserveLiquidity",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mintPubkey",
            "type": "pubkey"
          },
          {
            "name": "supplyVault",
            "type": "pubkey"
          },
          {
            "name": "feeVault",
            "type": "pubkey"
          },
          {
            "name": "availableAmount",
            "type": "u64"
          },
          {
            "name": "borrowedAmountSf",
            "type": "u128"
          },
          {
            "name": "marketPriceSf",
            "type": "u128"
          },
          {
            "name": "marketPriceLastUpdatedTs",
            "type": "u64"
          },
          {
            "name": "mintDecimals",
            "type": "u64"
          },
          {
            "name": "depositLimitCrossedSlot",
            "type": "u64"
          },
          {
            "name": "borrowLimitCrossedSlot",
            "type": "u64"
          },
          {
            "name": "cumulativeBorrowRateBsf",
            "type": {
              "defined": {
                "name": "bigFractionBytes"
              }
            }
          },
          {
            "name": "accumulatedProtocolFeesSf",
            "type": "u128"
          },
          {
            "name": "accumulatedReferrerFeesSf",
            "type": "u128"
          },
          {
            "name": "pendingReferrerFeesSf",
            "type": "u128"
          },
          {
            "name": "absoluteReferralRateSf",
            "type": "u128"
          },
          {
            "name": "tokenProgram",
            "type": "pubkey"
          },
          {
            "name": "padding2",
            "type": {
              "array": [
                "u64",
                51
              ]
            }
          },
          {
            "name": "padding3",
            "type": {
              "array": [
                "u128",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "reserveStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "active"
          },
          {
            "name": "obsolete"
          },
          {
            "name": "hidden"
          }
        ]
      }
    },
    {
      "name": "withdrawalCaps",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "configCapacity",
            "type": "i64"
          },
          {
            "name": "currentTotal",
            "type": "i64"
          },
          {
            "name": "lastIntervalStartTimestamp",
            "type": "u64"
          },
          {
            "name": "configIntervalLengthSeconds",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "priceHeuristic",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "lower",
            "type": "u64"
          },
          {
            "name": "upper",
            "type": "u64"
          },
          {
            "name": "exp",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "pythConfiguration",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "price",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "scopeConfiguration",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "priceFeed",
            "type": "pubkey"
          },
          {
            "name": "priceChain",
            "type": {
              "array": [
                "u16",
                4
              ]
            }
          },
          {
            "name": "twapChain",
            "type": {
              "array": [
                "u16",
                4
              ]
            }
          }
        ]
      }
    },
    {
      "name": "switchboardConfiguration",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "priceAggregator",
            "type": "pubkey"
          },
          {
            "name": "twapAggregator",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "tokenInfo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "heuristic",
            "type": {
              "defined": {
                "name": "priceHeuristic"
              }
            }
          },
          {
            "name": "maxTwapDivergenceBps",
            "type": "u64"
          },
          {
            "name": "maxAgePriceSeconds",
            "type": "u64"
          },
          {
            "name": "maxAgeTwapSeconds",
            "type": "u64"
          },
          {
            "name": "scopeConfiguration",
            "type": {
              "defined": {
                "name": "scopeConfiguration"
              }
            }
          },
          {
            "name": "switchboardConfiguration",
            "type": {
              "defined": {
                "name": "switchboardConfiguration"
              }
            }
          },
          {
            "name": "pythConfiguration",
            "type": {
              "defined": {
                "name": "pythConfiguration"
              }
            }
          },
          {
            "name": "blockPriceUsage",
            "type": "u8"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                7
              ]
            }
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u64",
                19
              ]
            }
          }
        ]
      }
    },
    {
      "name": "borrowRateCurve",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "points",
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "curvePoint"
                  }
                },
                11
              ]
            }
          }
        ]
      }
    },
    {
      "name": "curvePoint",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "utilizationRateBps",
            "type": "u32"
          },
          {
            "name": "borrowRateBps",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "userState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "userId",
            "type": "u64"
          },
          {
            "name": "farmState",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "isFarmDelegated",
            "type": "u8"
          },
          {
            "name": "padding0",
            "type": {
              "array": [
                "u8",
                7
              ]
            }
          },
          {
            "name": "rewardsTallyScaled",
            "type": {
              "array": [
                "u128",
                10
              ]
            }
          },
          {
            "name": "rewardsIssuedUnclaimed",
            "type": {
              "array": [
                "u64",
                10
              ]
            }
          },
          {
            "name": "lastClaimTs",
            "type": {
              "array": [
                "u64",
                10
              ]
            }
          },
          {
            "name": "activeStakeScaled",
            "type": "u128"
          },
          {
            "name": "pendingDepositStakeScaled",
            "type": "u128"
          },
          {
            "name": "pendingDepositStakeTs",
            "type": "u64"
          },
          {
            "name": "pendingWithdrawalUnstakeScaled",
            "type": "u128"
          },
          {
            "name": "pendingWithdrawalUnstakeTs",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u64"
          },
          {
            "name": "delegatee",
            "type": "pubkey"
          },
          {
            "name": "lastStakeTs",
            "type": "u64"
          },
          {
            "name": "padding1",
            "type": {
              "array": [
                "u64",
                50
              ]
            }
          }
        ]
      }
    },
    {
      "name": "lendingMarket",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u64"
          },
          {
            "name": "bumpSeed",
            "type": "u64"
          },
          {
            "name": "lendingMarketOwner",
            "type": "pubkey"
          },
          {
            "name": "lendingMarketOwnerCached",
            "type": "pubkey"
          },
          {
            "name": "quoteCurrency",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "referralFeeBps",
            "type": "u16"
          },
          {
            "name": "emergencyMode",
            "type": "u8"
          },
          {
            "name": "autodeleverageEnabled",
            "type": "u8"
          },
          {
            "name": "borrowDisabled",
            "type": "u8"
          },
          {
            "name": "priceRefreshTriggerToMaxAgePct",
            "type": "u8"
          },
          {
            "name": "liquidationMaxDebtCloseFactorPct",
            "type": "u8"
          },
          {
            "name": "insolvencyRiskUnhealthyLtvPct",
            "type": "u8"
          },
          {
            "name": "minFullLiquidationValueThreshold",
            "type": "u64"
          },
          {
            "name": "maxLiquidatableDebtMarketValueAtOnce",
            "type": "u64"
          },
          {
            "name": "globalUnhealthyBorrowValue",
            "type": "u64"
          },
          {
            "name": "globalAllowedBorrowValue",
            "type": "u64"
          },
          {
            "name": "riskCouncil",
            "type": "pubkey"
          },
          {
            "name": "reserved1",
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "elevationGroups",
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "elevationGroup"
                  }
                },
                32
              ]
            }
          },
          {
            "name": "elevationGroupPadding",
            "type": {
              "array": [
                "u64",
                90
              ]
            }
          },
          {
            "name": "minNetValueInObligationSf",
            "type": "u128"
          },
          {
            "name": "minValueSkipLiquidationLtvBfChecks",
            "type": "u64"
          },
          {
            "name": "padding1",
            "type": {
              "array": [
                "u64",
                177
              ]
            }
          }
        ]
      }
    },
    {
      "name": "obligation",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tag",
            "type": "u64"
          },
          {
            "name": "lastUpdate",
            "type": {
              "defined": {
                "name": "lastUpdate"
              }
            }
          },
          {
            "name": "lendingMarket",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "deposits",
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "obligationCollateral"
                  }
                },
                8
              ]
            }
          },
          {
            "name": "lowestReserveDepositLiquidationLtv",
            "type": "u64"
          },
          {
            "name": "depositedValueSf",
            "type": "u128"
          },
          {
            "name": "borrows",
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "obligationLiquidity"
                  }
                },
                5
              ]
            }
          },
          {
            "name": "borrowFactorAdjustedDebtValueSf",
            "type": "u128"
          },
          {
            "name": "borrowedAssetsMarketValueSf",
            "type": "u128"
          },
          {
            "name": "allowedBorrowValueSf",
            "type": "u128"
          },
          {
            "name": "unhealthyBorrowValueSf",
            "type": "u128"
          },
          {
            "name": "depositsAssetTiers",
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "borrowsAssetTiers",
            "type": {
              "array": [
                "u8",
                5
              ]
            }
          },
          {
            "name": "elevationGroup",
            "type": "u8"
          },
          {
            "name": "numOfObsoleteReserves",
            "type": "u8"
          },
          {
            "name": "hasDebt",
            "type": "u8"
          },
          {
            "name": "referrer",
            "type": "pubkey"
          },
          {
            "name": "borrowingDisabled",
            "type": "u8"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                7
              ]
            }
          },
          {
            "name": "highestBorrowFactorPct",
            "type": "u64"
          },
          {
            "name": "padding3",
            "type": {
              "array": [
                "u64",
                126
              ]
            }
          }
        ]
      }
    },
    {
      "name": "referrerState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "shortUrl",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "referrerTokenState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "referrer",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "amountUnclaimedSf",
            "type": "u128"
          },
          {
            "name": "amountCumulativeSf",
            "type": "u128"
          },
          {
            "name": "bump",
            "type": "u64"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u64",
                31
              ]
            }
          }
        ]
      }
    },
    {
      "name": "shortUrl",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "referrer",
            "type": "pubkey"
          },
          {
            "name": "shortUrl",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "userMetadata",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "referrer",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u64"
          },
          {
            "name": "userLookupTable",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "padding1",
            "type": {
              "array": [
                "u64",
                51
              ]
            }
          },
          {
            "name": "padding2",
            "type": {
              "array": [
                "u64",
                64
              ]
            }
          }
        ]
      }
    },
    {
      "name": "reserve",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u64"
          },
          {
            "name": "lastUpdate",
            "type": {
              "defined": {
                "name": "lastUpdate"
              }
            }
          },
          {
            "name": "lendingMarket",
            "type": "pubkey"
          },
          {
            "name": "farmCollateral",
            "type": "pubkey"
          },
          {
            "name": "farmDebt",
            "type": "pubkey"
          },
          {
            "name": "liquidity",
            "type": {
              "defined": {
                "name": "reserveLiquidity"
              }
            }
          },
          {
            "name": "reserveLiquidityPadding",
            "type": {
              "array": [
                "u64",
                150
              ]
            }
          },
          {
            "name": "collateral",
            "type": {
              "defined": {
                "name": "reserveCollateral"
              }
            }
          },
          {
            "name": "reserveCollateralPadding",
            "type": {
              "array": [
                "u64",
                150
              ]
            }
          },
          {
            "name": "config",
            "type": {
              "defined": {
                "name": "reserveConfig"
              }
            }
          },
          {
            "name": "configPadding",
            "type": {
              "array": [
                "u64",
                117
              ]
            }
          },
          {
            "name": "borrowedAmountOutsideElevationGroup",
            "type": "u64"
          },
          {
            "name": "borrowedAmountsAgainstThisReserveInElevationGroups",
            "type": {
              "array": [
                "u64",
                32
              ]
            }
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u64",
                207
              ]
            }
          }
        ]
      }
    }
  ]
};
