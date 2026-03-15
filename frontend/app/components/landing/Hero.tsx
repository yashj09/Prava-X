"use client";

import Link from "next/link";

export function Hero() {
  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden">
      {/* Dot grid overlay */}
      <div className="absolute inset-0 dot-grid opacity-800" />

      {/* Floating orbs */}
      <div className="absolute top-20 right-[15%] w-72 h-72 rounded-full bg-polkadot/5 blur-3xl animate-float" />
      <div className="absolute bottom-32 left-[10%] w-56 h-56 rounded-full bg-polkadot/4 blur-3xl animate-float-slow" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8 w-full">
        <div className="max-w-3xl">
          {/* Eyebrow */}
          <div className="animate-fade-up stagger-1 flex items-center gap-3 mb-8">
            <div className="w-2 h-2 rounded-full bg-polkadot pulse-dot" />
            <span className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-[0.2em] uppercase text-polkadot">
              Polkadot Hub PVM
            </span>
          </div>

          {/* Headline */}
          <h1 className="animate-fade-up stagger-2 font-[family-name:var(--font-display)] text-5xl sm:text-6xl lg:text-7xl font-800 leading-[0.95] tracking-tight text-foreground">
            Privacy-First
            <br />
            Cross-Chain
            <br />
            <span className="text-polkadot">Intents</span>
          </h1>

          {/* Subheading */}
          <p className="animate-fade-up stagger-3 mt-8 text-lg sm:text-xl leading-relaxed text-muted max-w-lg font-[family-name:var(--font-body)]">
            Your trade parameters stay hidden until settlement. ZK commitments
            verified by a{" "}
            <span className="text-foreground font-medium">
              Rust PVM contract
            </span>
            , called directly from Solidity. Cross-chain via XCM.
          </p>

          {/* Redacted preview */}
          <div className="animate-fade-up stagger-4 mt-8 redacted-reveal inline-flex items-center gap-3 glass-static rounded-lg px-5 py-3 cursor-default">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="text-polkadot flex-shrink-0"
            >
              <rect
                x="2"
                y="7"
                width="12"
                height="8"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
              />
              <path
                d="M5 7V5a3 3 0 0 1 6 0v2"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span className="text-sm font-[family-name:var(--font-body)]">
              Sell <span className="redacted">1000 USDC</span> for{" "}
              <span className="redacted">250 PAS</span>
            </span>
            <span className="text-xs text-muted-light ml-2">
              hover to reveal
            </span>
          </div>

          {/* CTAs */}
          <div className="animate-fade-up stagger-5 mt-10 flex flex-wrap gap-4">
            <Link
              href="/app"
              className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-polkadot text-white font-[family-name:var(--font-display)] font-semibold text-sm tracking-wide transition-all hover:bg-polkadot-dark hover:shadow-lg hover:shadow-polkadot/20 active:scale-[0.98]"
            >
              Launch App
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center h-12 px-8 rounded-full border border-foreground/10 text-foreground font-[family-name:var(--font-display)] font-medium text-sm tracking-wide transition-all hover:border-polkadot/30 hover:text-polkadot active:scale-[0.98]"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="mr-2"
              >
                <circle
                  cx="8"
                  cy="8"
                  r="6.5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
                <path d="M6.5 5.5L10.5 8L6.5 10.5V5.5Z" fill="currentColor" />
              </svg>
              Watch Demo
            </a>
          </div>

          {/* Stats strip */}
          <div className="animate-fade-up stagger-6 mt-16 flex gap-12">
            <div>
              <div className="font-[family-name:var(--font-display)] text-2xl font-bold text-foreground">
                2
              </div>
              <div className="text-xs text-muted mt-1 font-[family-name:var(--font-body)]">
                Virtual Machines
              </div>
            </div>
            <div>
              <div className="font-[family-name:var(--font-display)] text-2xl font-bold text-foreground">
                34KB
              </div>
              <div className="text-xs text-muted mt-1 font-[family-name:var(--font-body)]">
                PVM Binary
              </div>
            </div>
            <div>
              <div className="font-[family-name:var(--font-display)] text-2xl font-bold text-polkadot">
                100%
              </div>
              <div className="text-xs text-muted mt-1 font-[family-name:var(--font-body)]">
                On-Chain Privacy
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
