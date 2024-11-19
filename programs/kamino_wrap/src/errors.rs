use anchor_lang::error_code;

#[error_code]
pub enum ErrorCode {
    #[msg("Generic math or overflow error.")]
    MathError, // 6000
    #[msg("Passed a bad LUT key: did you remember to use the kwrap account to derive?")]
    LutKeyInvalid, // 6001
}
