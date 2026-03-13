import express from "express";
import { randomBytes } from "crypto";
import type { IntentPool } from "./intent-pool.js";
import type { SignedIntent, Intent } from "./types.js";
import { getCurrentPrice } from "./price.js";

/**
 * HTTP API for users to submit signed intents.
 * In production this could be a P2P gossip network, but for the hackathon
 * a simple REST API is cleaner and easier to demo.
 */
export function createApi(pool: IntentPool, port: number) {
  const app = express();
  app.use(express.json());

  // Submit a signed intent
  app.post("/intents", (req, res) => {
    try {
      const { intent, signature } = req.body;

      // Parse bigint fields from strings
      const parsedIntent: Intent = {
        maker: intent.maker,
        sellAsset: intent.sellAsset,
        sellAmount: BigInt(intent.sellAmount),
        buyAsset: intent.buyAsset,
        minBuyAmount: BigInt(intent.minBuyAmount),
        startBuyAmount: BigInt(intent.startBuyAmount),
        deadline: BigInt(intent.deadline),
        decayStartTime: BigInt(intent.decayStartTime),
        nonce: BigInt(intent.nonce),
        exclusiveFiller: intent.exclusiveFiller,
      };

      const id = randomBytes(16).toString("hex");
      const signedIntent: SignedIntent = {
        intent: parsedIntent,
        signature,
        receivedAt: Date.now(),
        id,
      };

      pool.add(signedIntent);
      res.json({ id, status: "accepted" });
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  // Get all active intents
  app.get("/intents", (_req, res) => {
    const active = pool.getActive();
    const response = active.map((si) => ({
      id: si.id,
      maker: si.intent.maker,
      sellAsset: si.intent.sellAsset,
      sellAmount: si.intent.sellAmount.toString(),
      buyAsset: si.intent.buyAsset,
      minBuyAmount: si.intent.minBuyAmount.toString(),
      startBuyAmount: si.intent.startBuyAmount.toString(),
      currentPrice: getCurrentPrice(si.intent).toString(),
      deadline: si.intent.deadline.toString(),
      nonce: si.intent.nonce.toString(),
    }));
    res.json(response);
  });

  // Get solver status
  app.get("/status", (_req, res) => {
    res.json({
      poolSize: pool.size(),
      activeIntents: pool.getActive().length,
      uptime: process.uptime(),
    });
  });

  app.listen(port, () => {
    console.log(`[API] Solver API listening on http://localhost:${port}`);
  });

  return app;
}
