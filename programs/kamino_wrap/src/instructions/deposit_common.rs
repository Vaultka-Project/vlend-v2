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