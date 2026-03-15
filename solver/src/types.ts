export interface Intent {
  maker: `0x${string}`;
  sellAsset: `0x${string}`;
  sellAmount: bigint;
  buyAsset: `0x${string}`;
  minBuyAmount: bigint;
  startBuyAmount: bigint;
  deadline: bigint;
  decayStartTime: bigint;
  nonce: bigint;
  exclusiveFiller: `0x${string}`;
}

export interface SignedIntent {
  intent: Intent;
  signature: `0x${string}`;
  receivedAt: number;
  id: string;
}

export interface PrivateIntent {
  maker: `0x${string}`;
  commitment: `0x${string}`;
  deadline: bigint;
  nonce: bigint;
  exclusiveFiller: `0x${string}`;
}

export interface PrivateIntentReveal {
  commitment: `0x${string}`;
  sellAsset: `0x${string}`;
  sellAmount: bigint;
  buyAsset: `0x${string}`;
  minBuyAmount: bigint;
  salt: `0x${string}`;
}

export interface SignedPrivateIntent {
  intent: PrivateIntent;
  reveal: PrivateIntentReveal;
  signature: `0x${string}`;
  receivedAt: number;
  id: string;
}

// EIP-712 typed data for intent signing
export const INTENT_TYPES = {
  Intent: [
    { name: "maker", type: "address" },
    { name: "sellAsset", type: "address" },
    { name: "sellAmount", type: "uint256" },
    { name: "buyAsset", type: "address" },
    { name: "minBuyAmount", type: "uint256" },
    { name: "startBuyAmount", type: "uint256" },
    { name: "deadline", type: "uint256" },
    { name: "decayStartTime", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "exclusiveFiller", type: "address" },
  ],
} as const;

export const PRIVATE_INTENT_TYPES = {
  PrivateIntent: [
    { name: "maker", type: "address" },
    { name: "commitment", type: "bytes32" },
    { name: "deadline", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "exclusiveFiller", type: "address" },
  ],
} as const;

export const EIP712_DOMAIN = {
  name: "XCMIntents",
  version: "1",
} as const;
