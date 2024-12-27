/*
Note: Due to some Anchor issue, the errors here do not get built into the IDL, and must be manually inserted.
Open the latest good idl.json and copy the text between:

"errors": [
  {
    "code": 6000,
    "name": "MathError",
    "msg": "Math error"
  },
  ...etc....
  ],

  From that existing JSON file, changed/append items as needed (chat GPT works great for this) and then insert that into the
  generated idl.json until whatever issue prevents Anchor from reading these is resolved
*/

use anchor_lang::prelude::*;

#[error_code]
pub enum MarginfiError {
    #[msg("Math error")] // 6000
    MathError,
    #[msg("Invalid bank index")] // 6001
    BankNotFound,
    #[msg("Lending account balance not found")] // 6002
    LendingAccountBalanceNotFound,
    #[msg("Bank deposit capacity exceeded")] // 6003
    BankAssetCapacityExceeded,
    #[msg("Invalid transfer")] // 6004
    InvalidTransfer,
    #[msg("Missing Oracle, Bank, LST mint, or Sol Pool")] // 6005
    MissingPythOrBankAccount,
    #[msg("Missing Pyth account")] // 6006
    MissingPythAccount,
    #[msg("Invalid Pyth account")] // 6007
    InvalidOracleAccount,
    #[msg("Missing Bank account")] // 6008
    MissingBankAccount,
    #[msg("Invalid Bank account")] // 6009
    InvalidBankAccount,
    #[msg("RiskEngine rejected due to either bad health or stale oracles")] // 6010
    RiskEngineInitRejected,
    #[msg("Lending account balance slots are full")] // 6011
    LendingAccountBalanceSlotsFull,
    #[msg("Bank already exists")] // 6012
    BankAlreadyExists,
    #[msg("Illegal liquidation")] // 6013
    IllegalLiquidation,
    #[msg("Account is not bankrupt")] // 6014
    AccountNotBankrupt,
    #[msg("Account balance is not bad debt")] // 6015
    BalanceNotBadDebt,
    #[msg("Invalid group config")] // 6016
    InvalidConfig,
    #[msg("Stale oracle data")] // 6017
    StaleOracle,
    #[msg("Bank paused")] // 6018
    BankPaused,
    #[msg("Bank is ReduceOnly mode")] // 6019
    BankReduceOnly,
    #[msg("Bank is missing")] // 6020
    BankAccountNotFound,
    #[msg("Operation is deposit-only")] // 6021
    OperationDepositOnly,
    #[msg("Operation is withdraw-only")] // 6022
    OperationWithdrawOnly,
    #[msg("Operation is borrow-only")] // 6023
    OperationBorrowOnly,
    #[msg("Operation is repay-only")] // 6024
    OperationRepayOnly,
    #[msg("No asset found")] // 6025
    NoAssetFound,
    #[msg("No liability found")] // 6026
    NoLiabilityFound,
    #[msg("Invalid oracle setup")] // 6027
    InvalidOracleSetup,
    #[msg("Invalid bank utilization ratio")] // 6028
    IllegalUtilizationRatio,
    #[msg("Bank borrow cap exceeded")] // 6029
    BankLiabilityCapacityExceeded,
    #[msg("Invalid Price")] // 6030
    InvalidPrice,
    #[msg("Account can have only one liability when account is under isolated risk")] // 6031
    IsolatedAccountIllegalState, // 6032
    #[msg("Emissions already setup")]
    EmissionsAlreadySetup,
    #[msg("Oracle is not set")] // 6033
    OracleNotSetup,
    #[msg("Invalid switchboard decimal conversion")] // 6034
    InvalidSwitchboardDecimalConversion,
    #[msg("Cannot close balance because of outstanding emissions")] // 6035
    CannotCloseOutstandingEmissions,
    #[msg("Update emissions error")] //6036
    EmissionsUpdateError,
    #[msg("Account disabled")] // 6037
    AccountDisabled,
    #[msg("Account can't temporarily open 3 balances, please close a balance first")] // 6038
    AccountTempActiveBalanceLimitExceeded,
    #[msg("Illegal action during flashloan")] // 6039
    AccountInFlashloan,
    #[msg("Illegal flashloan")] // 6040
    IllegalFlashloan,
    #[msg("Illegal flag")] // 6041
    IllegalFlag,
    #[msg("Illegal balance state")] // 6042
    IllegalBalanceState,
    #[msg("Illegal account authority transfer")] // 6043
    IllegalAccountAuthorityTransfer,
    #[msg("Unauthorized")] // 6044
    Unauthorized,
    #[msg("Invalid account authority")] // 6045
    IllegalAction,
    #[msg("Token22 Banks require mint account as first remaining account")] // 6046
    T22MintRequired,
    #[msg("Staked SOL accounts can only deposit staked assets and borrow SOL")] // 6047
    AssetTagMismatch,
    #[msg("Stake pool validation failed: check the stake pool, mint, or sol pool")] // 6048
    StakePoolValidationFailed,
    #[msg("Invalid ATA for global fee account")] // 6049
    InvalidFeeAta,
    #[msg("Use add pool permissionless instead")] // 6050
    AddedStakedPoolManually,

    // TODO renumber when merged with main
    #[msg("Cannot borrow kamino wrapped assets")] // 6051
    CantBorrowKwrappedAssets,
    #[msg("Cannot deposit kamino assets, use kwrap to deposit, then register_kwrap")] // 6052
    CantDepositKwrappedAssets,
    #[msg("Cannot withdraw kamino assets, use the kwrap-specific withdraw ix")] // 6053
    CantWithdrawKwrappedAssets,
    #[msg("Kwrap account doesn't match known derived account")] // 6054
    InvalidKwrapAccount,
    #[msg("Mint does not match Reserve Mint")] // 6055
    KwrapReserveMismatch,
    #[msg("Invalid Kamino Reserve for this bank")] // 6056
    InvalidKaminoReserve,
    #[msg("User has Kwrapped positions: must pass a synced Kwrap User Account")] // 6057
    KwrapUserAccountMissing,
    #[msg("User Kwrap sync failed: tried to accrue interest and sync again")] // 6058
    KwrapSyncFailed,
}

impl From<MarginfiError> for ProgramError {
    fn from(e: MarginfiError) -> Self {
        ProgramError::Custom(e as u32)
    }
}
