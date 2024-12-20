// Runs when the user's funds are collateralized to lock the user's ability to withdraw from that
// obligation. Funds can still be withdrawn subject to the approval of the mrgnlend risk engine, but
// cannot be withdrawn freely outside of a CPI from mrgnlend.
//
// Note: the lock applies on an obligation basis, which may include several assets (reserves). This
// can be relatively annoying on the front end for various reasons, though you may create one
// obligation per asset to circumvent this limitation. If this proves to be a nuisance in the
// future, we can modify this to lock only the parts of the wrapped obligation that are actually
// actively collateralized (we already track this in market_info.collateralize_amounts), but there
// is likely no use case for this feature since there is no reason to wrap funds and then not use
// them as collateral
use crate::errors::ErrorCode;
use crate::ix_utils::validate_mrgn_cpi;
use crate::state::{MinimalObligation, UserAccount, POSITION_ACTIVE, POSITION_INACTIVE};
use anchor_lang::{prelude::*, solana_program::sysvar};

pub fn start_borrow(ctx: Context<StartBorrow>) -> Result<()> {
    {
        // Validate we are inside a mrgn CPI
        let sysvar = &ctx.accounts.instruction_sysvar_account.to_account_info();
        // Note: future support for cpi from other programs would go here...
        validate_mrgn_cpi(sysvar)?;
    }

    let mut user_account = ctx.accounts.user_account.load_mut()?;
    user_account.last_activity = Clock::get().unwrap().unix_timestamp;

    let market_info = user_account.find_info_by_obligation_mut(&ctx.accounts.obligation.key());
    if market_info.is_none() {
        return err!(ErrorCode::MarketInfoDoesNotExist);
    }
    let market_info = market_info.unwrap();

    if !(market_info.is_free_to_withdraw()) {
        market_info.remove_free_to_withdraw_flag();
    } else {
        // Do nothing if borrows were already init...
    }

    let obligation_bytes = ctx.accounts.obligation.try_borrow_data()?;
    // TODO validate the discriminator against hard-coded value (not important but should do)...
    // Ignore the first 8 bytes (discriminator)
    let (_discriminator, data) = obligation_bytes.split_at(8);
    let obligation = MinimalObligation::from_bytes(data);

    let deposit_maybe = obligation.find_deposit_by_reserve(&ctx.accounts.reserve.key());
    if deposit_maybe.is_none() {
        return err!(ErrorCode::DepositDoesNotExist);
    }
    let (i, deposit) = deposit_maybe.unwrap();
    // If this position has already been collateralized, or we're trying to collateralize an empty positions, abort
    if market_info.positions[i].state != POSITION_INACTIVE || deposit.deposited_amount == 0 {
        return err!(ErrorCode::AlreadyCollateralized);
    }
    market_info.positions[i].state = POSITION_ACTIVE;
    market_info.positions[i].amount = deposit.deposited_amount;
    market_info.positions[i].bank = ctx.accounts.bank.key();

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

    /// CHECK: Must be listed in user's `market_info` on the UserAccount provided
    pub obligation: UncheckedAccount<'info>,

    /// CHECK: Must exist in obligation.deposits
    pub reserve: UncheckedAccount<'info>,

    /// CHECK: Completely unchecked, trusts the mrgn CPI caller explicitly
    pub bank: UncheckedAccount<'info>,

    /// CHECK: checked against hardcoded sysvar program
    #[account(address = sysvar::instructions::ID)]
    pub instruction_sysvar_account: UncheckedAccount<'info>,
}
