export const CONTRACTS = {
  privacyEngine: (process.env.NEXT_PUBLIC_PRIVACY_ENGINE_ADDRESS ??
    "0x0000000000000000000000000000000000000000") as `0x${string}`,
  intentReactor: (process.env.NEXT_PUBLIC_INTENT_REACTOR_ADDRESS ??
    "0x0000000000000000000000000000000000000000") as `0x${string}`,
  escrowVault: (process.env.NEXT_PUBLIC_ESCROW_VAULT_ADDRESS ??
    "0x0000000000000000000000000000000000000000") as `0x${string}`,
  solverRegistry: (process.env.NEXT_PUBLIC_SOLVER_REGISTRY_ADDRESS ??
    "0x0000000000000000000000000000000000000000") as `0x${string}`,
  mockUsdc: (process.env.NEXT_PUBLIC_MOCK_USDC_ADDRESS ??
    "0x0000000000000000000000000000000000000000") as `0x${string}`,
  mockDot: (process.env.NEXT_PUBLIC_MOCK_DOT_ADDRESS ??
    "0x0000000000000000000000000000000000000000") as `0x${string}`,
} as const;

// Only ERC20 tokens for intents (native PAS can't be used with safeTransferFrom)
export const TOKENS = [
  {
    symbol: "USDC",
    name: "Mock USDC",
    address: CONTRACTS.mockUsdc,
    decimals: 6,
  },
  {
    symbol: "DOT",
    name: "Mock DOT",
    address: CONTRACTS.mockDot,
    decimals: 18,
  },
] as const;
