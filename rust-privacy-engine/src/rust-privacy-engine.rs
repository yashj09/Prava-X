//! XCM Intents Privacy Engine — Rust PVM Smart Contract
//!
//! Provides cryptographic commitment operations for the privacy-preserving
//! intent protocol. Called from Solidity via cross-VM calls.
//!
//! Functions:
//!   computeCommitment(bytes32,uint256,bytes32,uint256,bytes32) -> bytes32    [0x021a3010]
//!   verifyCommitment(bytes32,bytes32,uint256,bytes32,uint256,bytes32) -> bool [0x86984589]
//!   pedersenCommit(uint256,uint256) -> bytes32                               [0x6389eb7e]
//!   verifyPedersenCommitment(bytes32,uint256,uint256) -> bool                [0x5a5bd622]

#![no_main]
#![no_std]

extern crate alloc;

use ark_ec::CurveGroup;
use ark_ed_on_bls12_381::{EdwardsProjective as JubJub, Fr as JubJubScalar};
use ark_ff::PrimeField;
use blake2::{Blake2s256, Digest};
use pallet_revive_uapi::{HostFn, HostFnImpl as api, ReturnFlags};

// ---------------------------------------------------------------------------
// Bump allocator — required for arkworks (uses alloc internally)
// ---------------------------------------------------------------------------

struct BumpAllocator;

#[global_allocator]
static ALLOCATOR: BumpAllocator = BumpAllocator;

const HEAP_SIZE: usize = 65536; // 64 KB — same as Summa reference
static mut HEAP: [u8; HEAP_SIZE] = [0u8; HEAP_SIZE];
static mut HEAP_POS: usize = 0;

unsafe impl core::alloc::GlobalAlloc for BumpAllocator {
    unsafe fn alloc(&self, layout: core::alloc::Layout) -> *mut u8 {
        let align = layout.align();
        let size = layout.size();
        let aligned_pos = (unsafe { HEAP_POS } + align - 1) & !(align - 1);
        let new_pos = aligned_pos + size;
        if new_pos > HEAP_SIZE {
            core::ptr::null_mut()
        } else {
            unsafe { HEAP_POS = new_pos };
            unsafe { (core::ptr::addr_of_mut!(HEAP) as *mut u8).add(aligned_pos) }
        }
    }

    unsafe fn dealloc(&self, _ptr: *mut u8, _layout: core::alloc::Layout) {
        // Bump allocator: no deallocation. Memory resets between contract calls.
    }
}

/// Reset heap position for safety — ensures clean state each call.
fn reset_heap() {
    unsafe {
        HEAP_POS = 0;
    }
}

// ---------------------------------------------------------------------------
// Panic handler
// ---------------------------------------------------------------------------

#[panic_handler]
fn panic(_info: &core::panic::PanicInfo) -> ! {
    unsafe {
        core::arch::asm!("unimp");
        core::hint::unreachable_unchecked();
    }
}

// ---------------------------------------------------------------------------
// Selectors (Solidity-compatible keccak256 of function signatures)
// ---------------------------------------------------------------------------

/// computeCommitment(bytes32,uint256,bytes32,uint256,bytes32)
const SEL_COMPUTE: [u8; 4] = [0x02, 0x1a, 0x30, 0x10];

/// verifyCommitment(bytes32,bytes32,uint256,bytes32,uint256,bytes32)
const SEL_VERIFY: [u8; 4] = [0x86, 0x98, 0x45, 0x89];

/// pedersenCommit(uint256,uint256)
const SEL_PEDERSEN: [u8; 4] = [0x63, 0x89, 0xeb, 0x7e];

/// verifyPedersenCommitment(bytes32,uint256,uint256)
const SEL_VERIFY_PEDERSEN: [u8; 4] = [0x5a, 0x5b, 0xd6, 0x22];

// ---------------------------------------------------------------------------
// Calldata helpers
// ---------------------------------------------------------------------------

/// Read a 32-byte word from calldata buffer at the given word index (0-based).
/// Word 0 starts at byte offset 4 (after the 4-byte selector).
fn read_word(buf: &[u8], word_index: usize) -> [u8; 32] {
    let mut word = [0u8; 32];
    let start = 4 + word_index * 32;
    let end = start + 32;
    if end <= buf.len() {
        word.copy_from_slice(&buf[start..end]);
    }
    word
}

/// Encode a bool as a 32-byte ABI word (0 or 1 in the last byte).
fn bool_to_word(val: bool) -> [u8; 32] {
    let mut out = [0u8; 32];
    out[31] = val as u8;
    out
}

// ---------------------------------------------------------------------------
// "Nothing up my sleeve" second generator H for Pedersen commitments
// ---------------------------------------------------------------------------

/// Derive generator H by hashing a domain string to a JubJub scalar, then
/// multiplying by G. This ensures nobody knows log_G(H).
///
/// H = hash_to_scalar("XCM_Intents_Pedersen_H_v1") * G
fn pedersen_h() -> JubJub {
    use ark_ec::Group;
    let mut hasher = Blake2s256::new();
    hasher.update(b"XCM_Intents_Pedersen_H_v1");
    let hash = hasher.finalize();

    // Reduce hash bytes to a scalar (mod field order)
    let scalar = JubJubScalar::from_le_bytes_mod_order(&hash);

    // H = scalar * G
    JubJub::generator() * scalar
}

// ---------------------------------------------------------------------------
// Core cryptographic functions
// ---------------------------------------------------------------------------

/// Compute blake2s commitment: hash(sellAsset || sellAmount || buyAsset || minBuyAmount || salt)
///
/// All 5 params are 32-byte words concatenated = 160 bytes of input.
fn compute_commitment_hash(
    sell_asset: &[u8; 32],
    sell_amount: &[u8; 32],
    buy_asset: &[u8; 32],
    min_buy_amount: &[u8; 32],
    salt: &[u8; 32],
) -> [u8; 32] {
    let mut hasher = Blake2s256::new();
    hasher.update(sell_asset);
    hasher.update(sell_amount);
    hasher.update(buy_asset);
    hasher.update(min_buy_amount);
    hasher.update(salt);
    let result = hasher.finalize();
    let mut out = [0u8; 32];
    out.copy_from_slice(&result);
    out
}

/// Compute Pedersen commitment: C = value * G + blinding * H
///
/// Returns x-coordinate of the resulting curve point as bytes32.
fn compute_pedersen(value: &[u8; 32], blinding: &[u8; 32]) -> [u8; 32] {
    use ark_ec::Group;

    // Parse value and blinding as scalars (big-endian uint256 from Solidity)
    // Solidity sends big-endian, arkworks wants little-endian
    let mut value_le = *value;
    value_le.reverse();
    let v = JubJubScalar::from_le_bytes_mod_order(&value_le);

    let mut blinding_le = *blinding;
    blinding_le.reverse();
    let b = JubJubScalar::from_le_bytes_mod_order(&blinding_le);

    let g = JubJub::generator();
    let h = pedersen_h();

    // C = v*G + b*H
    let commitment = g * v + h * b;
    let affine = commitment.into_affine();

    // Return x-coordinate as 32 bytes (little-endian limbs → big-endian for Solidity)
    let bigint = affine.x.into_bigint();
    let limbs = bigint.0;
    let mut out = [0u8; 32];
    // Write limbs in little-endian first
    for (i, limb) in limbs.iter().enumerate() {
        let bytes = limb.to_le_bytes();
        let offset = i * 8;
        let end = core::cmp::min(offset + 8, 32);
        let copy_len = end - offset;
        out[offset..end].copy_from_slice(&bytes[..copy_len]);
    }
    // Reverse to big-endian for Solidity compatibility
    out.reverse();
    out
}

// ---------------------------------------------------------------------------
// Function handlers
// ---------------------------------------------------------------------------

/// computeCommitment(bytes32 sellAsset, uint256 sellAmount, bytes32 buyAsset,
///                   uint256 minBuyAmount, bytes32 salt) -> bytes32
///
/// Calldata: selector(4) + 5 words(160) = 164 bytes
fn handle_compute_commitment(buf: &[u8]) {
    let sell_asset = read_word(buf, 0);
    let sell_amount = read_word(buf, 1);
    let buy_asset = read_word(buf, 2);
    let min_buy_amount = read_word(buf, 3);
    let salt = read_word(buf, 4);

    let commitment = compute_commitment_hash(
        &sell_asset,
        &sell_amount,
        &buy_asset,
        &min_buy_amount,
        &salt,
    );
    api::return_value(ReturnFlags::empty(), &commitment);
}

/// verifyCommitment(bytes32 commitment, bytes32 sellAsset, uint256 sellAmount,
///                  bytes32 buyAsset, uint256 minBuyAmount, bytes32 salt) -> bool
///
/// Calldata: selector(4) + 6 words(192) = 196 bytes
fn handle_verify_commitment(buf: &[u8]) {
    let expected = read_word(buf, 0);
    let sell_asset = read_word(buf, 1);
    let sell_amount = read_word(buf, 2);
    let buy_asset = read_word(buf, 3);
    let min_buy_amount = read_word(buf, 4);
    let salt = read_word(buf, 5);

    let computed = compute_commitment_hash(
        &sell_asset,
        &sell_amount,
        &buy_asset,
        &min_buy_amount,
        &salt,
    );

    let matches = expected == computed;
    api::return_value(ReturnFlags::empty(), &bool_to_word(matches));
}

/// pedersenCommit(uint256 value, uint256 blinding) -> bytes32
///
/// Calldata: selector(4) + 2 words(64) = 68 bytes
fn handle_pedersen_commit(buf: &[u8]) {
    let value = read_word(buf, 0);
    let blinding = read_word(buf, 1);

    let commitment = compute_pedersen(&value, &blinding);
    api::return_value(ReturnFlags::empty(), &commitment);
}

/// verifyPedersenCommitment(bytes32 expected, uint256 value, uint256 blinding) -> bool
///
/// Calldata: selector(4) + 3 words(96) = 100 bytes
fn handle_verify_pedersen(buf: &[u8]) {
    let expected = read_word(buf, 0);
    let value = read_word(buf, 1);
    let blinding = read_word(buf, 2);

    let computed = compute_pedersen(&value, &blinding);

    let matches = expected == computed;
    api::return_value(ReturnFlags::empty(), &bool_to_word(matches));
}

// ---------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------

/// Constructor — called once on deployment. No initialization needed.
#[unsafe(no_mangle)]
#[polkavm_derive::polkavm_export]
pub extern "C" fn deploy() {}

/// Main dispatch — routes calls by 4-byte selector.
#[unsafe(no_mangle)]
#[polkavm_derive::polkavm_export]
pub extern "C" fn call() {
    reset_heap();

    // Read calldata into buffer
    let call_data_len = api::call_data_size();
    if call_data_len < 4 {
        api::return_value(ReturnFlags::REVERT, &[]);
    }

    // Max calldata we expect: selector(4) + 6 words(192) = 196 bytes
    let mut buf = [0u8; 256];
    let read_len = core::cmp::min(call_data_len as usize, buf.len());
    api::call_data_copy(&mut buf[..read_len], 0);

    let selector = [buf[0], buf[1], buf[2], buf[3]];

    match selector {
        SEL_COMPUTE => handle_compute_commitment(&buf[..read_len]),
        SEL_VERIFY => handle_verify_commitment(&buf[..read_len]),
        SEL_PEDERSEN => handle_pedersen_commit(&buf[..read_len]),
        SEL_VERIFY_PEDERSEN => handle_verify_pedersen(&buf[..read_len]),
        _ => api::return_value(ReturnFlags::REVERT, &[]),
    }
}
