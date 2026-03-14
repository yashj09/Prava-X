import type { Intent } from "./types.js";

/**
 * Calculate the current Dutch auction price for an intent.
 * Mirrors the Solidity logic in IntentLib.currentPrice().
 */
export function getCurrentPrice(intent: Intent): bigint {
  const now = BigInt(Math.floor(Date.now() / 1000));

  if (now <= intent.decayStartTime) {
    return intent.startBuyAmount;
  }

  if (now >= intent.deadline) {
    return intent.minBuyAmount;
  }

  const elapsed = now - intent.decayStartTime;
  const duration = intent.deadline - intent.decayStartTime;
  const priceDrop = intent.startBuyAmount - intent.minBuyAmount;

  const decay = (priceDrop * elapsed) / duration;
  return intent.startBuyAmount - decay;
}

/**
 * Simple mock price feed for hackathon demo.
 * In production, this would query DEX pools, oracles, etc.
 * Returns the "market rate" — how much buyAsset you'd need to spend
 * to acquire sellAmount of sellAsset.
 */
export function getMarketPrice(
  _sellAsset: `0x${string}`,
  _sellAmount: bigint,
  _buyAsset: `0x${string}`
): bigint {
  // For demo: return a fixed rate. In production, query HydraDX Omnipool,
  // Asset Hub asset-conversion pallet, or external price APIs.
  // Assume 1:1 rate for same-value assets as a baseline.
  return _sellAmount;
}

/**
 * Check if filling an intent is profitable for the solver.
 * The solver receives sellAsset and pays currentPrice of buyAsset.
 * Profit = market value of sellAsset in buyAsset terms - currentPrice.
 */
export function isProfitable(
  intent: Intent,
  minProfitBps: number
): { profitable: boolean; currentPrice: bigint; profit: bigint } {
  const currentPrice = getCurrentPrice(intent);
  const marketValue = getMarketPrice(
    intent.sellAsset,
    intent.sellAmount,
    intent.buyAsset
  );

  // Profit: we get sellAsset worth `marketValue` in buyAsset terms,
  // and we pay `currentPrice` in buyAsset
  const profit = marketValue - currentPrice;

  // Check minimum profit threshold
  const minProfit = (marketValue * BigInt(minProfitBps)) / 10000n;
  const profitable = profit >= minProfit;

  return { profitable, currentPrice, profit };
}
