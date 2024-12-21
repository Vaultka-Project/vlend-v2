use anchor_lang::prelude::*;
use bytemuck::{Pod, Zeroable};

use crate::errors::ErrorCode;
use crate::{assert_struct_align, assert_struct_size};

// Note: this struct is VERY close to redline, a few more bytes will start SILENTLY blowing out the
// stack in various instructions. This is mostly because Kamino already uses a ton of stack and the
// CPI instructions are close to redline from just executing the CPI. If the program compiles
// without error but you see this in testing:
/*
Program abcde failed: Access violation in unknown section at address 0xac79ebce46e1cbd9 of size 8
*/
// You blew out the stack, try to cut padding to reduce the size of this account
assert_struct_size!(UserAccount, 2168);
assert_struct_align!(UserAccount, 8);

pub const ACCOUNT_FREE_TO_WITHDRAW: u8 = 0b00000001;

pub const USER_ACCOUNT_PADDING: usize = 128;

/// The central account management structure for a user's Kamino positions to be used as collateral
/// on mrgn. Typically, a mrgn user will have one kWrap UserAccount per Mrgn Account, and will
/// deposit any Kamino assets they want to use as collateral with this account.
/// * Rent ~= 0.016 SOL
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
    _reserved0: [u8; 64],

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

    /// At-a-glance information about markets this account has positions in.
    /// * Not sorted in any particular order
    /// * Kamino has 5 "primary" markets as of December 2024 (Jito, JLP, Main, Altcoin, Ethena). We
    ///   assume 90% of users will use 2 or fewer Kamino markets, and 99.99% use less than 3.
    /// * If full, adding a new obligation will error. Create a new account or close an obligation.
    pub market_info: [KaminoMarketInfo; 3],

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

    /// Across all obligations stored on this acount, return the net amount that is unsynced accross
    /// all collateralized positions. Returns 0 if there aren't any positions with the target bank.
    pub fn sum_unsynced_for_bank(&self, target_bank: &Pubkey) -> u64 {
        self.market_info
            .iter()
            .flat_map(|market_info| market_info.positions.iter())
            .filter(|position| position.bank.eq(target_bank))
            .map(|position| position.unsynced)
            .sum()
    }

    /// Across all obligations stored on this acount with the given bank, add the unsynced amount to
    /// the position's amount and reset usynced amount to 0. If there are no positions with the
    /// target bank, does nothing.
    pub fn sync_positions_for_bank(&mut self, target_bank: &Pubkey, slot: u64) {
        for market_info in self.market_info.iter_mut() {
            for position in market_info.positions.iter_mut() {
                if position.bank.eq(target_bank) {
                    position.amount += position.unsynced;
                    position.unsynced = 0;
                    position.synced_slot = slot;
                }
            }
        }
    }
}

pub const MARKET_INFO_PADDING: usize = 16;
pub const POSITION_INACTIVE: u8 = 0;
pub const POSITION_ACTIVE: u8 = 1;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Zeroable, Pod)]
#[repr(C)]
pub struct CollateralizedPosition {
    /// Generally, this is either 0 or the same as `deposited_amount`, since there is rarely (if
    /// ever) a reason to deposit to a kwrapped obligation without using the full amount as
    /// collateral.
    /// * Non-authoritative unless synced (see `synced_slot`), the user may gain assets due to
    ///   interest accumulation that are not accounted for until cranked
    /// * In token, in native decimal
    pub amount: u64,
    /// The amount of interest or deposits that have accumulated since last sync. These funds always
    /// count towards the user's balance just like `amount` but are not synced with the mrgn
    /// bank's book-keeping until the next time the user manually syncs with that bank.
    /// * Use `accrue_interest` to update unsynced interest
    /// * In token, in native decimal
    pub unsynced: u64,
    /// The mrgn bank that collateralized this position
    pub bank: Pubkey,
    /// * 0 = POSITION_INACTIVE
    /// * 1 = POSITION_ACTIVE
    /// * Others - reserved for future use
    pub state: u8,
    _reserved0: [u8; 7],
    // TODO test edge cases where refresh_obligation lands after accrue_interest (may need tx introspection?)
    /// If this equals the current slot (`Clock::get().unwrap().slot`) and the corresponding
    /// obligation was also last updated in the same slot, then this position includes all interest
    /// accrued and can be considered authoritative.
    /// * Use `accrue_interest` to sync interest
    pub synced_slot: u64,
}

impl CollateralizedPosition {
    pub fn new(amount: u64, bank: Pubkey) -> Self {
        CollateralizedPosition {
            amount,
            unsynced: 0,
            bank,
            state: POSITION_INACTIVE,
            _reserved0: [0; 7],
            synced_slot: 0,
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Zeroable, Pod)]
#[repr(C)]
pub struct KaminoMarketInfo {
    /// Kamino lending market
    pub market: Pubkey,
    /// kwrap-owned obligation for the given market
    pub obligation: Pubkey,
    pub flags: u8,
    _padding0: [u8; 7],
    /// Each value here corresponds to an index on the obligation's `deposits` field and represents
    /// the amount of deposit that is being collateralized for some purpose.
    pub positions: [CollateralizedPosition; 8],
    _reserved0: [u8; MARKET_INFO_PADDING],
}

impl KaminoMarketInfo {
    /// Creates a new KaminoMarketInfo entry
    pub fn new(market: Pubkey, obligation: Pubkey) -> Self {
        KaminoMarketInfo {
            market,
            obligation,
            flags: ACCOUNT_FREE_TO_WITHDRAW,
            positions: [CollateralizedPosition::zeroed(); 8],
            _padding0: [0; 7],
            _reserved0: [0; MARKET_INFO_PADDING],
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

    /// Sets the `ACCOUNT_FREE_TO_WITHDRAW`, if permitted, leaving other flags as-is.
    /// If not permitted (any balance is collateralized), does nothing.
    pub fn set_free_to_withdraw_flag(&mut self) {
        if self
            .positions
            .iter()
            .all(|&position| position.amount == 0 && position.unsynced == 0)
        {
            self.flags |= ACCOUNT_FREE_TO_WITHDRAW;
        }
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
