import type { SignedIntent } from "./types.js";

/**
 * In-memory intent pool. Stores signed intents submitted by users
 * and provides methods for the solver to query fillable intents.
 */
export class IntentPool {
  private intents: Map<string, SignedIntent> = new Map();

  add(signedIntent: SignedIntent): void {
    this.intents.set(signedIntent.id, signedIntent);
    console.log(
      `[Pool] Added intent ${signedIntent.id} from ${signedIntent.intent.maker}`
    );
  }

  remove(id: string): void {
    this.intents.delete(id);
  }

  get(id: string): SignedIntent | undefined {
    return this.intents.get(id);
  }

  /** Get all intents that haven't expired yet */
  getActive(): SignedIntent[] {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const active: SignedIntent[] = [];

    for (const [id, signedIntent] of this.intents) {
      if (signedIntent.intent.deadline <= now) {
        // Expired — remove from pool
        this.intents.delete(id);
        console.log(`[Pool] Removed expired intent ${id}`);
      } else {
        active.push(signedIntent);
      }
    }

    return active;
  }

  size(): number {
    return this.intents.size;
  }
}
