// Wraps an simple deposit to Kamino of new assets into the program-owner user account. Use this
// instruction when depositing new assets into Kamino
use crate::state::UserAccount;
use anchor_lang::prelude::*;

#[allow(unused_variables)]
pub fn fresh_deposit(ctx: Context<FreshDeposit>) -> Result<()> {
    let mut user_account = ctx.accounts.user_account.load_mut()?;

    // TODO deposit

    user_account.last_activity = Clock::get().unwrap().unix_timestamp;

    Ok(())
}

#[derive(Accounts)]
pub struct FreshDeposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        has_one = user
    )]
    pub user_account: AccountLoader<'info, UserAccount>,

    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}