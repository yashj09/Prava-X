"use client";

const problems = [
  {
    label: "VISIBLE",
    title: "Public Mempools",
    description:
      "Every intent broadcast reveals your exact trade: tokens, amounts, deadlines. Searchers see everything.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2 14C2 14 7 6 14 6C21 6 26 14 26 14C26 14 21 22 14 22C7 22 2 14 2 14Z" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    label: "FRONT-RUN",
    title: "MEV Extraction",
    description:
      "Bots sandwich your trades. They see intent parameters and extract value before your order settles.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M4 20L14 8L24 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 16L14 4L24 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
      </svg>
    ),
  },
  {
    label: "EXPLOITED",
    title: "Cross-Chain Leaks",
    description:
      "Bridging intents across chains multiplies exposure. Each hop is another opportunity for value extraction.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="3" y="3" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="16" y="16" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 7.5H16.5V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 20.5H11.5V16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export function Problem() {
  return (
    <section className="py-28 px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-xl mb-16">
          <span className="font-[family-name:var(--font-display)] text-xs font-semibold tracking-[0.2em] uppercase text-polkadot">
            The Problem
          </span>
          <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold mt-4 leading-tight tracking-tight">
            Intent protocols have
            <br />a transparency problem
          </h2>
          <p className="text-muted mt-4 leading-relaxed font-[family-name:var(--font-body)]">
            Current intent-based systems broadcast your trade parameters to the
            entire network. This creates a systematic MEV tax on every user.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {problems.map((problem, i) => (
            <div
              key={problem.label}
              className="group glass rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-xl bg-polkadot/5 flex items-center justify-center text-polkadot mb-5 transition-colors group-hover:bg-polkadot/10">
                {problem.icon}
              </div>
              <span className="font-[family-name:var(--font-display)] text-[10px] font-bold tracking-[0.25em] text-polkadot/60 uppercase">
                {problem.label}
              </span>
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold mt-2 text-foreground">
                {problem.title}
              </h3>
              <p className="text-sm text-muted mt-3 leading-relaxed font-[family-name:var(--font-body)]">
                {problem.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
