use anchor_lang::error_code;

#[error_code]
pub enum ErrorCode {
    #[msg("Generic math or overflow error.")]
    MathError, // 6000
    #[msg("Passed a bad LUT key: did you remember to use the kwrap account to derive?")]
    LutKeyInvalid, // 6001
    #[msg("No more obligation slots available, create a new user account or close an obligation.")]
    ObligationEntriesFull, // 6002
    #[msg("Only the Mrgnlend program can enable withdraws on this account, withdraw through Mrgn.")]
    CpiNotFromMrgn, // 6003
    #[msg("Attempting to add a duplicate market entry.")]
    DuplicateMarket, // 6004
    #[msg("This account does not have market info with that obligation or market.")]
    MarketInfoDoesNotExist, // 6005
    #[msg("This obligation has no reserve matching that key.")]
    DepositDoesNotExist, // 6006
    #[msg("This position was already collateralized.")]
    AlreadyCollateralized, // 6007
}
