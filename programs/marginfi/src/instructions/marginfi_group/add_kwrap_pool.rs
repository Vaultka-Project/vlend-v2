// Adds a ASSET_TAG_STAKED type bank to a group with sane defaults. Used by validators to add their
// stake pool to a group so users can borrow SOL against it
use crate::{
    check,
    constants::{
        ASSET_TAG_STAKED, FEE_VAULT_AUTHORITY_SEED, FEE_VAULT_SEED, INSURANCE_VAULT_AUTHORITY_SEED,
        INSURANCE_VAULT_SEED, LIQUIDITY_VAULT_AUTHORITY_SEED, LIQUIDITY_VAULT_SEED,
        SPL_SINGLE_POOL_ID,
    },
    events::{GroupEventHeader, LendingPoolBankCreateEvent},
    state::{
        kwrap_settings::KwrapConfigCompact,
        marginfi_group::{
            Bank, BankConfigCompact, BankOperationalState, InterestRateConfig, MarginfiGroup,
            RiskTier,
        },
        price::OracleSetup,
        staked_settings::StakedSettings,
    },
    MarginfiError, MarginfiResult,
};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::*;
use fixed_macro::types::I80F48;
use kwrap::{constants::KAMINO_ID, state::MinimalReserve};

pub fn lending_pool_add_bank_kwrap(
    ctx: Context<LendingPoolAddBankKwrap>,
    config: KwrapConfigCompact,
    _bank_seed: u64,
) -> MarginfiResult {
    // Note: Kwrap banks don't need to debit the flat SOL fee because these will always be
    // first-party pools owned by mrgn and never permissionless pools

    let LendingPoolAddBankKwrap {
        bank_mint,
        bank: bank_loader,
        ..
    } = ctx.accounts;

    let mut bank = bank_loader.load_init()?;
    let group = ctx.accounts.marginfi_group.load()?;
    let mut account_data = ctx.accounts.reserve.try_borrow_mut_data()?;
    // TODO validate the discriminator against hard-coded value...
    // Ignore the first 8 bytes (discriminator)
    let (_discriminator, data) = account_data.split_at_mut(8);
    let reserve = MinimalReserve::from_bytes(data);

    check!(
        reserve.mint_pubkey == bank_mint.key()
            && reserve.mint_decimals == (bank_mint.decimals as u64),
        MarginfiError::KwrapReserveMismatch
    );

    // These are placeholder values: kwrapped positions do not support borrowing and likely
    // never will, thus they will earn no interest.

    // Note: Some placeholder values are non-zero to handle downstream validation checks.
    let default_ir_config = InterestRateConfig {
        optimal_utilization_rate: I80F48!(0.4).into(),
        plateau_interest_rate: I80F48!(0.4).into(),
        protocol_fixed_fee_apr: I80F48!(0.01).into(),
        max_interest_rate: I80F48!(3).into(),
        insurance_ir_fee: I80F48!(0.1).into(),
        ..Default::default()
    };

    let config: BankConfigCompact = BankConfigCompact {
        asset_weight_init: config.asset_weight_init,
        asset_weight_maint: config.asset_weight_maint,
        liability_weight_init: I80F48!(1.5).into(), // placeholder
        liability_weight_maint: I80F48!(1.25).into(), // placeholder
        deposit_limit: config.deposit_limit,
        interest_rate_config: default_ir_config.into(), // placeholder
        operational_state: BankOperationalState::Operational,
        oracle_setup: OracleSetup::StakedWithPythPush,
        oracle_key: config.oracle, // becomes config.oracle_keys[0]
        borrow_limit: 0,
        risk_tier: RiskTier::Kwrap,
        asset_tag: config.asset_tag,
        _pad0: [0; 6],
        total_asset_value_init_limit: config.total_asset_value_init_limit,
        oracle_max_age: config.oracle_max_age,
    };

    // Note: kwrap banks have no vaults, because they hold no assets.
    *bank = Bank::new(
        ctx.accounts.marginfi_group.key(),
        config.into(),
        bank_mint.key(),
        bank_mint.decimals,
        Pubkey::default(),
        Pubkey::default(),
        Pubkey::default(),
        Clock::get().unwrap().unix_timestamp,
        0,
        0,
        0,
        0,
        0,
        0,
    );

    bank.config.validate()?;

    // TODO shove the reserve and stuff into a special place...

    // check!(
    //     stake_pool.owner == &SPL_SINGLE_POOL_ID,
    //     MarginfiError::StakePoolValidationFailed
    // );
    // let lst_mint = bank_mint.key();
    // let stake_pool = stake_pool.key();
    // let sol_pool = sol_pool.key();
    // // The mint (for supply) and stake pool (for sol balance) are recorded for price calculation
    // bank.config.oracle_keys[1] = lst_mint;
    // bank.config.oracle_keys[2] = sol_pool;
    // bank.config.validate_oracle_setup(
    //     ctx.remaining_accounts,
    //     Some(lst_mint),
    //     Some(stake_pool),
    //     Some(sol_pool),
    // )?;

    emit!(LendingPoolBankCreateEvent {
        header: GroupEventHeader {
            marginfi_group: ctx.accounts.marginfi_group.key(),
            signer: Some(group.admin)
        },
        bank: bank_loader.key(),
        mint: bank_mint.key(),
    });

    Ok(())
}

#[derive(Accounts)]
#[instruction(bank_seed: u64)]
pub struct LendingPoolAddBankKwrap<'info> {
    #[account(
        has_one = admin
    )]
    pub marginfi_group: AccountLoader<'info, MarginfiGroup>,

    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(mut)]
    pub fee_payer: Signer<'info>,

    /// For kwrapped banks, this must match the mint used by the Reserve
    pub bank_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        init,
        space = 8 + std::mem::size_of::<Bank>(),
        payer = fee_payer,
        seeds = [
            marginfi_group.key().as_ref(),
            bank_mint.key().as_ref(),
            &bank_seed.to_le_bytes(),
        ],
        bump,
    )]
    pub bank: AccountLoader<'info, Bank>,

    /// CHECK: Only checks that this is owned by the Kamino program. Loaded with bytemuck wizardry,
    /// which generally fails if the account is the wrong size. Checks that the `bank_mint` is the
    /// same as the mint used by the Reserve
    #[account(owner = KAMINO_ID)]
    pub reserve: UncheckedAccount<'info>,

    pub rent: Sysvar<'info, Rent>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}
