"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";

type IntentStatus = "active" | "filling" | "filled" | "expired" | "private";

export interface SignedIntent {
  id: string;
  sellAsset: string;
  sellAmount: string;
  buyAsset: string;
  buyAmount: string;
  deadline: number; // unix timestamp
  status: IntentStatus;
  isPrivate: boolean;
  signature: string;
  createdAt: number;
  // Raw on-chain data for filling (stringified bigints)
  raw?: {
    maker: string;
    sellAssetAddr: string;
    sellAmountWei: string;
    buyAssetAddr: string;
    minBuyAmountWei: string;
    startBuyAmountWei: string;
    decayStartTime: string;
    nonce: string;
    exclusiveFiller: string;
    // For private intents
    commitment?: string;
    salt?: string;
  };
}

const STORAGE_KEY = "xcm_intents_signed";

function loadIntents(): SignedIntent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveIntents(intents: SignedIntent[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(intents));
}

export function addSessionIntent(intent: SignedIntent) {
  const existing = loadIntents();
  const updated = [intent, ...existing];
  saveIntents(updated);
  // Dispatch a custom event so other components can react
  window.dispatchEvent(new CustomEvent("intents-updated"));
}

export function updateIntentStatus(id: string, status: IntentStatus) {
  const intents = loadIntents();
  const idx = intents.findIndex((i) => i.id === id);
  if (idx !== -1) {
    intents[idx].status = status;
    saveIntents(intents);
    window.dispatchEvent(new CustomEvent("intents-updated"));
  }
}

export function clearAllIntents() {
  saveIntents([]);
  window.dispatchEvent(new CustomEvent("intents-updated"));
}

export function getSessionIntents(): SignedIntent[] {
  return loadIntents();
}

const STATUS_CONFIG: Record<IntentStatus, { label: string; color: string; bg: string }> = {
  active: { label: "Active", color: "text-success", bg: "bg-success/10" },
  filling: { label: "Filling...", color: "text-warning", bg: "bg-warning/10" },
  filled: { label: "Filled", color: "text-muted", bg: "bg-foreground/5" },
  expired: { label: "Expired", color: "text-muted-light", bg: "bg-foreground/5" },
  private: { label: "Hidden", color: "text-polkadot", bg: "bg-polkadot/8" },
};

function getTimeRemaining(deadline: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = deadline - now;
  if (diff <= 0) return "Expired";
  if (diff < 60) return `${diff}s left`;
  return `${Math.floor(diff / 60)}m left`;
}

function getIntentStatus(intent: SignedIntent): IntentStatus {
  if (intent.status === "filled") return "filled";
  if (intent.isPrivate) return "private";
  const now = Math.floor(Date.now() / 1000);
  if (intent.deadline <= now) return "expired";
  return intent.status;
}

/** Hook to subscribe to intent store changes */
export function useIntentStore() {
  const [intents, setIntents] = useState<SignedIntent[]>([]);

  const refresh = useCallback(() => {
    setIntents(loadIntents());
  }, []);

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener("intents-updated", handler);
    return () => window.removeEventListener("intents-updated", handler);
  }, [refresh]);

  return { intents, refresh };
}

export function IntentBook() {
  const { address } = useAccount();
  const { intents, refresh } = useIntentStore();

  const displayIntents = intents.map((intent) => ({
    ...intent,
    currentStatus: getIntentStatus(intent),
  }));

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <h3 className="font-[family-name:var(--font-display)] text-base font-bold">
            Intent Book
          </h3>
          {displayIntents.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 text-success">
              <div className="w-1.5 h-1.5 rounded-full bg-success pulse-dot" />
              <span className="text-[11px] font-medium font-[family-name:var(--font-body)]">
                {displayIntents.filter((i) => i.currentStatus === "active" || i.currentStatus === "private").length} active
              </span>
            </div>
          )}
        </div>
        {displayIntents.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-muted font-[family-name:var(--font-body)]">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="1.5" y="5" width="9" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1" fill="none" />
                <path d="M3.5 5V3.5a2.5 2.5 0 0 1 5 0V5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
              </svg>
              {displayIntents.filter((i) => i.isPrivate).length} private
            </div>
            <button
              onClick={() => { clearAllIntents(); refresh(); }}
              className="text-[10px] font-medium text-danger px-2 py-0.5 rounded bg-danger/8 hover:bg-danger/15 transition-colors cursor-pointer"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Intent list or empty state */}
      {displayIntents.length === 0 ? (
        <div className="glass-static rounded-2xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-foreground/[0.03] border border-foreground/5 flex items-center justify-center mx-auto">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-muted-light">
              <rect x="4" y="4" width="20" height="20" rx="4" stroke="currentColor" strokeWidth="1.5" />
              <path d="M9 11H19M9 14H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h4 className="font-[family-name:var(--font-display)] text-sm font-semibold text-foreground mb-1">
              No intents yet
            </h4>
            <p className="text-xs text-muted font-[family-name:var(--font-body)] max-w-xs mx-auto leading-relaxed">
              {address
                ? "Intents you sign will appear here. Go to Create Intent to get started."
                : "Connect your wallet and create your first intent to see it here."}
            </p>
          </div>
          <div className="pt-2">
            <div className="inline-flex items-center gap-4 text-[11px] text-muted-light font-[family-name:var(--font-body)]">
              <span className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-success" />
                Public intents visible
              </span>
              <span className="flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-polkadot">
                  <rect x="1" y="4.5" width="8" height="4.5" rx="1" stroke="currentColor" strokeWidth="0.8" fill="none" />
                  <path d="M3 4.5V3a2 2 0 0 1 4 0v1.5" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
                </svg>
                Private intents hidden
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {displayIntents.map((intent) => {
            const statusConfig = STATUS_CONFIG[intent.currentStatus];
            return (
              <div
                key={intent.id}
                className={`glass-static rounded-xl p-4 transition-all hover:border-polkadot/20 ${
                  intent.isPrivate ? "animate-border" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Left: Trade info */}
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="flex-shrink-0">
                      <code className="text-[11px] text-muted-light font-[family-name:var(--font-body)]">
                        {intent.id}
                      </code>
                    </div>

                    {intent.isPrivate ? (
                      <div className="flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-polkadot">
                          <rect x="2" y="6" width="10" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
                          <path d="M4 6V4.5a3 3 0 0 1 6 0V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                        <span className="text-sm font-medium text-polkadot font-[family-name:var(--font-body)]">
                          Private Intent
                        </span>
                        <span className="text-xs text-muted-light font-[family-name:var(--font-body)]">
                          &mdash; parameters hidden via ZK commitment
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                        <span className="font-semibold text-foreground">
                          {intent.sellAmount} {intent.sellAsset}
                        </span>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-muted-light">
                          <path d="M3 7H11M11 7L8 4M11 7L8 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="font-semibold text-foreground">
                          {intent.buyAmount} {intent.buyAsset}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right: Status + deadline */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-muted font-[family-name:var(--font-body)]">
                      {getTimeRemaining(intent.deadline)}
                    </span>
                    <div className={`px-2.5 py-1 rounded-full ${statusConfig.bg}`}>
                      <span className={`text-[11px] font-medium ${statusConfig.color} font-[family-name:var(--font-body)]`}>
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer note */}
      <p className="text-center text-xs text-muted-light pt-4 font-[family-name:var(--font-body)]">
        Private intents show only commitment hashes. Parameters revealed at fill time.
      </p>
    </div>
  );
}
