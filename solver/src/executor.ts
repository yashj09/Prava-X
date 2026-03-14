import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
  type Transport,
  type Chain,
  type Account,
  formatEther,
  getContract,
  erc20Abi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config, polkadotTestnet } from "./config.js";
import type { SignedIntent } from "./types.js";
import { getCurrentPrice } from "./price.js";
import reactorAbi from "./abi/IntentReactor.json" with { type: "json" };

export class FillExecutor {
  private publicClient: PublicClient<Transport, Chain>;
  private walletClient: WalletClient<Transport, Chain, Account>;
  private account: Account;

  constructor() {
    this.account = privateKeyToAccount(config.privateKey);

    this.publicClient = createPublicClient({
      chain: polkadotTestnet,
      transport: http(config.rpcUrl),
    });

    this.walletClient = createWalletClient({
      account: this.account,
      chain: polkadotTestnet,
      transport: http(config.rpcUrl),
    });
  }

  get fillerAddress(): `0x${string}` {
    return this.account.address;
  }

  /** Ensure the solver has approved the reactor to spend buyAsset */
  async ensureApproval(
    tokenAddress: `0x${string}`,
    amount: bigint
  ): Promise<void> {
    const allowance = await this.publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "allowance",
      args: [this.account.address, config.reactorAddress],
    });

    if (allowance < amount) {
      console.log(
        `[Executor] Approving reactor to spend ${formatEther(amount)} of ${tokenAddress}`
      );
      const hash = await this.walletClient.writeContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [config.reactorAddress, amount * 10n], // Approve 10x for future fills
      });
      await this.publicClient.waitForTransactionReceipt({ hash });
      console.log(`[Executor] Approval tx confirmed: ${hash}`);
    }
  }

  /** Execute a same-chain fill */
  async fillIntent(signedIntent: SignedIntent): Promise<`0x${string}`> {
    const { intent, signature } = signedIntent;
    const currentPrice = getCurrentPrice(intent);

    console.log(
      `[Executor] Filling intent ${signedIntent.id}:`,
      `\n  Maker: ${intent.maker}`,
      `\n  Sell: ${formatEther(intent.sellAmount)} of ${intent.sellAsset}`,
      `\n  Buy price: ${formatEther(currentPrice)} of ${intent.buyAsset}`
    );

    // Ensure we have approval for buyAsset
    await this.ensureApproval(intent.buyAsset, currentPrice);

    // Convert intent to tuple format for the contract call
    const intentTuple = [
      intent.maker,
      intent.sellAsset,
      intent.sellAmount,
      intent.buyAsset,
      intent.minBuyAmount,
      intent.startBuyAmount,
      intent.deadline,
      intent.decayStartTime,
      intent.nonce,
      intent.exclusiveFiller,
    ] as const;

    const hash = await this.walletClient.writeContract({
      address: config.reactorAddress,
      abi: reactorAbi,
      functionName: "fillIntent",
      args: [intentTuple, signature],
    });

    console.log(`[Executor] Fill tx submitted: ${hash}`);

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    console.log(
      `[Executor] Fill tx confirmed in block ${receipt.blockNumber}:`,
      receipt.status === "success" ? "SUCCESS" : "REVERTED"
    );

    return hash;
  }

  /** Check solver's balance of a given token */
  async getBalance(tokenAddress: `0x${string}`): Promise<bigint> {
    return this.publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [this.account.address],
    });
  }

  /** Check if an intent's nonce has already been used */
  async isNonceUsed(
    maker: `0x${string}`,
    nonce: bigint
  ): Promise<boolean> {
    return this.publicClient.readContract({
      address: config.reactorAddress,
      abi: reactorAbi,
      functionName: "nonceUsed",
      args: [maker, nonce],
    }) as Promise<boolean>;
  }
}
