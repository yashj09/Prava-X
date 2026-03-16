"use client";

type IntentStatus = "active" | "filling" | "filled" | "expired" | "private";

interface MockIntent {
  id: string;
  maker: string;
  sellAsset: string;
  sellAmount: string;
  buyAsset: string;
  buyAmount: string;
  deadline: string;
  status: IntentStatus;
  isPrivate: boolean;
}

const MOCK_INTENTS: MockIntent[] = [
  {
    id: "0xf3a1...8b2c",
    maker: "0x7a3B...9f1E",
    sellAsset: "USDC",
    sellAmount: "5,000",
    buyAsset: "PAS",
    buyAmount: "1,250",
    deadline: "12m left",
    status: "active",
    isPrivate: false,
  },
  {
    id: "0xc9e2...4d7a",
    maker: "0x2eF8...3c4A",
    sellAsset: "???",
    sellAmount: "???",
    buyAsset: "???",
    buyAmount: "???",
    deadline: "28m left",
    status: "private",
    isPrivate: true,
  },
  {
    id: "0xa1b7...e3f9",
    maker: "0x8dC1...7b2F",
    sellAsset: "PAS",
    sellAmount: "800",
    buyAsset: "USDC",
    buyAmount: "3,120",
    deadline: "5m left",
    status: "filling",
    isPrivate: false,
  },
  {
    id: "0xd4f8...1a6e",
    maker: "0x5aE3...2d8C",
    sellAsset: "???",
    sellAmount: "???",
    buyAsset: "???",
    buyAmount: "???",
    deadline: "45m left",
    status: "private",
    isPrivate: true,
  },
  {
    id: "0xb2c5...7f3d",
    maker: "0x1fB9...6e4A",
    sellAsset: "PAS",
    sellAmount: "2,000",
    buyAsset: "USDC",
    buyAmount: "4,800",
    deadline: "Expired",
    status: "expired",
    isPrivate: false,
  },
  {
    id: "0xe7a3...9c1b",
    maker: "0x3cD7...8a5E",
    sellAsset: "USDC",
    sellAmount: "10,000",
    buyAsset: "PAS",
    buyAmount: "2,380",
    deadline: "Filled",
    status: "filled",
    isPrivate: false,
  },
];

const STATUS_CONFIG: Record<IntentStatus, { label: string; color: string; bg: string }> = {
  active: { label: "Active", color: "text-success", bg: "bg-success/10" },
  filling: { label: "Filling...", color: "text-warning", bg: "bg-warning/10" },
  filled: { label: "Filled", color: "text-muted", bg: "bg-foreground/5" },
  expired: { label: "Expired", color: "text-muted-light", bg: "bg-foreground/5" },
  private: { label: "Hidden", color: "text-polkadot", bg: "bg-polkadot/8" },
};

export function IntentBook() {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <h3 className="font-[family-name:var(--font-display)] text-base font-bold">
            Live Intents
          </h3>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 text-success">
            <div className="w-1.5 h-1.5 rounded-full bg-success pulse-dot" />
            <span className="text-[11px] font-medium font-[family-name:var(--font-body)]">
              {MOCK_INTENTS.filter((i) => i.status === "active" || i.status === "private").length} active
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted font-[family-name:var(--font-body)]">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="1.5" y="5" width="9" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1" fill="none" />
            <path d="M3.5 5V3.5a2.5 2.5 0 0 1 5 0V5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          </svg>
          {MOCK_INTENTS.filter((i) => i.isPrivate).length} private
        </div>
      </div>

      {/* Intent list */}
      <div className="space-y-2">
        {MOCK_INTENTS.map((intent) => {
          const status = STATUS_CONFIG[intent.status];
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
                    {intent.deadline}
                  </span>
                  <div className={`px-2.5 py-1 rounded-full ${status.bg}`}>
                    <span className={`text-[11px] font-medium ${status.color} font-[family-name:var(--font-body)]`}>
                      {status.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-muted-light pt-4 font-[family-name:var(--font-body)]">
        Private intents show only commitment hashes. Parameters revealed at fill time.
      </p>
    </div>
  );
}
