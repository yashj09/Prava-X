"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="py-16 px-6 lg:px-8 border-t border-foreground/5">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-polkadot flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="2" y="6" width="10" height="6" rx="1.5" stroke="white" strokeWidth="1.2" fill="none" />
                  <path d="M4 6V4.5a3 3 0 0 1 6 0V6" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </div>
              <span className="font-[family-name:var(--font-display)] text-base font-bold tracking-tight">
                XCM Intents
              </span>
            </div>
            <p className="text-xs text-muted mt-2 font-[family-name:var(--font-body)]">
              Privacy-preserving cross-chain intents on Polkadot Hub
            </p>
          </div>

          {/* Links */}
          <div className="flex items-center gap-8 text-sm font-[family-name:var(--font-body)]">
            <Link href="/app" className="text-muted hover:text-polkadot transition-colors">
              Launch App
            </Link>
            <a href="#how-it-works" className="text-muted hover:text-polkadot transition-colors">
              How It Works
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-polkadot transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-foreground/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-light font-[family-name:var(--font-body)]">
            Built for Polkadot Solidity Hackathon 2026 &middot; Track 2: PVM Smart Contracts
          </p>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-success pulse-dot" />
            <span className="text-xs text-muted-light font-[family-name:var(--font-body)]">
              Polkadot Hub TestNet
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
