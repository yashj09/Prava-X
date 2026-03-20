# Prava X

Prava X is a privacy-first cross-chain intents product on Polkadot Hub.

Under the hood, it uses a dual-VM design:

- Solidity handles intent creation, settlement, staking, and escrow
- Rust PolkaVM handles private intent verification

The goal is simple: let users express intents without exposing trade parameters
up front.

## What It Does

- Public intents can be signed off-chain with EIP-712
- Private intents store only a commitment on-chain
- Solvers fill intents and provide buy-side liquidity
- Rust PolkaVM verifies private reveals against the original commitment
- Cross-chain fills can use escrow plus the XCM precompile

## Core Components

- `src/IntentReactor.sol`
  Core contract for intent lifecycle, fills, and privacy verification flow
- `src/SolverRegistry.sol`
  Native PAS staking, activation, unstaking, and slashing hooks
- `src/EscrowVault.sol`
  Escrow used for cross-chain settlement flows
- `rust-privacy-engine/src/rust-privacy-engine.rs`
  Rust PolkaVM contract for commitment computation and verification
- `solver/`
  Off-chain solver service
- `frontend/`
  Next.js app for creating and filling intents

## High-Level Flow

```text
Maker creates an intent
  -> Public: sign off-chain
  -> Private: sign, then submit commitment on-chain
Solver fills the intent
  -> Private fills call Rust PolkaVM for verification
Settlement completes on Solidity
  -> XCM path uses escrow + precompile
```

## Local Development

### Requirements

- Foundry
- Rust
- Node.js

### Build Contracts

```bash
forge build
cd rust-privacy-engine && cargo build --release
```

### Deploy

```bash
export ETH_RPC_URL="https://services.polkadothub-rpc.com/testnet"

PRIVACY_ENGINE=$(cast send --account dev --create \
  "$(xxd -p -c 99999 rust-privacy-engine/target/rust-privacy-engine.release.polkavm)" \
  --json | jq -r .contractAddress)

PRIVACY_ENGINE_ADDRESS=$PRIVACY_ENGINE forge script script/Deploy.s.sol \
  --rpc-url $ETH_RPC_URL --broadcast
```

### Run Frontend

```bash
cd frontend
npm install
npm run dev
```

### Run Solver

```bash
cd solver
npm install
npm run dev
```

## Network

- Polkadot Hub TestNet
- RPC: `https://services.polkadothub-rpc.com/testnet`
- Chain ID: `420420417`

## Repo Layout

```text
src/                  Solidity contracts
rust-privacy-engine/  Rust PolkaVM verifier
frontend/             Web app
solver/               Off-chain solver
script/               Deployment scripts
docs/                 Supporting docs
```

## License

MIT
