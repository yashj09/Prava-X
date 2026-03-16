"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { formatEther } from "viem";
import { useSolverStake, useSolverInfo } from "../../config/hooks";

export function SolverPanel() {
  const { address, isConnected } = useAccount();
  const [stakeAmount, setStakeAmount] = useState("");
  const [activeTab, setActiveTab] = useState<"stake" | "fill">("stake");
  const { stake, isPending: isStaking } = useSolverStake();
  const { stake: onChainStake, isActive } = useSolverInfo(address);

  // Use on-chain data if available, else mock
  const solverStats = {
    staked: onChainStake ? formatEther(onChainStake) : "12.5",
    status: isActive ?? true ? "Active" : "Inactive",
    fills: 47,
    slashes: 0,
    pendingUnstake: "0",
  };

  const fillableIntents = [
    {
      id: "0xf3a1...8b2c",
      sell: "5,000 USDC",
      buy: "1,250 PAS",
      deadline: "12m",
      profit: "~2.1%",
    },
    {
      id: "0xa1b7...e3f9",
      sell: "800 PAS",
      buy: "3,120 USDC",
      deadline: "5m",
      profit: "~1.4%",
    },
    {
      id: "0xc9e2...4d7a",
      sell: "Hidden",
      buy: "Hidden",
      deadline: "28m",
      profit: "Reveal to see",
      isPrivate: true,
    },
  ];

  const handleStake = async () => {
    if (!stakeAmount || !isConnected) return;
    try {
      await stake(stakeAmount);
      setStakeAmount("");
    } catch (err) {
      console.error("Stake failed:", err);
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
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10">
            <div className="w-1.5 h-1.5 rounded-full bg-success" />
            <span className="text-[11px] font-medium text-success font-[family-name:var(--font-body)]">
              {solverStats.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Staked", value: `${solverStats.staked} PAS`, highlight: true },
            { label: "Fills", value: solverStats.fills.toString(), highlight: false },
            { label: "Slashes", value: solverStats.slashes.toString(), highlight: false },
            { label: "Pending", value: `${solverStats.pendingUnstake} PAS`, highlight: false },
          ].map((stat) => (
            <div key={stat.label} className="p-3 rounded-xl bg-foreground/[0.02] border border-foreground/5">
              <div className="text-[11px] text-muted mb-1 font-[family-name:var(--font-body)] uppercase tracking-wider">
                {stat.label}
              </div>
              <div
                className={`font-[family-name:var(--font-display)] text-lg font-bold ${
                  stat.highlight ? "text-polkadot" : "text-foreground"
                }`}
              >
                {stat.value}
              </div>
            </div>
          ))}
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
            {tab === "stake" ? "Stake PAS" : "Fill Intents"}
          </button>
        ))}
      </div>

      {/* Stake panel */}
      {activeTab === "stake" && (
        <div className="glass-static rounded-2xl p-6 space-y-5">
          <div>
            <label className="text-xs font-medium text-muted font-[family-name:var(--font-body)] uppercase tracking-wider">
              Stake Amount (PAS)
            </label>
            <div className="mt-3 flex items-center gap-3">
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

          <div className="flex gap-3">
            <button
              onClick={handleStake}
              disabled={isStaking || !isConnected || !stakeAmount}
              className="flex-1 h-12 rounded-xl bg-polkadot text-white font-[family-name:var(--font-display)] font-bold text-sm transition-all hover:bg-polkadot-dark hover:shadow-lg hover:shadow-polkadot/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStaking ? "Staking..." : "Stake PAS"}
            </button>
            <button className="h-12 px-6 rounded-xl border border-foreground/10 text-foreground font-[family-name:var(--font-display)] font-medium text-sm transition-all hover:border-polkadot/30 cursor-pointer">
              Unstake
            </button>
          </div>
        </div>
      )}

      {/* Fill panel */}
      {activeTab === "fill" && (
        <div className="space-y-3">
          {fillableIntents.map((intent) => (
            <div
              key={intent.id}
              className={`glass-static rounded-xl p-4 flex items-center justify-between gap-4 ${
                intent.isPrivate ? "animate-border" : ""
              }`}
            >
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
                  <span className="font-medium text-foreground">{intent.sell}</span>
                  <span className="text-muted-light mx-2">&rarr;</span>
                  <span className="font-medium text-foreground">{intent.buy}</span>
                </div>
                <div className="flex items-center gap-4 mt-1.5 text-[11px] text-muted font-[family-name:var(--font-body)]">
                  <span>{intent.deadline} left</span>
                  <span className={intent.isPrivate ? "text-polkadot" : "text-success"}>
                    {intent.profit}
                  </span>
                </div>
              </div>
              <button
                className={`h-9 px-5 rounded-lg text-xs font-semibold font-[family-name:var(--font-display)] transition-all cursor-pointer ${
                  intent.isPrivate
                    ? "bg-polkadot/10 text-polkadot hover:bg-polkadot/20"
                    : "bg-foreground text-white hover:bg-polkadot"
                }`}
              >
                {intent.isPrivate ? "Reveal & Fill" : "Fill"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
