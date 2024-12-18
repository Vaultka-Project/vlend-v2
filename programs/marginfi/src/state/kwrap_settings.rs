use super::{marginfi_group::WrappedI80F48, price::OracleSetup};
use crate::constants::ASSET_TAG_DEFAULT;
use anchor_lang::prelude::*;
use fixed_macro::types::I80F48;

/// Used to configure Kwrap banks. A simplified version of `BankConfigCompact` which omits most
/// values related to interest since Kwrapped banks cannot earn interest or be borrowed against.
#[repr(C)]
#[derive(AnchorDeserialize, AnchorSerialize, Debug, PartialEq, Eq)]
pub struct KwrapConfigCompact {
    /// Kamino market for the `reserve`
    pub market: Pubkey,
    /// Kamino reserve (i.e. bank) that is wrapped by this mrgn bank.
    pub reserve: Pubkey,
    /// Currently unused: a mrgn-owned oracle for the reserve's asset to validate price against
    pub oracle: Pubkey,

    pub asset_weight_init: WrappedI80F48,
    pub asset_weight_maint: WrappedI80F48,

    pub deposit_limit: u64,
    pub total_asset_value_init_limit: u64,

    /// Either `KwrapPythPush` or `KwrapSwitchboardPull`
    pub oracle_setup: OracleSetup,
    /// Currently unused: Kamino's oracle age applies to kwrapped banks.
    pub oracle_max_age: u16,
    /// Generally, `ASSET_TAG_DEFAULT` or `ASSET_TAG_SOL`. Supported in case Kamino adds other asset
    /// kinds in the future that require special treatment
    pub asset_tag: u8,
    _pad0: [u8; 4],

    /// The following values are irrelevant because kwrap banks do not support borrowing.
    // * interest_config,
    // * liability_weight_init
    // * liability_weight_maint
    // * borrow_limit
    _reserved0: [u8; 8]
}

impl KwrapConfigCompact {
    pub const LEN: usize = std::mem::size_of::<KwrapConfigCompact>();

    pub fn new(
        market: Pubkey,
        reserve: Pubkey,
        oracle: Pubkey,
        asset_weight_init: WrappedI80F48,
        asset_weight_maint: WrappedI80F48,
        deposit_limit: u64,
        total_asset_value_init_limit: u64,
        oracle_setup: OracleSetup,
        oracle_max_age: u16,
        asset_tag: u8,
    ) -> Self {
        KwrapConfigCompact {
            market,
            reserve,
            oracle,
            asset_weight_init,
            asset_weight_maint,
            deposit_limit,
            total_asset_value_init_limit,
            oracle_setup,
            oracle_max_age,
            asset_tag,
            _pad0: [0; 4],
            _reserved0: [0; 8],
        }
    }
}

impl Default for KwrapConfigCompact {
    fn default() -> Self {
        KwrapConfigCompact {
            market: Pubkey::default(),
            reserve: Pubkey::default(),
            oracle: Pubkey::default(),
            asset_weight_init: I80F48!(0.8).into(),
            asset_weight_maint: I80F48!(0.9).into(),
            deposit_limit: 1_000_000,
            total_asset_value_init_limit: 1_000_000,
            oracle_setup: OracleSetup::KwrapPythPush,
            oracle_max_age: 10,
            asset_tag: ASSET_TAG_DEFAULT,
            _pad0: [0; 4],
            _reserved0: [0; 8],
        }
    }
}
