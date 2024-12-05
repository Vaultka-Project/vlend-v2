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
}
