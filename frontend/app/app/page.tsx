"use client";

import { useState } from "react";
import { AppHeader } from "../components/app/AppHeader";
import { CreateIntent } from "../components/app/CreateIntent";
import { IntentBook } from "../components/app/IntentBook";
import { SolverPanel } from "../components/app/SolverPanel";
import { Faucet } from "../components/app/Faucet";

const TABS = [
  {
    id: "create",
    label: "Create Intent",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M7 4.5V9.5M4.5 7H9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "book",
    label: "Intent Book",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.2" />
        <path d="M4.5 5.5H9.5M4.5 8H7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "solver",
    label: "Solver Panel",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AppPage() {
  const [activeTab, setActiveTab] = useState<TabId>("create");

  return (
    <div className="mesh-gradient min-h-screen">
      <AppHeader />

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Tab bar */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/60 border border-foreground/5 backdrop-blur-sm mb-8 max-w-md mx-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-lg text-xs font-semibold font-[family-name:var(--font-display)] transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <span className={activeTab === tab.id ? "text-polkadot" : ""}>
                {tab.icon}
              </span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Faucet */}
        <Faucet />

        {/* Tab content */}
        <div className="animate-fade-up" key={activeTab}>
          {activeTab === "create" && <CreateIntent />}
          {activeTab === "book" && <IntentBook />}
          {activeTab === "solver" && <SolverPanel />}
        </div>
      </main>
    </div>
  );
}
