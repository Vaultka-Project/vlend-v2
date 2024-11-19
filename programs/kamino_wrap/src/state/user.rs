use anchor_lang::prelude::*;
use bytemuck::{Pod, Zeroable};

use crate::{assert_struct_align, assert_struct_size};

assert_struct_size!(UserAccount, 792);
assert_struct_align!(UserAccount, 8);

/// 
#[account(zero_copy)]
#[repr(C)]
pub struct UserAccount {
    /// This account's own key. 
    pub key: Pubkey,
    /// This account's owner. Must sign most transactions related to this account.
    pub user: Pubkey,
    /// Kamino metadata account
    pub user_metadata: Pubkey,
    /// Kamino LUT associated with the metadata account
    pub lut: Pubkey,
    /// At-a-glance information about markets this account has positions in.
    /// * Not sorted in any particular order
    pub market_info: [KaminoMarketInfo; 5],

    pub placeholder: u64,
    /// Timestamp of last on-chain action on this account.
    pub last_activity: i64,

    pub bump_seed: u8,
    pub padding0: [u8; 7],

}

impl UserAccount {
    pub const LEN: usize = std::mem::size_of::<UserAccount>();
}

pub const MARKET_INFO_PADDING: usize = 64;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Zeroable, Pod)]
#[repr(C)]
pub struct KaminoMarketInfo {
    /// Kamino lending market
    pub market: Pubkey,
    /// obligation for the given market
    pub obligations: Pubkey,
    _reserved0: [u8; MARKET_INFO_PADDING],
}