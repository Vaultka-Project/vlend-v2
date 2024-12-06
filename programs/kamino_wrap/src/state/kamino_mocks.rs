use anchor_lang::prelude::*;
use bytemuck::{Pod, Zeroable};

use crate::{assert_struct_align, assert_struct_size};

assert_struct_size!(MinimalReserve, 8616);
// Rust is wrong about u128 alignment, which ends up as 16-aligned on-chain.
assert_struct_align!(MinimalReserve, 8);

/// A copy of Kamino's `Reserve` that treats all the fields we are not interested in as padding and doesn't nest any data inside structs.
///
/// See comments for hex offset of each field, which MATCH EXACTLY the offset of `Reserve`
#[derive(Debug, PartialEq, Pod, Zeroable, Copy, Clone)]
#[repr(C)]
pub struct MinimalReserve {
    pub version: u64, // 0x0

    // 112 bytes (0x8 - 0x78) - Fills up to the offset of `ReserveLiquidity` (0x78)
    padding1_part1: [u8; 64],
    padding1_part2: [u8; 32],
    padding1_part3: [u8; 16],

    // 152 bytes (32 + 32 + 32 + 8 + 16 + 16 + 8 + 8)
    pub mint_pubkey: Pubkey,               // 0x78
    pub supply_vault: Pubkey,              // 0x98
    pub fee_vault: Pubkey,                 // 0xB8
    pub available_amount: u64,             // 0xD8
    pub borrowed_amount_sf: u128,          // 0xE0
    pub market_price_sf: u128,             // 0xF0
    pub market_price_last_updated_ts: u64, // 0x108
    pub mint_decimals: u64,                // 0x110

    // 1080 bytes (0x110 - 0x548) - Fills the rest of `ReserveLiquidity` (to `reserve_liquidity_padding`)
    padding2_part1: [u8; 512],
    padding2_part2: [u8; 256],
    padding2_part3: [u8; 128],
    padding2_part4: [u8; 64],
    padding2_part5: [u8; 64],
    padding2_part6: [u8; 32],
    padding2_part7: [u8; 24],

    // 7264 bytes (0x548 to end) - the remainder of the `Reserve` struct
    padding3_part1: [u8; 4096],
    padding3_part2: [u8; 2048],
    padding3_part3: [u8; 1024],
    padding3_part4: [u8; 64],
    padding3_part5: [u8; 32],
}

impl MinimalReserve {
    pub fn from_bytes(v: &[u8]) -> &Self {
        bytemuck::from_bytes(v)
    }
}
