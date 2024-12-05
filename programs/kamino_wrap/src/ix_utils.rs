use crate::errors::ErrorCode;
use anchor_lang::prelude::*;
use solana_program::sysvar::instructions::get_instruction_relative;

use crate::constants::MRGN_ID;

/// Structs that implement this trait have a `get_hash` tool that returns the function discriminator
pub trait Hashable {
    fn get_hash() -> [u8; 8];
}

/// The function discrminator is constructed from these 8 bytes. Typically, the namespace is
/// "global" or "state"
pub fn get_function_hash(namespace: &str, name: &str) -> [u8; 8] {
    let preimage = format!("{}:{}", namespace, name);
    let mut sighash = [0u8; 8];
    sighash.copy_from_slice(
        &anchor_lang::solana_program::hash::hash(preimage.as_bytes()).to_bytes()[..8],
    );
    sighash
}

/// Errors if the top-level relative instruction is not the Mrgn program
pub fn validate_mrgn_cpi(sysvar: &AccountInfo) -> Result<()> {
    let mrgn_key = &MRGN_ID;
    let index_relative_to_current: i64 = 0;
    let instruction_sysvar_account_info = sysvar;
    let current_ix =
        get_instruction_relative(index_relative_to_current, instruction_sysvar_account_info)
            .unwrap();
    if &current_ix.program_id != mrgn_key {
        return err!(ErrorCode::CpiNotFromMrgn);
    }
    Ok(())
}
