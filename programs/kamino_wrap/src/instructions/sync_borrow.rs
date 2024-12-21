// Mrgn banks call this by CPI to sync their internal (non-authoritative) balance with any deposits
// or interest accumulation that has taken place since the user collateralized their position.
// Typically, the front end should put this ix in the same tx as any deposit (via cpi from
// `sync_kwrap`).
//
// Note: there is no need to sync users regularly, unless a more authoritative balance on the bank
// is desired. Users are always synced before liquidation.
use crate::ix_utils::validate_mrgn_cpi;
use crate::state::UserAccount;
use anchor_lang::{prelude::*, solana_program::sysvar};

pub fn sync_borrow(ctx: Context<SyncBorrow>) -> Result<()> {
    {
        // Validate we are inside a mrgn CPI
        let sysvar = &ctx.accounts.instruction_sysvar_account.to_account_info();
        validate_mrgn_cpi(sysvar)?;
    }

    let mut user_account = ctx.accounts.user_account.load_mut()?;
    user_account.last_activity = Clock::get().unwrap().unix_timestamp;

    user_account.sync_positions_for_bank(&ctx.accounts.bank.key(), Clock::get().unwrap().slot);

    Ok(())
}

#[derive(Accounts)]
pub struct SyncBorrow<'info> {
    #[account(mut)]
    pub user_account: AccountLoader<'info, UserAccount>,

    /// CHECK: This ix does nothing if this bank does not exist in the user_account's market_info.
    pub bank: UncheckedAccount<'info>,

    /// CHECK: checked against hardcoded sysvar program
    #[account(address = sysvar::instructions::ID)]
    pub instruction_sysvar_account: UncheckedAccount<'info>,
}
