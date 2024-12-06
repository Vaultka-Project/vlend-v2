// Runs when the user's funds are collateralized to lock the user's ability to withdraw that asset.
// Funds can still be withdrawn subject to the approval of the mrgnlend risk engine, but cannot be
// withdrawn freely outside of a CPI from mrgnlend.
//
// Note: the lock applies on an obligation basis, which may include several assets (reserves)
use crate::errors::ErrorCode;
use crate::state::UserAccount;
use anchor_lang::prelude::*;

#[allow(unused_variables)]
pub fn start_borrow(ctx: Context<StartBorrow>, obligaton: Pubkey) -> Result<()> {
    let mut user_account = ctx.accounts.user_account.load_init()?;

    let market_info = user_account.find_info_by_obligation_mut(&obligaton);
    if market_info.is_none() {
        return err!(ErrorCode::MarketInfoDoesNotExist);
    }
    let market_info = market_info.unwrap();

    if !(market_info.is_free_to_withdraw()) {
        market_info.remove_free_to_withdraw_flag();
        user_account.last_activity = Clock::get().unwrap().unix_timestamp;
    } else {
        // Do nothing if borrows were already init...
    }

    Ok(())
}

#[derive(Accounts)]
pub struct StartBorrow<'info> {
    pub user: Signer<'info>,

    #[account(
        mut,
        has_one = user
    )]
    pub user_account: AccountLoader<'info, UserAccount>,
}
