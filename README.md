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

<img width="2560" height="1440" alt="Screenshot 2026-03-20 at 4 11 04 AM" src="https://github.com/user-attachments/assets/711267c9-80ed-460e-b7ca-143436de42b6" />

<img width="1406" height="1052" alt="Screenshot 2026-03-20 at 5 08 08 PM" src="https://github.com/user-attachments/assets/17065b2b-29ca-4bc8-b5c6-17f0ba4a329a" />


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

## Deployed Addresses

Current Polkadot Hub TestNet addresses used by the frontend:

| Component | Address | Explorer |
| --- | --- | --- |
| Privacy Engine | `0x3121f213e88cf5b2b02e330c98a92a19ee81a3d6` | [View](https://blockscout-testnet.polkadot.io/address/0x3121f213e88cf5b2b02e330c98a92a19ee81a3d6) |
| Intent Reactor | `0x02da54F6Af05423D3441166FDf4c779BD5911E7c` | [View](https://blockscout-testnet.polkadot.io/address/0x02da54F6Af05423D3441166FDf4c779BD5911E7c) |
| Escrow Vault | `0xA4093fDcfFe5e37554B55840aB77EC6f23CEFc8F` | [View](https://blockscout-testnet.polkadot.io/address/0xA4093fDcfFe5e37554B55840aB77EC6f23CEFc8F) |
| Solver Registry | `0x5db591fad47489c144737209969c6F055869F5C1` | [View](https://blockscout-testnet.polkadot.io/address/0x5db591fad47489c144737209969c6F055869F5C1) |
| Mock USDC | `0xFAD89510E5D1c3624C05053c1752B06a2D255387` | [View](https://blockscout-testnet.polkadot.io/address/0xFAD89510E5D1c3624C05053c1752B06a2D255387) |
| Mock DOT | `0x8D6350aDC02B2D9c181D6b475439A14B6067eA83` | [View](https://blockscout-testnet.polkadot.io/address/0x8D6350aDC02B2D9c181D6b475439A14B6067eA83) |
| Solver Wallet | `0x271ADdfC96533Ec92C0Eb905eAAab6f68040db06` | [View](https://blockscout-testnet.polkadot.io/address/0x271ADdfC96533Ec92C0Eb905eAAab6f68040db06) |

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
