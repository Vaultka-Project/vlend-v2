use crate::check;
use crate::MarginfiError;
use anchor_lang::prelude::*;

/// Errors if the given `kwrap_account` is not the expected key derived from seeds
pub fn validate_user_kwrap_account(
    user: &Pubkey,
    mrgn_account: &Pubkey,
    kwrap_account: &Pubkey,
) -> Result<()> {
    // Derive the expected address
    let seeds = &[
        user.as_ref(),
        mrgn_account.as_ref(),
        &(0 as u8).to_le_bytes(),
        kwrap::constants::USER_ACCOUNT_SEED.as_bytes(),
    ];

    let (expected_address, _bump) = Pubkey::find_program_address(seeds, &kwrap::ID);

    check!(
        kwrap_account == &expected_address,
        MarginfiError::InvalidKwrapAccount
    );

    Ok(())
}
