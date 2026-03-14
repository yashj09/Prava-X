import { IntentPool } from "./intent-pool.js";
import { FillExecutor } from "./executor.js";
import { isProfitable } from "./price.js";
import { createApi } from "./api.js";
import { config } from "./config.js";

async function main() {
  console.log("=== XCM Intents Solver ===");
  console.log(`Reactor: ${config.reactorAddress}`);
  console.log(`Poll interval: ${config.pollIntervalMs}ms`);
  console.log(`Min profit: ${config.minProfitBps} bps`);

  const pool = new IntentPool();
  const executor = new FillExecutor();

  console.log(`Solver address: ${executor.fillerAddress}`);

  // Start API server for intent submissions
  createApi(pool, config.serverPort);

  // Main solver loop
  console.log("[Solver] Starting fill loop...");

  setInterval(async () => {
    const activeIntents = pool.getActive();
    if (activeIntents.length === 0) return;

    for (const signedIntent of activeIntents) {
      const { intent } = signedIntent;

      // Skip if exclusive to another filler
      if (
        intent.exclusiveFiller !== "0x0000000000000000000000000000000000000000" &&
        intent.exclusiveFiller.toLowerCase() !==
          executor.fillerAddress.toLowerCase()
      ) {
        continue;
      }

      // Check profitability
      const { profitable, currentPrice, profit } = isProfitable(
        intent,
        config.minProfitBps
      );

      if (!profitable) {
        continue;
      }

      console.log(
        `[Solver] Profitable intent found: ${signedIntent.id}`,
        `\n  Current price: ${currentPrice}`,
        `\n  Estimated profit: ${profit}`
      );

      // Check on-chain if nonce already used
      const nonceUsed = await executor.isNonceUsed(
        intent.maker,
        intent.nonce
      );
      if (nonceUsed) {
        console.log(
          `[Solver] Nonce ${intent.nonce} already used, removing from pool`
        );
        pool.remove(signedIntent.id);
        continue;
      }

      // Check solver has enough buyAsset balance
      const balance = await executor.getBalance(intent.buyAsset);
      if (balance < currentPrice) {
        console.log(
          `[Solver] Insufficient balance for ${intent.buyAsset}: have ${balance}, need ${currentPrice}`
        );
        continue;
      }

      // Execute fill
      try {
        const txHash = await executor.fillIntent(signedIntent);
        console.log(`[Solver] Fill successful: ${txHash}`);
        pool.remove(signedIntent.id);
      } catch (err) {
        console.error(`[Solver] Fill failed for ${signedIntent.id}:`, err);
        // Don't remove from pool — might be a transient error
      }
    }
  }, config.pollIntervalMs);
}

main().catch(console.error);
