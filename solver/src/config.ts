import { defineChain } from "viem";
import dotenv from "dotenv";

dotenv.config();

export const polkadotTestnet = defineChain({
  id: 420420417,
  name: "Polkadot Hub TestNet",
  nativeCurrency: { name: "PAS", symbol: "PAS", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://services.polkadothub-rpc.com/testnet"],
    },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://blockscout-testnet.polkadot.io",
    },
  },
});

export const config = {
  rpcUrl:
    process.env.RPC_URL || "https://services.polkadothub-rpc.com/testnet",
  privateKey: process.env.PRIVATE_KEY as `0x${string}`,
  reactorAddress: process.env.REACTOR_ADDRESS as `0x${string}`,
  // Solver settings
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS) || 3000,
  minProfitBps: Number(process.env.MIN_PROFIT_BPS) || 50, // 0.5% min profit
  serverPort: Number(process.env.SERVER_PORT) || 3001,
};
