use anchor_lang::{AnchorDeserialize, AnchorSerialize};

use crate::ix_utils::get_function_hash;

/// Args for the deposit_reserve_liquidity_and_obligation_collateral CPI
#[derive(AnchorSerialize, AnchorDeserialize)]
struct DepositLiquidityCollateralArgs {
    pub liquidity_amount: u64,
}

/// Ix data for deposit_reserve_liquidity_and_obligation_collateral
pub fn deposit_ix_data(liquidity_amount: u64) -> Vec<u8> {
    let hash = get_function_hash(
        "global",
        "deposit_reserve_liquidity_and_obligation_collateral",
    );
    let mut buf: Vec<u8> = vec![];
    buf.extend_from_slice(&hash);
    let args = DepositLiquidityCollateralArgs { liquidity_amount };
    args.serialize(&mut buf).unwrap();
    buf
}

/// Args for the deposit_reserve_liquidity_and_obligation_collateral CPI
#[derive(AnchorSerialize, AnchorDeserialize)]
struct WithdrawCollateralArgs {
    pub collateral_amount: u64,
}

/// Ix data for withdraw_obligation_collateral_and_redeem_reserve_collateral
pub fn withdraw_ix_data(collateral_amount: u64) -> Vec<u8> {
    let hash = get_function_hash(
        "global",
        "withdraw_obligation_collateral_and_redeem_reserve_collateral",
    );
    let mut buf: Vec<u8> = vec![];
    buf.extend_from_slice(&hash);
    let args = WithdrawCollateralArgs { collateral_amount };
    args.serialize(&mut buf).unwrap();
    buf
}
