import { Hero } from "./components/landing/Hero";
import { Problem } from "./components/landing/Problem";
import { HowItWorks } from "./components/landing/HowItWorks";
import { Architecture } from "./components/landing/Architecture";
import { TrackBadges } from "./components/landing/TrackBadges";
import { Footer } from "./components/landing/Footer";

export default function Home() {
  return (
    <div className="mesh-gradient min-h-screen">
      {/* Sticky nav */}
      <nav className="sticky top-0 z-50 glass-static">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-polkadot flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="1.5" y="5" width="9" height="5.5" rx="1.5" stroke="white" strokeWidth="1" fill="none" />
                <path d="M3.5 5V3.5a2.5 2.5 0 0 1 5 0V5" stroke="white" strokeWidth="1" strokeLinecap="round" />
              </svg>
            </div>
            <span className="font-[family-name:var(--font-display)] text-sm font-bold tracking-tight">
              Prava X
            </span>
          </div>
          <a
            href="/app"
            className="h-8 px-4 rounded-full bg-foreground text-white text-xs font-medium font-[family-name:var(--font-display)] flex items-center transition-all hover:bg-polkadot"
          >
            Launch App
          </a>
        </div>
      </nav>

      <Hero />
      <Problem />
      <HowItWorks />
      <Architecture />
      <TrackBadges />
      <Footer />
    </div>
  );
}
