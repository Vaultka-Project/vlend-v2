use anchor_lang::prelude::*;
use bytemuck::{Pod, Zeroable};

use crate::{assert_struct_align, assert_struct_size};

assert_struct_size!(MinimalReserve, 8616);
// In Rust, due to the use of u128 the original would be 16-aligned on-chain. Solana makes this
// align 8 and then does some fancy sheningans under the hood
assert_struct_align!(MinimalReserve, 8);

/// A copy of Kamino's `Reserve` that treats all the fields we are not interested in as padding and
/// doesn't nest any data inside structs.
///
/// See comments for hex offset of each field, which MATCH EXACTLY the offsets in `Reserve`
///
/// Solana handles u128 in a special way, making them align 8, which causes a number of annoying
/// issues when interacting with Rust, where a struct with u128 would align 16. We replace all u128
/// in Kamino's original struct with [u8; 16], which aligns 1, to sidestep all of these issues,
/// rather than dealing with compiler voodo. Use a helper function to extract the actual u128
/// value. Notably, the size (8616) is not a multiple of 16, which is a huge headache.
#[derive(Debug, PartialEq, Pod, Zeroable, Copy, Clone)]
#[repr(C)]
pub struct MinimalReserve {
    pub version: u64, // 0x0

    // 16 bytes (0x8 - 0x12) `LastUpdate`
    // LastUpdate
    slot: u64,
    stale: u8,
    price_status: u8,
    placeholder: [u8; 6],

    // 96 bytes (0x12 - 0x78) - Fills up to the offset of `ReserveLiquidity` (0x78)
    padding1_part1: [u8; 64],
    padding1_part2: [u8; 32],

    // 152 bytes (32 + 32 + 32 + 8 + 16 + 16 + 8 + 8) `ReserveLiquidity` first few vars
    pub mint_pubkey: Pubkey,               // 0x78
    pub supply_vault: Pubkey,              // 0x98
    pub fee_vault: Pubkey,                 // 0xB8
    pub available_amount: u64,             // 0xD8
    pub borrowed_amount_sf: [u8; 16],      // 0xE0
    pub market_price_sf: [u8; 16],         // 0xF0
    pub market_price_last_updated_ts: u64, // 0x108
    pub mint_decimals: u64,                // 0x110

    // 1080 bytes (0x110 - 0x548) - Fills the rest of `ReserveLiquidity` (to `reserve_liquidity_padding`)
    padding2_part1: [u8; 1024],
    padding2_part2: [u8; 32],
    padding2_part3: [u8; 24],

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

    pub fn borrowed_amount_sf(&self) -> u128 {
        u128::from_le_bytes(self.borrowed_amount_sf)
    }

    pub fn market_price_sf(&self) -> u128 {
        u128::from_le_bytes(self.market_price_sf)
    }
}

/// A copy of Kamino's `Obligation` that treats all the fields we are not interested in as padding
/// and doesn't nest any data inside structs.
///
/// See comments for hex offset of each field, which MATCH EXACTLY the offsets in `Obligation`
///
/// Solana handles u128 in a special way, making them align 8, which causes a number of annoying
/// issues when interacting with Rust, where a struct with u128 would align 16. We replace all u128
/// in Kamino's original struct with [u8; 16], which aligns 1, to sidestep all of these issues,
/// rather than dealing with compiler voodo. Use a helper function to extract the actual u128 value.
#[derive(Debug, PartialEq, Pod, Zeroable, Copy, Clone)]
#[repr(C)]
pub struct MinimalObligation {
    pub tag: u64,
    pub last_update_slot: u64,            // 0x0
    pub last_update_stale: u8,            // 0x8
    pub last_update_price_status: u8,     // 0x9
    pub last_update_placeholder: [u8; 6], // 0xA

    pub lending_market: Pubkey, // 0x10
    pub owner: Pubkey,          // 0x30

    pub deposits: [MinimalObligationCollateral; 8], // 0x50
    pub lowest_reserve_deposit_liquidation_ltv: u64, // 0x498
    pub deposited_value_sf: [u8; 16],               // 0x4A0

    // Borrow fields: 1000 + 16 + 16 + 16 + 16 = 1064
    pub pad1: [u8; 1024],
    pub pad2: [u8; 32],
    pub pad3: [u8; 8],

    pub deposits_asset_tiers: [u8; 8], // 0x8D8
    // Borrow asset tiers
    pub pad4: [u8; 5],
    pub elevation_group: u8,          // 0x8E5
    pub num_of_obsolete_reserves: u8, // 0x8E6
    pub has_debt: u8,                 // 0x8E7
    pub referrer: Pubkey,             // 0x8E8

    pub pad5: [u8; 1024],
}

impl MinimalObligation {
    pub fn from_bytes(v: &[u8]) -> &Self {
        bytemuck::from_bytes(v)
    }

    pub fn deposited_value_sf(&self) -> u128 {
        u128::from_le_bytes(self.deposited_value_sf)
    }

    pub fn find_deposit_by_reserve(
        &self,
        reserve: &Pubkey,
    ) -> Option<(usize, &MinimalObligationCollateral)> {
        self.deposits
            .iter()
            .enumerate()
            .find(|&(_, deposit)| deposit.deposit_reserve.eq(reserve))
            .map(|(index, deposit)| (index, deposit))
    }

}

#[derive(Debug, Default, PartialEq, Eq)]
#[zero_copy]
#[repr(C)]
pub struct MinimalObligationCollateral {
    pub deposit_reserve: Pubkey,   // 0x0
    pub deposited_amount: u64,     // 0x20
    pub market_value_sf: [u8; 16], // 0x28
    pub borrowed_amount_against_this_collateral_in_elevation_group: u64, // 0x38
    pub padding: [u64; 9],         // 0x40 (fills remainder of the collateral struct)
}

impl MinimalObligationCollateral {
    pub fn from_bytes(v: &[u8]) -> &Self {
        bytemuck::from_bytes(v)
    }

    pub fn market_value_sf(&self) -> u128 {
        u128::from_le_bytes(self.market_value_sf)
    }
}

/// Converts a `[u8; 16]` representation back into a `u128`.
pub fn bytes_to_u128(bytes: [u8; 16]) -> u128 {
    u128::from_le_bytes(bytes)
}
