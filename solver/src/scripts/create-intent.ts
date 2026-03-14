/**
 * Utility script to create and sign a test intent.
 * Usage: npx tsx src/scripts/create-intent.ts
 *
 * Signs an EIP-712 intent and POSTs it to the solver API.
 */
import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config, polkadotTestnet } from "../config.js";
import { INTENT_TYPES, EIP712_DOMAIN } from "../types.js";

async function main() {
  // Use a separate maker key (or the same key for testing)
  const makerKey = (process.env.MAKER_PRIVATE_KEY ||
    config.privateKey) as `0x${string}`;
  const account = privateKeyToAccount(makerKey);

  const publicClient = createPublicClient({
    chain: polkadotTestnet,
    transport: http(config.rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain: polkadotTestnet,
    transport: http(config.rpcUrl),
  });

  // Example intent parameters
  const sellAsset = (process.env.SELL_ASSET ||
    "0x0000000000000000000000000000000000000000") as `0x${string}`;
  const buyAsset = (process.env.BUY_ASSET ||
    "0x0000000000000000000000000000000000000000") as `0x${string}`;
  const sellAmount = parseEther(process.env.SELL_AMOUNT || "10");
  const startBuyAmount = parseEther(process.env.START_BUY_AMOUNT || "12");
  const minBuyAmount = parseEther(process.env.MIN_BUY_AMOUNT || "9");
  const decayDuration = BigInt(process.env.DECAY_DURATION || "300"); // 5 minutes

  const now = BigInt(Math.floor(Date.now() / 1000));

  const intent = {
    maker: account.address,
    sellAsset,
    sellAmount,
    buyAsset,
    minBuyAmount,
    startBuyAmount,
    deadline: now + decayDuration,
    decayStartTime: now,
    nonce: BigInt(Math.floor(Math.random() * 1_000_000)),
    exclusiveFiller: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  };

  // Get chain ID for domain
  const chainId = await publicClient.getChainId();

  // Sign EIP-712 typed data
  const signature = await walletClient.signTypedData({
    domain: {
      ...EIP712_DOMAIN,
      chainId,
      verifyingContract: config.reactorAddress,
    },
    types: INTENT_TYPES,
    primaryType: "Intent",
    message: {
      maker: intent.maker,
      sellAsset: intent.sellAsset,
      sellAmount: intent.sellAmount,
      buyAsset: intent.buyAsset,
      minBuyAmount: intent.minBuyAmount,
      startBuyAmount: intent.startBuyAmount,
      deadline: intent.deadline,
      decayStartTime: intent.decayStartTime,
      nonce: intent.nonce,
      exclusiveFiller: intent.exclusiveFiller,
    },
  });

  console.log("=== Signed Intent ===");
  console.log("Maker:", intent.maker);
  console.log("Sell:", sellAmount.toString(), "of", sellAsset);
  console.log(
    "Buy:",
    startBuyAmount.toString(),
    "->",
    minBuyAmount.toString(),
    "of",
    buyAsset
  );
  console.log("Deadline:", intent.deadline.toString());
  console.log("Nonce:", intent.nonce.toString());
  console.log("Signature:", signature);

  // Submit to solver API
  const solverUrl = `http://localhost:${config.serverPort}/intents`;
  console.log(`\nSubmitting to solver at ${solverUrl}...`);

  const payload = {
    intent: {
      maker: intent.maker,
      sellAsset: intent.sellAsset,
      sellAmount: intent.sellAmount.toString(),
      buyAsset: intent.buyAsset,
      minBuyAmount: intent.minBuyAmount.toString(),
      startBuyAmount: intent.startBuyAmount.toString(),
      deadline: intent.deadline.toString(),
      decayStartTime: intent.decayStartTime.toString(),
      nonce: intent.nonce.toString(),
      exclusiveFiller: intent.exclusiveFiller,
    },
    signature,
  };

  try {
    const res = await fetch(solverUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    console.log("Response:", data);
  } catch (err) {
    console.log("Could not reach solver API. Intent data for manual use:");
    console.log(JSON.stringify(payload, null, 2));
  }
}

main().catch(console.error);
