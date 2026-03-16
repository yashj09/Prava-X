"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { parseUnits, keccak256, encodePacked } from "viem";
import { TOKENS } from "../../config/contracts";
import { useSignIntent, useSignPrivateIntent } from "../../config/hooks";

export function CreateIntent() {
  const { address, isConnected } = useAccount();
  const [sellToken, setSellToken] = useState("USDC");
  const [buyToken, setBuyToken] = useState("PAS");
  const [sellAmount, setSellAmount] = useState("");
  const [buyAmount, setBuyAmount] = useState("");
  const [deadline, setDeadline] = useState("30");
  const [isPrivate, setIsPrivate] = useState(true);
  const [status, setStatus] = useState<"idle" | "signing" | "signed" | "error">("idle");
  const [sigResult, setSigResult] = useState<string | null>(null);

  const { signIntent, isPending: isSigningPublic } = useSignIntent();
  const { signPrivateIntent, isPending: isSigningPrivate } = useSignPrivateIntent();

  const getTokenAddress = (symbol: string): `0x${string}` => {
    const token = TOKENS.find((t) => t.symbol === symbol);
    return (token?.address ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;
  };

  const getTokenDecimals = (symbol: string): number => {
    const token = TOKENS.find((t) => t.symbol === symbol);
    return token?.decimals ?? 18;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !sellAmount || !buyAmount) return;

    setStatus("signing");
    const nonce = BigInt(Math.floor(Math.random() * 1_000_000));
    const deadlineBigInt = BigInt(Math.floor(Date.now() / 1000) + Number(deadline) * 60);

    try {
      if (isPrivate) {
        // Generate commitment hash from parameters
        const salt = keccak256(encodePacked(["uint256", "address"], [nonce, address]));
        const commitment = keccak256(
          encodePacked(
            ["address", "uint256", "address", "uint256", "bytes32"],
            [
              getTokenAddress(sellToken),
              parseUnits(sellAmount, getTokenDecimals(sellToken)),
              getTokenAddress(buyToken),
              parseUnits(buyAmount, getTokenDecimals(buyToken)),
              salt,
            ]
          )
        );

        const sig = await signPrivateIntent({
          maker: address,
          commitment,
          deadline: deadlineBigInt,
          nonce,
        });
        setSigResult(sig);
      } else {
        const parsedSellAmount = parseUnits(sellAmount, getTokenDecimals(sellToken));
        const parsedBuyAmount = parseUnits(buyAmount, getTokenDecimals(buyToken));

        const sig = await signIntent({
          maker: address,
          sellAsset: getTokenAddress(sellToken),
          sellAmount: parsedSellAmount,
          buyAsset: getTokenAddress(buyToken),
          minBuyAmount: parsedBuyAmount,
          startBuyAmount: parsedBuyAmount + (parsedBuyAmount * 20n) / 100n, // +20% start
          deadline: deadlineBigInt,
          nonce,
        });
        setSigResult(sig);
      }
      setStatus("signed");
      setTimeout(() => setStatus("idle"), 4000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const isSigning = isSigningPublic || isSigningPrivate;

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-6">
      {/* Privacy toggle */}
      <div className="glass-static rounded-2xl p-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-polkadot">
              <rect x="2" y="7" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="font-[family-name:var(--font-display)] text-sm font-semibold">
              Private Intent
            </span>
          </div>
          <p className="text-xs text-muted mt-1 font-[family-name:var(--font-body)]">
            {isPrivate
              ? "Parameters hidden via ZK commitment"
              : "Parameters visible on-chain"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsPrivate(!isPrivate)}
          className="toggle-track w-11 h-6 rounded-full bg-foreground/10 p-0.5 cursor-pointer relative"
          data-active={isPrivate}
        >
          <div className="toggle-thumb w-5 h-5 rounded-full bg-white shadow-sm" />
        </button>
      </div>

      {/* Sell side */}
      <div className="glass-static rounded-2xl p-5 space-y-4">
        <label className="text-xs font-medium text-muted font-[family-name:var(--font-body)] uppercase tracking-wider">
          You Sell
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            placeholder="0.00"
            value={sellAmount}
            onChange={(e) => setSellAmount(e.target.value)}
            className="flex-1 bg-transparent text-3xl font-[family-name:var(--font-display)] font-bold outline-none placeholder:text-foreground/15 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <select
            value={sellToken}
            onChange={(e) => setSellToken(e.target.value)}
            className="h-10 px-4 rounded-full bg-foreground/5 text-sm font-medium font-[family-name:var(--font-display)] cursor-pointer border-none outline-none"
          >
            {TOKENS.map((t) => (
              <option key={t.symbol} value={t.symbol}>
                {t.symbol}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Swap direction arrow */}
      <div className="flex justify-center -my-3 relative z-10">
        <div className="w-10 h-10 rounded-xl bg-white border border-foreground/10 flex items-center justify-center shadow-sm">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-foreground/40">
            <path d="M8 3V13M8 13L4 9M8 13L12 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Buy side */}
      <div className="glass-static rounded-2xl p-5 space-y-4">
        <label className="text-xs font-medium text-muted font-[family-name:var(--font-body)] uppercase tracking-wider">
          You Buy (minimum)
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            placeholder="0.00"
            value={buyAmount}
            onChange={(e) => setBuyAmount(e.target.value)}
            className="flex-1 bg-transparent text-3xl font-[family-name:var(--font-display)] font-bold outline-none placeholder:text-foreground/15 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <select
            value={buyToken}
            onChange={(e) => setBuyToken(e.target.value)}
            className="h-10 px-4 rounded-full bg-foreground/5 text-sm font-medium font-[family-name:var(--font-display)] cursor-pointer border-none outline-none"
          >
            {TOKENS.map((t) => (
              <option key={t.symbol} value={t.symbol}>
                {t.symbol}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Settings */}
      <div className="glass-static rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted font-[family-name:var(--font-body)] uppercase tracking-wider">
            Deadline
          </span>
          <div className="flex items-center gap-2">
            {["10", "30", "60"].map((min) => (
              <button
                key={min}
                type="button"
                onClick={() => setDeadline(min)}
                className={`h-7 px-3 rounded-full text-xs font-medium font-[family-name:var(--font-body)] transition-all cursor-pointer ${
                  deadline === min
                    ? "bg-polkadot text-white"
                    : "bg-foreground/5 text-muted hover:bg-foreground/10"
                }`}
              >
                {min}m
              </button>
            ))}
          </div>
        </div>

        {isPrivate && (
          <div className="mt-4 pt-4 border-t border-foreground/5">
            <div className="flex items-center gap-2 text-xs text-polkadot font-[family-name:var(--font-body)]">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="1.5" y="5" width="9" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1" fill="none" />
                <path d="M3.5 5V3.5a2.5 2.5 0 0 1 5 0V5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
              </svg>
              Commitment will be generated via Rust PVM privacy engine
            </div>
          </div>
        )}
      </div>

      {/* Signature result */}
      {sigResult && status === "signed" && (
        <div className="glass-static rounded-2xl p-4">
          <div className="text-xs font-medium text-success mb-2 font-[family-name:var(--font-body)]">
            EIP-712 Signature
          </div>
          <code className="text-[11px] text-muted break-all font-[family-name:var(--font-body)] leading-relaxed">
            {sigResult}
          </code>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSigning || !isConnected || !sellAmount || !buyAmount}
        className={`w-full h-14 rounded-2xl font-[family-name:var(--font-display)] font-bold text-sm tracking-wide transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          status === "signed"
            ? "bg-success text-white"
            : status === "error"
              ? "bg-danger text-white"
              : "bg-polkadot text-white hover:bg-polkadot-dark hover:shadow-lg hover:shadow-polkadot/20 active:scale-[0.99]"
        }`}
      >
        {isSigning ? (
          "Waiting for wallet..."
        ) : status === "signed" ? (
          <span className="flex items-center justify-center gap-2">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8L6.5 11.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Intent Signed
          </span>
        ) : status === "error" ? (
          "Signing Failed"
        ) : !isConnected ? (
          "Connect Wallet First"
        ) : isPrivate ? (
          "Sign Private Intent"
        ) : (
          "Sign Intent"
        )}
      </button>

      {/* Info */}
      <p className="text-center text-xs text-muted-light font-[family-name:var(--font-body)]">
        {isConnected
          ? "Intent is signed off-chain (gasless). No transaction until a solver fills it."
          : "Connect your wallet to sign intents on Polkadot Hub TestNet."}
      </p>
    </form>
  );
}
