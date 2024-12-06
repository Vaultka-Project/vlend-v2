// Withdraws funds from a mrgn account
use crate::{
    constants::KAMINO_ID, ix_utils::validate_mrgn_cpi, state::UserAccount,
    user_account_signer_seeds,
};
use anchor_lang::{prelude::*, solana_program::sysvar};
use anchor_spl::{
    token::Token,
    token_interface::{self, Mint, TokenAccount, TokenInterface},
};
use solana_program::{instruction::Instruction, program::invoke_signed};

use super::withdraw_ix_data;

pub fn mrgn_withdraw(ctx: Context<MrgnWithdraw>, collateral_amount: u64) -> Result<()> {
    {
        let user_account = ctx.accounts.user_account.load()?;
        let market_info = user_account.find_info_by_obligation(&ctx.accounts.obligation.key());
        if !(market_info.unwrap().is_free_to_withdraw()) {
            // Note: if the account is free to withdraw, we don't apply the mrgn CPI restriction.
            let sysvar = &ctx.accounts.instruction_sysvar_account.to_account_info();
            // Note: future support for cpi from other programs would go here...
            validate_mrgn_cpi(sysvar)?;
        }
    } // release borrow of sysvar and user account

    {
        // Note: clone() is required here to avoid re-borrowing as mut of `AccountMeta::new`
        let user_account = ctx.accounts.user_account.load()?.clone();

        let ix: Instruction = withdraw_cpi_ix(&ctx, KAMINO_ID, collateral_amount)?;
        let accs = &ctx.accounts;
        invoke_signed(
            &ix,
            &[
                accs.user_account.to_account_info(), // obligation owner (signer/fee payer)
                accs.obligation.to_account_info(),   // obligation
                accs.lending_market.to_account_info(), // market
                accs.lending_market_authority.to_account_info(), // market auth
                // **** reserve accounts *****
                accs.reserve.to_account_info(),
                accs.reserve_liquidity_mint.to_account_info(),
                accs.reserve_destination_deposit_collateral
                    .to_account_info(),
                accs.reserve_collateral_mint.to_account_info(),
                accs.reserve_liquidity_supply.to_account_info(),
                // ***** end reserve accounts *****
                accs.user_destination_liquidity.to_account_info(), // user source ATA
                accs.kamino_program.to_account_info(),             // placeholder
                // Program accounts
                accs.collateral_token_program.to_account_info(),
                accs.liquidity_token_program.to_account_info(),
                accs.instruction_sysvar_account.to_account_info(),
            ],
            &[user_account_signer_seeds!(user_account)],
        )?;
    }

    ctx.accounts
        .transfer_kwrapped_token_to_user(collateral_amount)?;

    let mut user_account = ctx.accounts.user_account.load_mut()?;
    user_account.last_activity = Clock::get().unwrap().unix_timestamp;

    Ok(())
}

fn withdraw_cpi_ix(
    ctx: &Context<MrgnWithdraw>,
    program_id: Pubkey,
    collateral_amount: u64,
) -> Result<Instruction> {
    let accs = &ctx.accounts;
    let instruction = Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(accs.user_account.key(), true), // obligation owner (signer)
            AccountMeta::new(ctx.accounts.obligation.key(), false), // obligation
            AccountMeta::new_readonly(accs.lending_market.key(), false), // lending market
            AccountMeta::new_readonly(accs.lending_market_authority.key(), false), // market auth
            // **** reserve accounts *****
            AccountMeta::new(accs.reserve.key(), false),
            AccountMeta::new(accs.reserve_liquidity_mint.key(), false),
            // aka `reserve_source_collateral`
            AccountMeta::new(accs.reserve_destination_deposit_collateral.key(), false),
            AccountMeta::new(accs.reserve_collateral_mint.key(), false),
            // aka `reserve_liquidity_supply`
            AccountMeta::new(accs.reserve_liquidity_supply.key(), false),
            // ***** end reserve accounts *****
            AccountMeta::new(accs.user_destination_liquidity.key(), false), // users's dest ATA
            // Note: using program's id as a placeholder
            AccountMeta::new_readonly(accs.kamino_program.key(), false), // (placeholder)
            // Program accounts
            AccountMeta::new_readonly(accs.collateral_token_program.key(), false),
            AccountMeta::new_readonly(accs.liquidity_token_program.key(), false),
            AccountMeta::new_readonly(accs.instruction_sysvar_account.key(), false),
        ],
        data: withdraw_ix_data(collateral_amount),
    };
    Ok(instruction)
}

#[derive(Accounts)]
pub struct MrgnWithdraw<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    /// User kwrap account
    #[account(
        mut,
        has_one = user,
        constraint = {
            let acc = user_account.load()?;
            let info = acc.find_info_by_market(lending_market.key);
            info.is_some() && info.unwrap().obligation == *obligation.key
        }
    )]
    pub user_account: AccountLoader<'info, UserAccount>,

    /// Obligation to deposit into, must be under the given market, and owned by `user_account`, the
    /// user's kwrap account
    /// CHECK: validated in CPI
    #[account(mut)]
    pub obligation: UncheckedAccount<'info>,
    /// Kamino lending market overseeing the reserve
    /// CHECK: validated in CPI
    pub lending_market: UncheckedAccount<'info>,
    /// Read from market
    /// CHECK: validated in CPI
    pub lending_market_authority: UncheckedAccount<'info>,
    /// Reserve to deposit into, must be under the given market
    /// CHECK: validated in CPI
    #[account(mut)]
    pub reserve: UncheckedAccount<'info>,
    /// Read from the reserve
    /// CHECK: validated in CPI
    #[account(mut)]
    pub reserve_liquidity_mint: Box<InterfaceAccount<'info, Mint>>,
    /// Read from the reserve
    /// CHECK: validated in CPI
    #[account(mut)]
    pub reserve_liquidity_supply: UncheckedAccount<'info>,
    /// Read from the reserve
    /// CHECK: validated in CPI
    #[account(mut)]
    pub reserve_collateral_mint: UncheckedAccount<'info>,
    /// Read from the reserve
    /// CHECK: validated in CPI
    #[account(mut)]
    pub reserve_destination_deposit_collateral: UncheckedAccount<'info>,
    /// An ATA for `reserve_liquidity_mint` owned by `user_account`. Because Kamino only allows the
    /// owner (which is `user_account`) to withdraw, this ATA acts as an intermediary, but the funds
    /// are immediately transferred to `user_withdraw_destination`
    /// CHECK: validated in CPI
    #[account(mut)]
    pub user_destination_liquidity: UncheckedAccount<'info>,
    /// The users's destination ATA for withdrawn funds. Completely unchecked.
    #[account(mut)]
    pub user_withdraw_destination: InterfaceAccount<'info, TokenAccount>,
    /// CHECK: unused, placeholder in case Kamino adds a usage for
    /// `placeholder_user_destination_collateral`
    #[account(mut)]
    pub placeholder: Option<UncheckedAccount<'info>>,

    /// CHECK: Validated against known hard-coded key
    #[account(address = KAMINO_ID)]
    pub kamino_program: UncheckedAccount<'info>,
    pub collateral_token_program: Program<'info, Token>,
    pub liquidity_token_program: Interface<'info, TokenInterface>,
    /// CHECK: checked against hardcoded sysvar program
    #[account(address = sysvar::instructions::ID)]
    pub instruction_sysvar_account: UncheckedAccount<'info>,
}

impl<'info> MrgnWithdraw<'info> {
    pub fn transfer_kwrapped_token_to_user(&self, amount: u64) -> Result<()> {
        // Borrow checker wizard magic
        let user_account = self.user_account.load()?;
        let signer_seeds: &[&[u8]] = user_account_signer_seeds!(user_account);
        let signer_seeds = [signer_seeds];

        let decimals = self.reserve_liquidity_mint.decimals;
        let cpi_accounts = token_interface::TransferChecked {
            from: self.user_destination_liquidity.to_account_info(),
            to: self.user_withdraw_destination.to_account_info(),
            authority: self.user_account.to_account_info(),
            mint: self.reserve_liquidity_mint.to_account_info(),
        };
        let program = self.liquidity_token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(program, cpi_accounts, &signer_seeds);
        token_interface::transfer_checked(cpi_ctx, amount, decimals)
    }
}
