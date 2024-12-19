use crate::check;
use crate::MarginfiError;
use anchor_lang::prelude::*;
use fixed::types::I80F48;

/// Errors if the given `kwrap_account` is not the expected key derived from seeds
pub fn validate_user_kwrap_account(
    user: &Pubkey,
    mrgn_account: &Pubkey,
    kwrap_account: &Pubkey,
) -> Result<()> {
    let seeds = &[
        user.as_ref(),
        mrgn_account.as_ref(),
        &(0 as u8).to_le_bytes(), // currently, the nonce is not used
        kwrap::constants::USER_ACCOUNT_SEED.as_bytes(),
    ];

    let (expected_address, _bump) = Pubkey::find_program_address(seeds, &kwrap::ID);

    check!(
        kwrap_account == &expected_address,
        MarginfiError::InvalidKwrapAccount
    );

    Ok(())
}

/// Convert a fractional number with 60 decimal places (like used in Kamino) to a fractional number
/// with 48 decimal places (like used in mrgn)
pub fn convert_i68f60_to_i80f48(value: u128) -> I80F48 {
    // Right-shift the raw value by the shift difference to reduce the fractional precision
    let shifted_value = value >> (60 - 48);
    // Create an I80F48 instance from the shifted i128 value. Note that the cast is safe because we shifted earlier.
    I80F48::from_bits(shifted_value as i128)
}

#[cfg(test)]
mod tests {
    use std::i128;

    use super::*;

    #[test]
    fn test_convert_i68f60_to_i80f48() {
        // Test case 1: Small value, rounds to zero
        let i68f60_value = 0b0000_0100_0000_0000;
        let i80f48_value = convert_i68f60_to_i80f48(i68f60_value);
        assert_eq!(i80f48_value.to_bits(), 0b0000_0000_0000_0000);

        // Test case 2: Medium value
        let val = 0b0001_0000_0000_0000_0000_0000_0000_0000;
        let i68f60_value = val;
        let i80f48_value = convert_i68f60_to_i80f48(i68f60_value);
        assert_eq!(i80f48_value.to_bits(), val as i128 >> 12);

        // Test case 3: Large value (48 bits)
        let val = 0b1111_1111_1111_1111_1111_1111_1111_1111_1111_1111_1111_0000;
        let i68f60_value = val;
        let i80f48_value = convert_i68f60_to_i80f48(i68f60_value);
        assert_eq!(i80f48_value.to_bits(), val as i128 >> 12);

        // Test case 4: Max whole number value (2^68)
        let val = 295147905179352830000;
        let i68f60_value = val;
        let i80f48_value = convert_i68f60_to_i80f48(i68f60_value);
        // Note: 2^68 / 2^12 is really 72057594037927940, the actual result 72057594037927937 is rounded down
        assert_eq!(i80f48_value.to_bits(), val as i128 >> 12);

        // Tests cases 5/6: bit max
        let val = i128::MAX as u128;
        let i68f60_value = val;
        let i80f48_value = convert_i68f60_to_i80f48(i68f60_value);
        assert_eq!(i80f48_value.to_bits(), val as i128 >> 12);

        let val = u128::MAX;
        let i68f60_value = val;
        let i80f48_value = convert_i68f60_to_i80f48(i68f60_value);
        assert_eq!(i80f48_value.to_bits(), (val >> 12) as i128);
    }
}
