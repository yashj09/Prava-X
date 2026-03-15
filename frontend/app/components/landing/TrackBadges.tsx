"use client";

const badges = [
  {
    category: "PVM Experiments",
    title: "Rust from Solidity",
    description:
      "Privacy engine compiled to 34KB PolkaVM binary. Solidity calls Rust cryptographic functions via cross-VM dispatch.",
    features: ["arkworks on PVM", "Blake2s hashing", "Pedersen commitments", "Bump allocator"],
  },
  {
    category: "Native Assets",
    title: "PAS Staking",
    description:
      "Solvers stake native PAS (msg.value) to participate. Slashing enforces honest behavior with 10% penalty for failed fills.",
    features: ["Native value transfers", "Time-locked unstaking", "Economic security", "Solver registry"],
  },
  {
    category: "Precompiles",
    title: "XCM Cross-Chain",
    description:
      "Intent fills can bridge via XCM precompile at 0x...0a0000. Escrow holds assets until cross-chain confirmation.",
    features: ["XCM precompile", "Escrow vault", "Cross-chain fills", "Multi-parachain"],
  },
];

export function TrackBadges() {
  return (
    <section className="py-28 px-6 lg:px-8 mesh-gradient">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="font-[family-name:var(--font-display)] text-xs font-semibold tracking-[0.2em] uppercase text-polkadot">
            Track 2 Coverage
          </span>
          <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold mt-4 tracking-tight">
            All three categories. One protocol.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {badges.map((badge) => (
            <div key={badge.category} className="glass rounded-2xl p-7 flex flex-col">
              <div className="inline-flex self-start items-center gap-2 px-3 py-1.5 rounded-full bg-polkadot/8 mb-5">
                <div className="w-1.5 h-1.5 rounded-full bg-polkadot" />
                <span className="text-[11px] font-bold tracking-[0.1em] text-polkadot font-[family-name:var(--font-display)] uppercase">
                  {badge.category}
                </span>
              </div>

              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-foreground">
                {badge.title}
              </h3>
              <p className="text-sm text-muted mt-3 leading-relaxed font-[family-name:var(--font-body)] flex-1">
                {badge.description}
              </p>

              <div className="mt-6 pt-5 border-t border-foreground/5 grid grid-cols-2 gap-2">
                {badge.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-2">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-polkadot/50 flex-shrink-0">
                      <path d="M2.5 6L5 8.5L9.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-xs text-muted font-[family-name:var(--font-body)]">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
