use crate::{
    check,
    events::{AccountEventHeader, LendingAccountRegisterKwrapEvent},
    kwrap_utils::validate_user_kwrap_account,
    prelude::*,
    state::{
        marginfi_account::{BankAccountWrapper, MarginfiAccount, DISABLED_FLAG},
        marginfi_group::Bank,
    },
    utils::validate_asset_tags,
};
use anchor_lang::{prelude::*, solana_program::sysvar};
use fixed::types::I80F48;
use kwrap::{constants::KAMINO_ID, state::MinimalObligation};

/// 1. Create the user's bank account for the kwrapped asset deposited, if it does not exist yet
/// 2. Record asset increase in the bank account
/// 3. Flag the kwrap account to forbid withdrawals by the user without mrgn authorization
///
/// Note: we don't have to accrue interest, because kwrapped banks earn interest only on Kamino, and
/// cannot be borrowed against. We also don't need any of the bank's vaults, because no liquidity
/// moves.
pub fn lending_account_register_kwrap<'info>(
    ctx: Context<'_, '_, 'info, 'info, LendingAccountRegisterKwrap<'info>>,
) -> MarginfiResult {
    ctx.accounts.start_borrow_cpi()?;

    let LendingAccountRegisterKwrap {
        marginfi_account: marginfi_account_loader,
        authority,
        bank: bank_loader,
        user_kwrap_account,
        // obligation,
        // kwrap_program,
        ..
    } = ctx.accounts;
    let mut bank = bank_loader.load_mut()?;
    let mut marginfi_account = marginfi_account_loader.load_mut()?;

    validate_asset_tags(&bank, &marginfi_account)?;

    validate_user_kwrap_account(
        &marginfi_account.authority,
        &marginfi_account_loader.key(),
        &user_kwrap_account.key(),
    )?;

    check!(
        !marginfi_account.get_flag(DISABLED_FLAG),
        MarginfiError::AccountDisabled
    );

    let mut bank_account = BankAccountWrapper::find_or_create(
        &bank_loader.key(),
        &mut bank,
        &mut marginfi_account.lending_account,
    )?;

    // Note: the start_borrow cpi already checked that the obligation is valid by verifying that it
    // exists in the users's account, which in turn means it was created by kwrap::init_obligation
    let obligation_bytes = ctx.accounts.obligation.try_borrow_data()?;
    // TODO validate the discriminator against hard-coded value (not important but should do)...
    // Ignore the first 8 bytes (discriminator)
    let (_discriminator, data) = obligation_bytes.split_at(8);
    let obligation = MinimalObligation::from_bytes(data);

    let deposit_maybe = obligation.find_deposit_by_reserve(&ctx.accounts.reserve.key());
    check!(deposit_maybe.is_some(), MarginfiError::InvalidKaminoReserve);
    let (_, deposit) = deposit_maybe.unwrap();

    // Note: Kwrapped banks hold no assets, so the shares and such are irrelevant, but we still keep
    // a log of their balances for book-keeping purposes
    bank_account.deposit_no_repay(I80F48::from_num(deposit.deposited_amount))?;

    emit!(LendingAccountRegisterKwrapEvent {
        header: AccountEventHeader {
            signer: Some(authority.key()),
            marginfi_account: marginfi_account_loader.key(),
            marginfi_account_authority: marginfi_account.authority,
            marginfi_group: marginfi_account.group,
        },
        bank: bank_loader.key(),
        mint: bank.mint,
        obligation: ctx.accounts.obligation.key(),
        amount: deposit.deposited_amount
    });

    Ok(())
}

#[derive(Accounts)]
pub struct LendingAccountRegisterKwrap<'info> {
    pub group: AccountLoader<'info, MarginfiGroup>,

    #[account(
        mut,
        has_one = group,
        has_one = authority
    )]
    pub marginfi_account: AccountLoader<'info, MarginfiAccount>,

    pub authority: Signer<'info>,

    #[account(
        mut,
        has_one = group,
        has_one = reserve
    )]
    pub bank: AccountLoader<'info, Bank>,

    /// CHECK: validated in handler and by cpi
    #[account(
        mut,
        owner = kwrap::ID
    )]
    pub user_kwrap_account: UncheckedAccount<'info>,

    /// CHECK: validated in CPI, must be listed in user's `market_info` on the UserAccount provided
    #[account(owner = KAMINO_ID)]
    pub obligation: UncheckedAccount<'info>,

    /// CHECK: Validated against bank's known reserve. After the obligation is loaded, we also
    /// verify that this reserve exists on it (in obligation.deposits)
    #[account(owner = KAMINO_ID)]
    pub reserve: UncheckedAccount<'info>,

    /// CHECK: Validated against known hard-coded key
    #[account(address = kwrap::ID)]
    pub kwrap_program: UncheckedAccount<'info>,
    /// CHECK: checked against hardcoded sysvar program
    #[account(address = sysvar::instructions::ID)]
    pub instruction_sysvar_account: UncheckedAccount<'info>,
}

impl<'info> LendingAccountRegisterKwrap<'info> {
    pub fn start_borrow_cpi(&self) -> Result<()> {
        let cpi_accounts = kwrap::cpi::accounts::StartBorrow {
            user: self.authority.to_account_info(),
            user_account: self.user_kwrap_account.to_account_info(),
            obligation: self.obligation.to_account_info(),
            reserve: self.reserve.to_account_info(),
            bank: self.bank.to_account_info(),
            instruction_sysvar_account: self.instruction_sysvar_account.to_account_info()
        };
        let program = self.kwrap_program.to_account_info();
        let cpi_ctx = CpiContext::new(program, cpi_accounts);
        kwrap::cpi::start_borrow(cpi_ctx)
    }
}
