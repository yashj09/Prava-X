"use client";

import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { formatEther, erc20Abi, maxUint256 } from "viem";
import { toast } from "sonner";
import { useSolverStake, useSolverInfo, useTokenBalance } from "../../config/hooks";
import { CONTRACTS } from "../../config/contracts";
import { polkadotHub } from "../../config/wagmi";
import { useIntentStore, updateIntentStatus, type SignedIntent } from "./IntentBook";
import intentReactorAbi from "../../config/abi/IntentReactor.json";

export function SolverPanel() {
  const { address, isConnected } = useAccount();
  const [stakeAmount, setStakeAmount] = useState("");
  const [activeTab, setActiveTab] = useState<"stake" | "fill">("stake");
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [fillStatus, setFillStatus] = useState<Record<string, "idle" | "filling" | "filled" | "error">>({});
  const [fillTxHash, setFillTxHash] = useState<Record<string, string>>({});
  const { stake, isPending: isStaking } = useSolverStake();
  const { stake: onChainStake, isActive, refetch: refetchSolver } = useSolverInfo(address);
  const pasBalance = useTokenBalance(address, "PAS");
  const usdcBalance = useTokenBalance(address, "USDC");
  const dotBalance = useTokenBalance(address, "DOT");
  const { intents } = useIntentStore();
  const { writeContractAsync } = useWriteContract();

  const stakedAmount = onChainStake ? formatEther(onChainStake) : "0";
  const isActiveSolver = isActive === true;

  const now = Math.floor(Date.now() / 1000);
  const fillableIntents = intents.filter((i) => i.status !== "filled" && i.deadline > now);

  const handleStake = async () => {
    if (!stakeAmount || !isConnected) return;
    setTxStatus("pending");
    try {
      await stake(stakeAmount);
      setStakeAmount("");
      setTxStatus("success");
      setTimeout(() => {
        refetchSolver();
        pasBalance.refetch();
      }, 2000);
      setTimeout(() => setTxStatus("idle"), 3000);
    } catch (err) {
      console.error("Stake failed:", err);
      setTxStatus("error");
      setTimeout(() => setTxStatus("idle"), 3000);
    }
  };

  const handleFill = async (intent: SignedIntent) => {
    if (!intent.raw || !isConnected) return;
    if (fillStatus[intent.id] === "filling") return;
    const r = intent.raw;

    setFillStatus((prev) => ({ ...prev, [intent.id]: "filling" }));

    try {
      // Approve reactor to spend solver's buyAsset tokens
      await writeContractAsync({
        address: r.buyAssetAddr as `0x${string}`,
        abi: erc20Abi,
        functionName: "approve",
        args: [CONTRACTS.intentReactor, maxUint256],
        chainId: polkadotHub.id,
      });

      let txHash: string | undefined;

      if (intent.isPrivate) {
        txHash = await writeContractAsync({
          address: CONTRACTS.intentReactor,
          abi: intentReactorAbi,
          functionName: "fillPrivateIntent",
          args: [
            r.commitment,
            r.sellAssetAddr,
            BigInt(r.sellAmountWei),
            r.buyAssetAddr,
            BigInt(r.minBuyAmountWei),
            r.salt,
          ],
          chainId: polkadotHub.id,
        });
      } else {
        const intentTuple = [
          r.maker,
          r.sellAssetAddr,
          BigInt(r.sellAmountWei),
          r.buyAssetAddr,
          BigInt(r.minBuyAmountWei),
          BigInt(r.startBuyAmountWei),
          BigInt(intent.deadline),
          BigInt(r.decayStartTime),
          BigInt(r.nonce),
          r.exclusiveFiller,
        ] as const;

        txHash = await writeContractAsync({
          address: CONTRACTS.intentReactor,
          abi: intentReactorAbi,
          functionName: "fillIntent",
          args: [intentTuple, intent.signature],
          chainId: polkadotHub.id,
        });
      }

      setFillStatus((prev) => ({ ...prev, [intent.id]: "filled" }));
      if (txHash) setFillTxHash((prev) => ({ ...prev, [intent.id]: txHash }));
      updateIntentStatus(intent.id, "filled");

      // Toast with block explorer link
      if (txHash) {
        const explorerUrl = `https://blockscout-testnet.polkadot.io/tx/${txHash}`;
        toast.success("Intent Filled", {
          description: `${intent.isPrivate ? "Private intent" : `${intent.sellAmount} ${intent.sellAsset} → ${intent.buyAmount} ${intent.buyAsset}`} filled successfully.`,
          action: {
            label: "View on Explorer",
            onClick: () => window.open(explorerUrl, "_blank"),
          },
          duration: 10000,
        });
      }

      // Refetch balances after a short delay for chain confirmation
      setTimeout(() => {
        usdcBalance.refetch();
        dotBalance.refetch();
        pasBalance.refetch();
      }, 2000);
    } catch (err) {
      console.error("Fill failed:", err);
      toast.error("Fill Failed", {
        description: err instanceof Error ? err.message.slice(0, 100) : "Transaction reverted. Check console for details.",
        duration: 6000,
      });
      setFillStatus((prev) => ({ ...prev, [intent.id]: "error" }));
      setTimeout(() => {
        setFillStatus((prev) => ({ ...prev, [intent.id]: "idle" }));
      }, 3000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Solver status card */}
      <div className="glass-static rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-[family-name:var(--font-display)] text-base font-bold">
            Solver Dashboard
          </h3>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
            isActiveSolver ? "bg-success/10" : "bg-foreground/5"
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isActiveSolver ? "bg-success" : "bg-muted-light"}`} />
            <span className={`text-[11px] font-medium font-[family-name:var(--font-body)] ${
              isActiveSolver ? "text-success" : "text-muted"
            }`}>
              {isActiveSolver ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-xl bg-foreground/[0.02] border border-foreground/5">
            <div className="text-[11px] text-muted mb-1 font-[family-name:var(--font-body)] uppercase tracking-wider">
              Staked
            </div>
            <div className="font-[family-name:var(--font-display)] text-lg font-bold text-polkadot">
              {parseFloat(stakedAmount).toFixed(2)} PAS
            </div>
          </div>
          <div className="p-3 rounded-xl bg-foreground/[0.02] border border-foreground/5">
            <div className="text-[11px] text-muted mb-1 font-[family-name:var(--font-body)] uppercase tracking-wider">
              Wallet Balance
            </div>
            <div className="font-[family-name:var(--font-display)] text-lg font-bold text-foreground">
              {pasBalance.formatted ? parseFloat(pasBalance.formatted).toFixed(2) : "—"} PAS
            </div>
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl bg-foreground/[0.03] border border-foreground/5">
        {(["stake", "fill"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 h-9 rounded-lg text-xs font-semibold font-[family-name:var(--font-display)] transition-all cursor-pointer ${
              activeTab === tab
                ? "bg-white text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            {tab === "stake" ? "Stake PAS" : `Fill Intents${fillableIntents.length > 0 ? ` (${fillableIntents.length})` : ""}`}
          </button>
        ))}
      </div>

      {/* Stake panel */}
      {activeTab === "stake" && (
        <div className="glass-static rounded-2xl p-6 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-medium text-muted font-[family-name:var(--font-body)] uppercase tracking-wider">
                Stake Amount (PAS)
              </label>
              {isConnected && pasBalance.formatted && (
                <button
                  type="button"
                  onClick={() => {
                    const max = Math.max(0, parseFloat(pasBalance.formatted!) - 0.1);
                    setStakeAmount(max > 0 ? max.toString() : "0");
                  }}
                  className="text-[10px] font-bold text-polkadot px-1.5 py-0.5 rounded bg-polkadot/8 hover:bg-polkadot/15 transition-colors cursor-pointer"
                >
                  MAX
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                placeholder="0.00"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                className="flex-1 bg-transparent text-2xl font-[family-name:var(--font-display)] font-bold outline-none placeholder:text-foreground/15 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-sm font-medium text-muted font-[family-name:var(--font-display)]">
                PAS
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-polkadot-subtle/50 text-xs text-muted leading-relaxed font-[family-name:var(--font-body)]">
            <div className="flex items-start gap-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-polkadot shrink-0 mt-0.5">
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1" />
                <path d="M7 5V7.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                <circle cx="7" cy="9.5" r="0.5" fill="currentColor" />
              </svg>
              <span>
                Minimum stake: <strong>0.1 PAS</strong>. Unstaking requires a 1-hour delay.
                Failed fills result in 10% slash of staked amount.
              </span>
            </div>
          </div>

          {txStatus === "success" && (
            <div className="p-3 rounded-xl bg-success/10 text-xs text-success font-medium font-[family-name:var(--font-body)] flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7L6 10L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Stake transaction confirmed
            </div>
          )}

          {txStatus === "error" && (
            <div className="p-3 rounded-xl bg-danger/10 text-xs text-danger font-medium font-[family-name:var(--font-body)]">
              Stake transaction failed. Please try again.
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleStake}
              disabled={isStaking || !isConnected || !stakeAmount || parseFloat(stakeAmount || "0") < 0.1}
              className="flex-1 h-12 rounded-xl bg-polkadot text-white font-[family-name:var(--font-display)] font-bold text-sm transition-all hover:bg-polkadot-dark hover:shadow-lg hover:shadow-polkadot/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStaking ? "Confirming..." : !isConnected ? "Connect Wallet" : "Stake PAS"}
            </button>
            <button
              disabled={!isActiveSolver}
              className="h-12 px-6 rounded-xl border border-foreground/10 text-foreground font-[family-name:var(--font-display)] font-medium text-sm transition-all hover:border-polkadot/30 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Unstake
            </button>
          </div>
        </div>
      )}

      {/* Fill panel */}
      {activeTab === "fill" && (
        <>
          {!isActiveSolver ? (
            <div className="glass-static rounded-2xl p-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-foreground/[0.03] border border-foreground/5 flex items-center justify-center mx-auto">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-muted-light">
                  <path d="M12 2L22 7V17L12 22L2 17V7L12 2Z" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
              <div>
                <h4 className="font-[family-name:var(--font-display)] text-sm font-semibold text-foreground mb-1">
                  Become a solver first
                </h4>
                <p className="text-xs text-muted font-[family-name:var(--font-body)] max-w-xs mx-auto leading-relaxed">
                  Stake at least 0.1 PAS to become an active solver and start filling intents.
                </p>
              </div>
            </div>
          ) : fillableIntents.length === 0 ? (
            <div className="glass-static rounded-2xl p-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-foreground/[0.03] border border-foreground/5 flex items-center justify-center mx-auto">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-muted-light">
                  <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M8 10H16M8 14H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <h4 className="font-[family-name:var(--font-display)] text-sm font-semibold text-foreground mb-1">
                  No fillable intents
                </h4>
                <p className="text-xs text-muted font-[family-name:var(--font-body)] max-w-xs mx-auto leading-relaxed">
                  Create an intent first, then come back here to fill it.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Self-fill info */}
              {address && fillableIntents.some((i) => i.raw?.maker?.toLowerCase() === address.toLowerCase()) && (
                <div className="p-3 rounded-xl bg-polkadot-subtle/50 text-xs text-muted leading-relaxed font-[family-name:var(--font-body)]">
                  <div className="flex items-start gap-2">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-polkadot shrink-0 mt-0.5">
                      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1" />
                      <path d="M7 5V7.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                      <circle cx="7" cy="9.5" r="0.5" fill="currentColor" />
                    </svg>
                    <span>
                      <strong>Demo mode:</strong> You are filling your own intents. Since maker and solver are the same wallet,
                      token balances won&apos;t change (tokens transfer to yourself). In production, a different solver would fill these.
                    </span>
                  </div>
                </div>
              )}

              {fillableIntents.map((intent) => {
                const timeLeft = intent.deadline - now;
                const timeStr = timeLeft < 60 ? `${timeLeft}s` : `${Math.floor(timeLeft / 60)}m`;
                const status = fillStatus[intent.id] || "idle";
                const txHash = fillTxHash[intent.id];
                const hasRawData = !!intent.raw;
                return (
                  <div
                    key={intent.id}
                    className={`glass-static rounded-xl p-4 space-y-3 ${
                      intent.isPrivate ? "animate-border" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-[11px] text-muted-light font-[family-name:var(--font-body)]">
                            {intent.id}
                          </code>
                          {intent.isPrivate && (
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-polkadot/8">
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-polkadot">
                                <rect x="1" y="4.5" width="8" height="4.5" rx="1" stroke="currentColor" strokeWidth="0.8" fill="none" />
                                <path d="M3 4.5V3a2 2 0 0 1 4 0v1.5" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
                              </svg>
                              <span className="text-[10px] font-medium text-polkadot">Private</span>
                            </div>
                          )}
                        </div>
                        <div className="text-sm font-[family-name:var(--font-body)]">
                          {intent.isPrivate ? (
                            <span className="text-muted">Parameters hidden</span>
                          ) : (
                            <>
                              <span className="font-medium text-foreground">{intent.sellAmount} {intent.sellAsset}</span>
                              <span className="text-muted-light mx-2">&rarr;</span>
                              <span className="font-medium text-foreground">{intent.buyAmount} {intent.buyAsset}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1.5 text-[11px] text-muted font-[family-name:var(--font-body)]">
                          <span>{timeStr} left</span>
                          {status === "filled" && <span className="text-success font-medium">Filled!</span>}
                          {status === "error" && <span className="text-danger font-medium">Fill failed</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleFill(intent)}
                        disabled={!hasRawData || status === "filling" || status === "filled"}
                        className={`h-9 px-5 rounded-lg text-xs font-semibold font-[family-name:var(--font-display)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                          status === "filled"
                            ? "bg-success/10 text-success"
                            : intent.isPrivate
                              ? "bg-polkadot/10 text-polkadot hover:bg-polkadot/20"
                              : "bg-foreground text-white hover:bg-polkadot"
                        }`}
                      >
                        {status === "filling"
                          ? "Filling..."
                          : status === "filled"
                            ? "Done"
                            : intent.isPrivate
                              ? "Reveal & Fill"
                              : "Fill"}
                      </button>
                    </div>
                    {/* Show tx hash as proof after fill */}
                    {status === "filled" && txHash && (
                      <div className="pt-2 border-t border-foreground/5">
                        <div className="flex items-center gap-2 text-[11px] font-[family-name:var(--font-body)]">
                          <span className="text-success font-medium">Tx confirmed:</span>
                          <code className="text-muted-light break-all">{txHash}</code>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
