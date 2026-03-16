"use client";

import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { parseUnits } from "viem";
import { CONTRACTS } from "../../config/contracts";
import { polkadotHub } from "../../config/wagmi";
import { useTokenBalance } from "../../config/hooks";

const mintAbi = [
  {
    type: "function",
    name: "mint",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export function Faucet() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [minting, setMinting] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const usdcBalance = useTokenBalance(address, "USDC");
  const dotBalance = useTokenBalance(address, "DOT");

  const handleMint = async (token: "USDC" | "DOT") => {
    if (!address || minting) return;
    setMinting(token);
    setSuccess(null);
    try {
      const tokenAddr = token === "USDC" ? CONTRACTS.mockUsdc : CONTRACTS.mockDot;
      const decimals = token === "USDC" ? 6 : 18;
      const amount = token === "USDC" ? parseUnits("1000", decimals) : parseUnits("100", decimals);

      await writeContractAsync({
        address: tokenAddr,
        abi: mintAbi,
        functionName: "mint",
        args: [address, amount],
        chainId: polkadotHub.id,
      });

      setSuccess(token);
      setTimeout(() => {
        usdcBalance.refetch();
        dotBalance.refetch();
      }, 2000);
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      console.error("Mint failed:", err);
    } finally {
      setMinting(null);
    }
  };

  if (!isConnected) return null;

  return (
    <div className="glass-static rounded-2xl p-4 max-w-lg mx-auto mb-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-polkadot">
              <path d="M7 1v4M7 9v4M1 7h4M9 7h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="font-[family-name:var(--font-display)] text-sm font-semibold">
              TestNet Faucet
            </span>
          </div>
          <p className="text-[11px] text-muted font-[family-name:var(--font-body)]">
            Mint free test tokens to your wallet
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleMint("USDC")}
            disabled={!!minting}
            className={`h-8 px-4 rounded-lg text-xs font-semibold font-[family-name:var(--font-display)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              success === "USDC"
                ? "bg-success/10 text-success"
                : "bg-foreground/5 text-foreground hover:bg-foreground/10"
            }`}
          >
            {minting === "USDC" ? "Minting..." : success === "USDC" ? "+1,000 USDC" : "Mint 1,000 USDC"}
          </button>
          <button
            onClick={() => handleMint("DOT")}
            disabled={!!minting}
            className={`h-8 px-4 rounded-lg text-xs font-semibold font-[family-name:var(--font-display)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              success === "DOT"
                ? "bg-success/10 text-success"
                : "bg-polkadot/10 text-polkadot hover:bg-polkadot/20"
            }`}
          >
            {minting === "DOT" ? "Minting..." : success === "DOT" ? "+100 DOT" : "Mint 100 DOT"}
          </button>
        </div>
      </div>
    </div>
  );
}
