use anchor_lang::prelude::*;
use bytemuck::{Pod, Zeroable};

use crate::errors::ErrorCode;
use crate::{assert_struct_align, assert_struct_size};

assert_struct_size!(UserAccount, 1464);
assert_struct_align!(UserAccount, 8);

pub const ACCOUNT_FREE_TO_WITHDRAW: u8 = 0b00000001;

pub const USER_ACCOUNT_PADDING: usize = 512;

/// The central account management structure for a user's Kamino positions to be used as collateral on mrgn
/// * Rent ~= 0.011 SOL
#[account(zero_copy)]
#[repr(C)]
pub struct UserAccount {
    /// This account's own key. A PDA of `user`, `bound_account`, (0 as u8), and `USER_ACCOUNT_SEED`
    pub key: Pubkey,
    /// This account's owner. Must sign most transactions related to this account.
    pub user: Pubkey,
    /// Kamino metadata account
    pub user_metadata: Pubkey,
    /// Kamino LUT associated with the metadata account
    pub lut: Pubkey,
    /// Typically, the mrgn account associated with this kwrap user account.
    pub bound_account: Pubkey,

    // Reserved for future keys
    _reserved0: [u8; 128],

    /// At-a-glance information about markets this account has positions in.
    /// * Not sorted in any particular order
    /// * Kamino has 5 "primary" markets as of November 2024 (Jito, JLP, Main, Altcoin, Ethena). It
    ///   is very unlikely that the vast majority of users will use all 5 slots. We assume 90% of
    ///   users will use 2 or fewer Kamino markets
    /// * If full, adding a new obligation will error. Create a new account or close an obligation.
    pub market_info: [KaminoMarketInfo; 5],

    /// Reserved for future use
    pub placeholder: u64,
    /// Timestamp of last on-chain action on this account.
    pub last_activity: i64,
    /// Bump to generate this pda
    pub bump_seed: u8,
    /// * (1) ACCOUNT_FREE_TO_WITHDRAW - if set, this account has not yet had any debts taken out
    ///   against it, and the owner can freely withdraw from it with no restrictions.
    /// * (2, 4, 8, 16, 32, 64, 128) - reserved for future use
    pub flags: u8,
    // Pad to nearest 8-byte alignment
    pub padding0: [u8; 6],

    // Reserved for future use
    _reserved1: [u8; USER_ACCOUNT_PADDING],
}

impl UserAccount {
    pub const LEN: usize = std::mem::size_of::<UserAccount>();

    /// Adds a new KaminoMarketInfo entry to the next available non-occupied slot in `market_info`.
    /// Errors if no slots are available.
    pub fn add_market_info(&mut self, market: &Pubkey, obligation: &Pubkey) -> Result<()> {
        if self.find_info_by_obligation(obligation).is_some() {
            return err!(ErrorCode::DuplicateMarket);
        }
        // Note: a second obligation on the same market is technically supported.

        for market_info in self.market_info.iter_mut() {
            if market_info.market == Pubkey::default() {
                *market_info = KaminoMarketInfo::new(*market, *obligation);
                return Ok(());
            }
        }
        return err!(ErrorCode::ObligationEntriesFull);
    }

    /// Finds a KaminoMarketInfo entry with the given market.
    /// Returns `Some(&KaminoMarketInfo)` if found, otherwise `None`.
    pub fn find_info_by_market(&self, market: &Pubkey) -> Option<&KaminoMarketInfo> {
        self.market_info
            .iter()
            .find(|&market_info| market_info.market.eq(market))
    }

    /// Finds a KaminoMarketInfo entry with the given obligation.
    /// Returns `Some(&KaminoMarketInfo)` if found, otherwise `None`.
    pub fn find_info_by_obligation(&self, obligation: &Pubkey) -> Option<&KaminoMarketInfo> {
        self.market_info
            .iter()
            .find(|&market_info| market_info.obligation.eq(obligation))
    }

    /// Finds a KaminoMarketInfo entry with the given obligation.
    /// Returns `Some(&KaminoMarketInfo)` if found, otherwise `None`.
    pub fn find_info_by_obligation_mut(
        &mut self,
        obligation: &Pubkey,
    ) -> Option<&mut KaminoMarketInfo> {
        self.market_info
            .iter_mut()
            .find(|market_info| market_info.obligation.eq(obligation))
    }

    pub fn clear_slot(&mut self, slot: usize) {
        self.market_info[slot] = KaminoMarketInfo::zeroed();
    }

    pub fn clear_slot_with_obligation(&mut self, obligation: &Pubkey) {
        if let Some(market_info) = self
            .market_info
            .iter_mut()
            .find(|market_info| market_info.obligation.eq(obligation))
        {
            *market_info = KaminoMarketInfo::zeroed();
        }
    }
}

pub const MARKET_INFO_PADDING: usize = 32;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Zeroable, Pod)]
#[repr(C)]
pub struct KaminoMarketInfo {
    /// Kamino lending market
    pub market: Pubkey,
    /// kwrap-owned obligation for the given market
    pub obligation: Pubkey,
    pub flags: u8,
    _padding0: [u8; 7],
    _reserved0: [u8; 24],
    _reserved1: [u8; MARKET_INFO_PADDING],
}

impl KaminoMarketInfo {
    /// Creates a new KaminoMarketInfo entry
    pub fn new(market: Pubkey, obligation: Pubkey) -> Self {
        KaminoMarketInfo {
            market,
            obligation,
            flags: ACCOUNT_FREE_TO_WITHDRAW,
            _padding0: [0; 7],
            _reserved0: [0; 24],
            _reserved1: [0; MARKET_INFO_PADDING],
        }
    }

    /// True if the `ACCOUNT_FREE_TO_WITHDRAW` flag is set, i.e. the account has no registered debts and
    /// is free to withdraw at any time
    pub fn is_free_to_withdraw(&self) -> bool {
        self.flags & ACCOUNT_FREE_TO_WITHDRAW != 0
    }

    /// Unsets the `ACCOUNT_FREE_TO_WITHDRAW`, leaving other flags as-is
    pub fn remove_free_to_withdraw_flag(&mut self) {
        self.flags &= !ACCOUNT_FREE_TO_WITHDRAW;
    }

    /// Sets the `ACCOUNT_FREE_TO_WITHDRAW`, leaving other flags as-is
    pub fn set_free_to_withdraw_flag(&mut self) {
        self.flags &= ACCOUNT_FREE_TO_WITHDRAW;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use solana_program::pubkey::Pubkey;

    #[test]
    fn test_add_market_info_success() {
        let mut user_account = UserAccount::zeroed();
        let market = Pubkey::new_unique();
        let obligation = Pubkey::new_unique();

        let result = user_account.add_market_info(&market, &obligation);
        assert!(result.is_ok());
        assert_eq!(user_account.market_info[0].market, market);
        assert_eq!(user_account.market_info[0].obligation, obligation);
    }

    #[test]
    fn test_add_multiple_market_info_success() {
        let mut user_account = UserAccount::zeroed();
        let market1 = Pubkey::new_unique();
        let obligation1 = Pubkey::new_unique();
        let market2 = Pubkey::new_unique();
        let obligation2 = Pubkey::new_unique();

        // Add first market info
        let result1 = user_account.add_market_info(&market1, &obligation1);
        assert!(result1.is_ok());
        assert_eq!(user_account.market_info[0].market, market1);
        assert_eq!(user_account.market_info[0].obligation, obligation1);

        // Add second market info
        let result2 = user_account.add_market_info(&market2, &obligation2);
        assert!(result2.is_ok());
        assert_eq!(user_account.market_info[1].market, market2);
        assert_eq!(user_account.market_info[1].obligation, obligation2);
    }

    #[test]
    fn test_add_market_info_no_slots_available() {
        let mut user_account = UserAccount::zeroed();

        // Fill all available slots with market info entries
        for i in 0..user_account.market_info.len() {
            let market = Pubkey::new_unique();
            let obligation = Pubkey::new_unique();
            let result = user_account.add_market_info(&market, &obligation);
            assert!(result.is_ok(), "Failed to add market info at index {}", i);
        }

        // Attempt to add one more market info, which should fail
        let extra_market = Pubkey::new_unique();
        let extra_obligation = Pubkey::new_unique();
        let result = user_account.add_market_info(&extra_market, &extra_obligation);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), ErrorCode::ObligationEntriesFull.into());
    }

    #[test]
    fn test_add_market_info_to_filled_and_one_slot_vacant() {
        let mut user_account = UserAccount::zeroed();

        // Fill all slots and then free one of them
        for i in 0..user_account.market_info.len() {
            let market = Pubkey::new_unique();
            let obligation = Pubkey::new_unique();
            let result = user_account.add_market_info(&market, &obligation);
            assert!(result.is_ok(), "Failed to add market info at index {}", i);
        }

        user_account.clear_slot(1);

        // Try to add a new market info again
        let new_market = Pubkey::new_unique();
        let new_obligation = Pubkey::new_unique();
        let result = user_account.add_market_info(&new_market, &new_obligation);
        assert!(result.is_ok());
        assert_eq!(user_account.market_info[1].market, new_market);
        assert_eq!(user_account.market_info[1].obligation, new_obligation);
    }

    #[test]
    fn test_add_market_info_duplicate_obligation() {
        let mut user_account = UserAccount::zeroed();
        let market = Pubkey::new_unique();
        let obligation = Pubkey::new_unique();

        // Add first market info
        let result1 = user_account.add_market_info(&market, &obligation);
        assert!(result1.is_ok());

        // Attempt to add duplicate again, which will fail
        let result2 = user_account.add_market_info(&market, &obligation);
        assert!(result2.is_err());
        assert_eq!(result2.unwrap_err(), ErrorCode::DuplicateMarket.into());
    }
}
