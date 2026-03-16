//! XCM Intents Privacy Engine — Rust PVM Smart Contract
//!
//! Provides cryptographic commitment operations for the privacy-preserving
//! intent protocol. Called from Solidity via cross-VM calls.
//!
//! Uses the PVM host function `hash_keccak_256` for hashing — this runs
//! natively on the host, avoiding BasicBlockTooLarge limits that affect
//! in-contract hash implementations (blake2, sha2).
//!
//! Functions:
//!   computeCommitment(bytes32,uint256,bytes32,uint256,bytes32) -> bytes32    [0x021a3010]
//!   verifyCommitment(bytes32,bytes32,uint256,bytes32,uint256,bytes32) -> bool [0x86984589]
//!   pedersenCommit(uint256,uint256) -> bytes32                               [0x6389eb7e]
//!   verifyPedersenCommitment(bytes32,uint256,uint256) -> bool                [0x5a5bd622]

#![no_main]
#![no_std]

extern crate alloc;

use pallet_revive_uapi::{HostFn, HostFnImpl as api, ReturnFlags};

// ---------------------------------------------------------------------------
// Bump allocator — required for alloc crate on PVM
// ---------------------------------------------------------------------------

struct BumpAllocator;

#[global_allocator]
static ALLOCATOR: BumpAllocator = BumpAllocator;

const HEAP_SIZE: usize = 65536;
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

    unsafe fn dealloc(&self, _ptr: *mut u8, _layout: core::alloc::Layout) {}
}

fn reset_heap() {
    unsafe { HEAP_POS = 0; }
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
// Selectors (keccak256 of Solidity function signatures)
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

fn read_word(buf: &[u8], word_index: usize) -> [u8; 32] {
    let mut word = [0u8; 32];
    let start = 4 + word_index * 32;
    let end = start + 32;
    if end <= buf.len() {
        word.copy_from_slice(&buf[start..end]);
    }
    word
}

fn bool_to_word(val: bool) -> [u8; 32] {
    let mut out = [0u8; 32];
    out[31] = val as u8;
    out
}

// ---------------------------------------------------------------------------
// Core cryptographic functions
// ---------------------------------------------------------------------------

/// Compute commitment: keccak256(sellAsset || sellAmount || buyAsset || minBuyAmount || salt)
///
/// Uses the PVM host function for keccak256 — executes natively on the host,
/// not inside the PVM sandbox. This avoids BasicBlockTooLarge limits.
fn compute_commitment_hash(
    sell_asset: &[u8; 32],
    sell_amount: &[u8; 32],
    buy_asset: &[u8; 32],
    min_buy_amount: &[u8; 32],
    salt: &[u8; 32],
) -> [u8; 32] {
    // Concatenate all 5 words: 160 bytes
    let mut input = [0u8; 160];
    input[0..32].copy_from_slice(sell_asset);
    input[32..64].copy_from_slice(sell_amount);
    input[64..96].copy_from_slice(buy_asset);
    input[96..128].copy_from_slice(min_buy_amount);
    input[128..160].copy_from_slice(salt);

    let mut out = [0u8; 32];
    api::hash_keccak_256(&input, &mut out);
    out
}

/// Pedersen-like commitment using keccak256: hash("pedersen" || value || blinding)
///
/// This is a hash-based commitment that provides the same hiding/binding
/// properties as Pedersen for our use case (commit-reveal for MEV protection).
/// Real EC Pedersen (arkworks on JubJub) compiles to PVM but exceeds
/// BasicBlockTooLarge at deployment — a known PVM limitation.
fn compute_pedersen(value: &[u8; 32], blinding: &[u8; 32]) -> [u8; 32] {
    // Domain-separated: keccak256("XCM_Intents_Pedersen_v1" || value || blinding)
    let domain = b"XCM_Intents_Pedersen_v1";
    let mut input = [0u8; 23 + 32 + 32]; // 87 bytes
    input[0..23].copy_from_slice(domain);
    input[23..55].copy_from_slice(value);
    input[55..87].copy_from_slice(blinding);

    let mut out = [0u8; 32];
    api::hash_keccak_256(&input, &mut out);
    out
}

// ---------------------------------------------------------------------------
// Function handlers
// ---------------------------------------------------------------------------

fn handle_compute_commitment(buf: &[u8]) {
    let sell_asset = read_word(buf, 0);
    let sell_amount = read_word(buf, 1);
    let buy_asset = read_word(buf, 2);
    let min_buy_amount = read_word(buf, 3);
    let salt = read_word(buf, 4);

    let commitment = compute_commitment_hash(
        &sell_asset, &sell_amount, &buy_asset, &min_buy_amount, &salt,
    );
    api::return_value(ReturnFlags::empty(), &commitment);
}

fn handle_verify_commitment(buf: &[u8]) {
    let expected = read_word(buf, 0);
    let sell_asset = read_word(buf, 1);
    let sell_amount = read_word(buf, 2);
    let buy_asset = read_word(buf, 3);
    let min_buy_amount = read_word(buf, 4);
    let salt = read_word(buf, 5);

    let computed = compute_commitment_hash(
        &sell_asset, &sell_amount, &buy_asset, &min_buy_amount, &salt,
    );
    api::return_value(ReturnFlags::empty(), &bool_to_word(expected == computed));
}

fn handle_pedersen_commit(buf: &[u8]) {
    let value = read_word(buf, 0);
    let blinding = read_word(buf, 1);

    let commitment = compute_pedersen(&value, &blinding);
    api::return_value(ReturnFlags::empty(), &commitment);
}

fn handle_verify_pedersen(buf: &[u8]) {
    let expected = read_word(buf, 0);
    let value = read_word(buf, 1);
    let blinding = read_word(buf, 2);

    let computed = compute_pedersen(&value, &blinding);
    api::return_value(ReturnFlags::empty(), &bool_to_word(expected == computed));
}

// ---------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------

#[unsafe(no_mangle)]
#[polkavm_derive::polkavm_export]
pub extern "C" fn deploy() {}

#[unsafe(no_mangle)]
#[polkavm_derive::polkavm_export]
pub extern "C" fn call() {
    reset_heap();

    let call_data_len = api::call_data_size();
    if call_data_len < 4 {
        api::return_value(ReturnFlags::REVERT, &[]);
    }

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
