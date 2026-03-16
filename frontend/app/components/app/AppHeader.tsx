"use client";

import Link from "next/link";
import { useAccount, useConnect, useDisconnect } from "wagmi";

export function AppHeader() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const truncated = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  return (
    <header className="glass-static sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-6 h-6 rounded-md bg-polkadot flex items-center justify-center transition-transform group-hover:scale-110">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="1.5" y="5" width="9" height="5.5" rx="1.5" stroke="white" strokeWidth="1" fill="none" />
              <path d="M3.5 5V3.5a2.5 2.5 0 0 1 5 0V5" stroke="white" strokeWidth="1" strokeLinecap="round" />
            </svg>
          </div>
          <span className="font-[family-name:var(--font-display)] text-sm font-bold tracking-tight">
            XCM Intents
          </span>
        </Link>

        {/* Network + Wallet */}
        <div className="flex items-center gap-3">
          {/* Network indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-polkadot-subtle">
            <div className="w-1.5 h-1.5 rounded-full bg-success pulse-dot" />
            <span className="text-[11px] font-medium text-polkadot font-[family-name:var(--font-body)]">
              Polkadot Hub TestNet
            </span>
          </div>

          {/* Wallet button */}
          {isConnected ? (
            <button
              onClick={() => disconnect()}
              className="h-8 px-4 rounded-full bg-foreground text-white text-xs font-medium font-[family-name:var(--font-display)] flex items-center gap-2 transition-all hover:bg-polkadot cursor-pointer"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-success" />
              {truncated}
            </button>
          ) : (
            <button
              onClick={() => {
                const connector = connectors[0];
                if (connector) connect({ connector });
              }}
              className="h-8 px-4 rounded-full bg-polkadot text-white text-xs font-medium font-[family-name:var(--font-display)] flex items-center gap-2 transition-all hover:bg-polkadot-dark cursor-pointer"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="1" y="4" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1" />
                <path d="M3 4V2.5a3 3 0 0 1 6 0V4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
              </svg>
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
