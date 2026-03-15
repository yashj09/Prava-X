"use client";

const steps = [
  {
    number: "01",
    title: "Sign Intent",
    subtitle: "Off-chain, gasless",
    description:
      "Maker signs an EIP-712 typed intent off-chain. Parameters include sell/buy assets, amounts, deadline, and optional exclusive filler.",
    detail: "EIP-712 Signature",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M20 6L26 12L12 26H6V20L20 6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M17 9L23 15" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "ZK Commit",
    subtitle: "Hidden on-chain",
    description:
      "A cryptographic commitment hides the real parameters. Only the commitment hash goes on-chain. The Rust PVM privacy engine creates and verifies commitments.",
    detail: "Blake2s + Pedersen",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="8" y="14" width="16" height="13" rx="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M11 14V10C11 7.23858 13.2386 5 16 5C18.7614 5 21 7.23858 21 10V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="16" cy="21" r="2" fill="currentColor" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Private Fill",
    subtitle: "Verified settlement",
    description:
      "Solver reveals parameters to fill. The Rust PVM contract verifies the reveal matches the commitment. Tokens transfer atomically.",
    detail: "Cross-VM Verified",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="11" stroke="currentColor" strokeWidth="1.5" />
        <path d="M11 16L14.5 19.5L21 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-28 px-6 lg:px-8 mesh-gradient">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-20">
          <span className="font-[family-name:var(--font-display)] text-xs font-semibold tracking-[0.2em] uppercase text-polkadot">
            How It Works
          </span>
          <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold mt-4 tracking-tight">
            Three steps to private settlement
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-0 relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-[1px] bg-gradient-to-r from-polkadot/20 via-polkadot/40 to-polkadot/20" />

          {steps.map((step, i) => (
            <div key={step.number} className="relative flex flex-col items-center text-center px-6 py-8">
              {/* Step circle */}
              <div className="relative z-10 w-[72px] h-[72px] rounded-2xl bg-white border border-polkadot/15 flex items-center justify-center text-polkadot shadow-sm mb-8 transition-all hover:border-polkadot/40 hover:shadow-md hover:shadow-polkadot/10">
                {step.icon}
              </div>

              {/* Number */}
              <span className="font-[family-name:var(--font-display)] text-xs font-bold tracking-[0.3em] text-polkadot/40 mb-3">
                {step.number}
              </span>

              <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-foreground">
                {step.title}
              </h3>
              <span className="text-xs text-muted mt-1 font-[family-name:var(--font-body)]">
                {step.subtitle}
              </span>

              <p className="text-sm text-muted mt-4 leading-relaxed max-w-xs font-[family-name:var(--font-body)]">
                {step.description}
              </p>

              {/* Tech badge */}
              <div className="mt-5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-polkadot/5 text-polkadot">
                <div className="w-1.5 h-1.5 rounded-full bg-polkadot/40" />
                <span className="text-[11px] font-medium font-[family-name:var(--font-body)]">
                  {step.detail}
                </span>
              </div>

              {/* Arrow between steps (mobile) */}
              {i < steps.length - 1 && (
                <div className="md:hidden mt-6 text-polkadot/30">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 4V16M10 16L5 11M10 16L15 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
