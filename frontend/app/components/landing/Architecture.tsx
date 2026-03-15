"use client";

export function Architecture() {
  return (
    <section className="py-28 px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="font-[family-name:var(--font-display)] text-xs font-semibold tracking-[0.2em] uppercase text-polkadot">
            Architecture
          </span>
          <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold mt-4 tracking-tight">
            Dual-VM by design
          </h2>
          <p className="text-muted mt-4 max-w-lg mx-auto leading-relaxed font-[family-name:var(--font-body)]">
            Solidity handles intent lifecycle. Rust PVM handles cryptographic verification.
            Cross-VM calls make them feel like one contract.
          </p>
        </div>

        {/* Architecture diagram */}
        <div className="glass-static rounded-3xl p-8 sm:p-12 max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 md:gap-4 items-center">
            {/* EVM Side */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-polkadot/10 flex items-center justify-center">
                  <span className="text-polkadot text-xs font-bold font-[family-name:var(--font-display)]">EVM</span>
                </div>
                <span className="font-[family-name:var(--font-display)] text-sm font-bold text-foreground tracking-wide">
                  Solidity Contracts
                </span>
              </div>

              {[
                { name: "IntentReactor.sol", desc: "Intent lifecycle + fills" },
                { name: "EscrowVault.sol", desc: "Cross-chain escrow" },
                { name: "SolverRegistry.sol", desc: "Staking + slashing" },
              ].map((contract) => (
                <div
                  key={contract.name}
                  className="group flex items-start gap-3 p-3 rounded-xl bg-white/60 border border-foreground/5 transition-all hover:border-polkadot/20"
                >
                  <div className="mt-0.5 w-2 h-2 rounded-full bg-polkadot/30 group-hover:bg-polkadot transition-colors" />
                  <div>
                    <div className="text-sm font-medium font-[family-name:var(--font-body)] text-foreground">
                      {contract.name}
                    </div>
                    <div className="text-xs text-muted font-[family-name:var(--font-body)]">{contract.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Cross-VM Bridge */}
            <div className="flex flex-col items-center gap-2 py-4">
              <div className="hidden md:block w-[1px] h-8 bg-gradient-to-b from-transparent to-polkadot/30" />
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-2 border-polkadot/30 flex items-center justify-center bg-white animate-border">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-polkadot">
                    <path d="M4 10H16M16 10L11 5M16 10L11 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className="text-[10px] font-bold tracking-[0.15em] text-polkadot/50 font-[family-name:var(--font-display)] uppercase">
                    Cross-VM
                  </span>
                </div>
              </div>
              <div className="hidden md:block w-[1px] h-8 bg-gradient-to-b from-polkadot/30 to-transparent mt-4" />
            </div>

            {/* PVM Side */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-polkadot/10 flex items-center justify-center">
                  <span className="text-polkadot text-xs font-bold font-[family-name:var(--font-display)]">PVM</span>
                </div>
                <span className="font-[family-name:var(--font-display)] text-sm font-bold text-foreground tracking-wide">
                  Rust Contract
                </span>
              </div>

              <div className="p-4 rounded-xl bg-foreground text-white border border-foreground">
                <div className="text-sm font-medium font-[family-name:var(--font-body)] mb-3">
                  PrivacyEngine.pvm
                </div>
                <div className="space-y-2.5">
                  {[
                    "computeCommitment()",
                    "verifyCommitment()",
                    "pedersenCommit()",
                    "verifyPedersen()",
                  ].map((fn) => (
                    <div key={fn} className="flex items-center gap-2">
                      <span className="text-polkadot-light text-xs">fn</span>
                      <code className="text-xs text-white/70 font-[family-name:var(--font-body)]">
                        {fn}
                      </code>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-success" />
                  <span className="text-[11px] text-white/50 font-[family-name:var(--font-body)]">
                    34KB compiled &middot; arkworks + blake2
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-10 pt-6 border-t border-foreground/5 flex flex-wrap items-center justify-center gap-6 text-xs text-muted font-[family-name:var(--font-body)]">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" stroke="currentColor" strokeWidth="1" />
              </svg>
              XCM Precompile
            </div>
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1" />
                <path d="M7 4V7L9 9" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
              </svg>
              Dutch Auction Pricing
            </div>
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1" />
                <path d="M4.5 7H9.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                <path d="M7 4.5V9.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
              </svg>
              Native PAS Staking
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
