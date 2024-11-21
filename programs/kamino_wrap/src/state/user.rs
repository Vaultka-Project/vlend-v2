use anchor_lang::prelude::*;
use bytemuck::{Pod, Zeroable};

use crate::{assert_struct_align, assert_struct_size};

assert_struct_size!(UserAccount, 1432);
assert_struct_align!(UserAccount, 8);

pub const USER_ACCOUNT_PADDING: usize = 512;

/// The central account management structure for a user's Kamino positions to be used as collateral on mrgn
/// * Rent ~= 0.011 SOL
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

    // Reserved for future keys
    _reserved0: [u8; 128],

    // ??? Make this authoritative?
    /// At-a-glance information about markets this account has positions in.
    /// * Not sorted in any particular order
    /// * Non-authoritative. Kamino has 5 "primary" markets as of November 2024 (Jito, JLP, Main,
    ///   Altcoin, Ethena). If a user has filled all of their slots, they can still create new
    ///   obligations for future markets, but they will not appear here
    pub market_info: [KaminoMarketInfo; 5],

    /// Reserved for future use
    pub placeholder: u64,
    /// Timestamp of last on-chain action on this account.
    pub last_activity: i64,
    /// Bump to generate this pda
    pub bump_seed: u8,
    // Pad to nearest 8-byte alignment
    pub padding0: [u8; 7],

    // Reserved for future use
    _reserved1: [u8; USER_ACCOUNT_PADDING],
}

impl UserAccount {
    pub const LEN: usize = std::mem::size_of::<UserAccount>();

    /// Adds a new KaminoMarketInfo entry to the next available non-occupied slot in `market_info`.
    /// Does nothing if no slots are available.
    pub fn add_market_info(&mut self, market: Pubkey, obligation: Pubkey) {
        for market_info in self.market_info.iter_mut() {
            if market_info.market == Pubkey::default() {
                *market_info = KaminoMarketInfo::new(market, obligation);
                return;
            }
        }
        msg!("user market info storage is full");
    }

    /// Finds a KaminoMarketInfo entry with the given market.
    /// Returns `Some(&KaminoMarketInfo)` if found, otherwise `None`.
    pub fn find_market_info_by_market(&self, market: Pubkey) -> Option<&KaminoMarketInfo> {
        self.market_info
            .iter()
            .find(|&market_info| market_info.market == market)
    }

    /// Finds a KaminoMarketInfo entry with the given obligation.
    /// Returns `Some(&KaminoMarketInfo)` if found, otherwise `None`.
    pub fn find_market_info_by_obligation(&self, obligation: Pubkey) -> Option<&KaminoMarketInfo> {
        self.market_info
            .iter()
            .find(|&market_info| market_info.obligation == obligation)
    }
}

pub const MARKET_INFO_PADDING: usize = 64;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Zeroable, Pod)]
#[repr(C)]
pub struct KaminoMarketInfo {
    /// Kamino lending market
    pub market: Pubkey,
    /// obligation for the given market
    pub obligation: Pubkey,
    _reserved0: [u8; MARKET_INFO_PADDING],
}

impl KaminoMarketInfo {
    /// Creates a new KaminoMarketInfo entry
    pub fn new(market: Pubkey, obligation: Pubkey) -> Self {
        KaminoMarketInfo {
            market,
            obligation,
            _reserved0: [0; MARKET_INFO_PADDING],
        }
    }
}
