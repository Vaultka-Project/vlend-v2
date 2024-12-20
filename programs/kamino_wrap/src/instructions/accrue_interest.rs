// Kamino's interest accrual is permissionless, which complicates handling book-keeping for interest
// on the mrgn bank side. This ix records the delta between the last-synced collateral amount and
// the current actual balance in the Kamino position. The next time the user interacts with the
// mrgn bank, this balance will sync with the bank's books.
//
// Note: the user never HAS to sync manually, nor does this need to be cranked, as any unsynced
// amounts still count as funds and will sync during a liquidation attempt. However, not syncing
// complicates the front-end, such as displaying account health, displaying a bank's net deposits,
// and so forth.
use crate::errors::ErrorCode;
use crate::state::{MinimalObligation, UserAccount, POSITION_ACTIVE};
use anchor_lang::prelude::*;

pub fn accrue_interest(ctx: Context<AccrueInterest>) -> Result<()> {
    let mut user_account = ctx.accounts.user_account.load_mut()?;
    let clock = Clock::get().unwrap();
    user_account.last_activity = clock.unix_timestamp;
    let slot = clock.slot;

    let market_info = user_account.find_info_by_obligation_mut(&ctx.accounts.obligation.key());
    if market_info.is_none() {
        return err!(ErrorCode::MarketInfoDoesNotExist);
    }
    let market_info = market_info.unwrap();

    let obligation_bytes = ctx.accounts.obligation.try_borrow_data()?;
    // TODO validate the discriminator against hard-coded value (not important but should do)...
    // Ignore the first 8 bytes (discriminator)
    let (_discriminator, data) = obligation_bytes.split_at(8);
    let obligation = MinimalObligation::from_bytes(data);

    // ??? Add some tolerance here? Typically, a few slots of interest does not make much difference.
    if obligation.last_update_slot != slot {
        return err!(ErrorCode::ObligationStale);
    }

    for (i, deposit) in obligation.deposits.iter().enumerate() {
        // If this position is active (has non-zero collateralized), update it. Else, do nothing
        if market_info.positions[i].state == POSITION_ACTIVE {
            // Sanity check: this should always be true or we made a mistake recording a withdraw/liquidation
            if deposit.deposited_amount >= market_info.positions[i].amount {
                market_info.positions[i].unsynced =
                    deposit.deposited_amount - market_info.positions[i].amount;
            } else {
                panic!("unexpected critical accounting error");
            }
        } else {
            // do nothing, the position is inactive
        }
    }

    market_info.synced_slot = slot;

    Ok(())
}

#[derive(Accounts)]
pub struct AccrueInterest<'info> {
    pub user: Signer<'info>,

    #[account(
        mut,
        has_one = user
    )]
    pub user_account: AccountLoader<'info, UserAccount>,

    /// CHECK: Must be listed in user's `market_info` on the UserAccount provided
    pub obligation: UncheckedAccount<'info>,
}
