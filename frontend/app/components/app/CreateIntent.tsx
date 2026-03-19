"use client";

import { useState, useRef } from "react";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { parseUnits, keccak256, encodePacked, pad, formatUnits, erc20Abi, maxUint256 } from "viem";
import { toast } from "sonner";
import { CONTRACTS, TOKENS } from "../../config/contracts";
import { polkadotHub } from "../../config/wagmi";
import { useIsHydrated, useSignIntent, useSignPrivateIntent, useTokenBalance } from "../../config/hooks";
import { addSessionIntent } from "./IntentBook";
import intentReactorAbi from "../../config/abi/IntentReactor.json";

export function CreateIntent() {
  const isHydrated = useIsHydrated();
  const { address, isConnected } = useAccount();
  const hydratedAddress = isHydrated ? address : undefined;
  const showConnectedState = isHydrated && isConnected;
  const [sellToken, setSellToken] = useState("USDC");
  const [buyToken, setBuyToken] = useState("DOT");
  const [sellAmount, setSellAmount] = useState("");
  const [buyAmount, setBuyAmount] = useState("");
  const [deadline, setDeadline] = useState("30");
  const [isPrivate, setIsPrivate] = useState(false);
  const [status, setStatus] = useState<"idle" | "signing" | "signed" | "error">("idle");
  const [sigResult, setSigResult] = useState<string | null>(null);

  const { signIntent, isPending: isSigningPublic } = useSignIntent();
  const { signPrivateIntent, isPending: isSigningPrivate } = useSignPrivateIntent();

  const sellBalance = useTokenBalance(hydratedAddress, sellToken);
  const buyBalance = useTokenBalance(hydratedAddress, buyToken);
  const { writeContractAsync } = useWriteContract();

  const isSubmittingRef = useRef(false);
  const sellTokenAddr = TOKENS.find((t) => t.symbol === sellToken)?.address as `0x${string}` | undefined;

  // Check current allowance for sell token → reactor
  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
    address: sellTokenAddr,
    abi: erc20Abi,
    functionName: "allowance",
    args: hydratedAddress ? [hydratedAddress, CONTRACTS.intentReactor] : undefined,
    chainId: polkadotHub.id,
    query: { enabled: !!hydratedAddress && !!sellTokenAddr },
  });

  const getTokenAddress = (symbol: string): `0x${string}` => {
    const token = TOKENS.find((t) => t.symbol === symbol);
    return (token?.address ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;
  };

  const getTokenDecimals = (symbol: string): number => {
    const token = TOKENS.find((t) => t.symbol === symbol);
    return token?.decimals ?? 18;
  };

  const handleSwapTokens = () => {
    setSellToken(buyToken);
    setBuyToken(sellToken);
    setSellAmount(buyAmount);
    setBuyAmount(sellAmount);
  };

  const handleMax = () => {
    if (sellBalance.balance != null) {
      const decimals = getTokenDecimals(sellToken);
      const formatted = formatUnits(sellBalance.balance, decimals);
      // Leave a small amount for gas if selling native token
      if (sellToken === "PAS") {
        const val = Math.max(0, parseFloat(formatted) - 0.1);
        setSellAmount(val > 0 ? val.toString() : "0");
      } else {
        setSellAmount(formatted);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !sellAmount || !buyAmount) return;
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    setStatus("signing");
    const nonce = BigInt(Math.floor(Math.random() * 1_000_000));
    const deadlineBigInt = BigInt(Math.floor(Date.now() / 1000) + Number(deadline) * 60);
    const parsedSellWei = parseUnits(sellAmount, getTokenDecimals(sellToken));

    try {
      // Approve reactor to spend sell tokens if needed
      const allowance = (currentAllowance as bigint) ?? 0n;
      if (allowance < parsedSellWei) {
        await writeContractAsync({
          address: getTokenAddress(sellToken),
          abi: erc20Abi,
          functionName: "approve",
          args: [CONTRACTS.intentReactor, maxUint256],
          chainId: polkadotHub.id,
        });
        refetchAllowance();
      }

      if (isPrivate) {
        const parsedSell = parseUnits(sellAmount, getTokenDecimals(sellToken));
        const parsedBuy = parseUnits(buyAmount, getTokenDecimals(buyToken));

        const salt = keccak256(encodePacked(["uint256", "address"], [nonce, address]));

        // Commitment must match Rust PVM engine: keccak256 of 5 x 32-byte words
        // Addresses are left-padded to bytes32 (matches Solidity's bytes32(uint256(uint160(addr))))
        const sellAssetBytes32 = pad(getTokenAddress(sellToken), { size: 32 });
        const buyAssetBytes32 = pad(getTokenAddress(buyToken), { size: 32 });
        const commitment = keccak256(
          encodePacked(
            ["bytes32", "uint256", "bytes32", "uint256", "bytes32"],
            [sellAssetBytes32, parsedSell, buyAssetBytes32, parsedBuy, salt]
          )
        );

        const exclusiveFiller = "0x0000000000000000000000000000000000000000" as const;

        // Step 1: Sign the private intent off-chain (EIP-712)
        const sig = await signPrivateIntent({
          maker: address,
          commitment,
          deadline: deadlineBigInt,
          nonce,
        });

        // Step 2: Submit the private intent on-chain (stores commitment)
        const privateIntentTuple = [
          address,
          commitment,
          deadlineBigInt,
          nonce,
          exclusiveFiller,
        ] as const;

        const txHash = await writeContractAsync({
          address: CONTRACTS.intentReactor,
          abi: intentReactorAbi,
          functionName: "submitPrivateIntent",
          args: [privateIntentTuple, sig],
          chainId: polkadotHub.id,
        });

        setSigResult(sig);
        addSessionIntent({
          id: `0x${sig.slice(2, 8)}...${sig.slice(-4)}`,
          sellAsset: sellToken,
          sellAmount: sellAmount,
          buyAsset: buyToken,
          buyAmount: buyAmount,
          deadline: Number(deadlineBigInt),
          status: "active",
          isPrivate: true,
          signature: sig,
          createdAt: Date.now(),
          raw: {
            maker: address,
            sellAssetAddr: getTokenAddress(sellToken),
            sellAmountWei: parsedSell.toString(),
            buyAssetAddr: getTokenAddress(buyToken),
            minBuyAmountWei: parsedBuy.toString(),
            startBuyAmountWei: (parsedBuy + (parsedBuy * 20n) / 100n).toString(),
            decayStartTime: BigInt(Math.floor(Date.now() / 1000)).toString(),
            nonce: nonce.toString(),
            exclusiveFiller,
            commitment,
            salt,
          },
        });

        toast.success("Private intent submitted", {
          description: `${sellAmount} ${sellToken} for at least ${buyAmount} ${buyToken}.`,
          action: {
            label: "View on Explorer",
            onClick: () => window.open(`https://blockscout-testnet.polkadot.io/tx/${txHash}`, "_blank"),
          },
          duration: 10000,
        });
      } else {
        const parsedSellAmount = parseUnits(sellAmount, getTokenDecimals(sellToken));
        const parsedBuyAmount = parseUnits(buyAmount, getTokenDecimals(buyToken));
        const startBuyAmount = parsedBuyAmount + (parsedBuyAmount * 20n) / 100n;
        const decayStartTime = BigInt(Math.floor(Date.now() / 1000));

        const sig = await signIntent({
          maker: address,
          sellAsset: getTokenAddress(sellToken),
          sellAmount: parsedSellAmount,
          buyAsset: getTokenAddress(buyToken),
          minBuyAmount: parsedBuyAmount,
          startBuyAmount,
          deadline: deadlineBigInt,
          decayStartTime,
          nonce,
        });
        setSigResult(sig);
        addSessionIntent({
          id: `0x${sig.slice(2, 8)}...${sig.slice(-4)}`,
          sellAsset: sellToken,
          sellAmount: sellAmount,
          buyAsset: buyToken,
          buyAmount: buyAmount,
          deadline: Number(deadlineBigInt),
          status: "active",
          isPrivate: false,
          signature: sig,
          createdAt: Date.now(),
          raw: {
            maker: address,
            sellAssetAddr: getTokenAddress(sellToken),
            sellAmountWei: parsedSellAmount.toString(),
            buyAssetAddr: getTokenAddress(buyToken),
            minBuyAmountWei: parsedBuyAmount.toString(),
            startBuyAmountWei: startBuyAmount.toString(),
            decayStartTime: decayStartTime.toString(),
            nonce: nonce.toString(),
            exclusiveFiller: "0x0000000000000000000000000000000000000000",
          },
        });

        toast.success("Intent signed", {
          description: `${sellAmount} ${sellToken} for at least ${buyAmount} ${buyToken}.`,
          duration: 6000,
        });
      }
      setStatus("signed");
      setTimeout(() => {
        setStatus("idle");
        isSubmittingRef.current = false;
      }, 4000);
    } catch (err) {
      const description =
        err instanceof Error
          ? err.message.slice(0, 120)
          : "Wallet request was rejected or the transaction reverted.";
      toast.error("Intent creation failed", {
        description,
        duration: 6000,
      });
      setStatus("error");
      isSubmittingRef.current = false;
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const isSigning = isSigningPublic || isSigningPrivate;

  const insufficientBalance =
    sellAmount &&
    sellBalance.balance != null &&
    parseFloat(sellAmount) > 0 &&
    parseUnits(sellAmount, getTokenDecimals(sellToken)) > sellBalance.balance;

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
      <div className="glass-static rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted font-[family-name:var(--font-body)] uppercase tracking-wider">
            You Sell
          </label>
          {showConnectedState && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted font-[family-name:var(--font-body)]">
                Balance: {sellBalance.formatted ?? "—"}
              </span>
              <button
                type="button"
                onClick={handleMax}
                className="text-[10px] font-bold text-polkadot px-1.5 py-0.5 rounded bg-polkadot/8 hover:bg-polkadot/15 transition-colors cursor-pointer"
              >
                MAX
              </button>
            </div>
          )}
        </div>
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
            onChange={(e) => {
              if (e.target.value === buyToken) handleSwapTokens();
              else setSellToken(e.target.value);
            }}
            className="h-10 px-4 rounded-full bg-foreground/5 text-sm font-medium font-[family-name:var(--font-display)] cursor-pointer border-none outline-none"
          >
            {TOKENS.map((t) => (
              <option key={t.symbol} value={t.symbol}>
                {t.symbol}
              </option>
            ))}
          </select>
        </div>
        {insufficientBalance && (
          <p className="text-xs text-danger font-[family-name:var(--font-body)]">
            Insufficient {sellToken} balance
          </p>
        )}
      </div>

      {/* Swap direction arrow */}
      <div className="flex justify-center -my-3 relative z-10">
        <button
          type="button"
          onClick={handleSwapTokens}
          className="w-10 h-10 rounded-xl bg-white border border-foreground/10 flex items-center justify-center shadow-sm hover:border-polkadot/30 hover:shadow-md transition-all cursor-pointer active:scale-95"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-foreground/40">
            <path d="M8 3V13M8 13L4 9M8 13L12 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Buy side */}
      <div className="glass-static rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted font-[family-name:var(--font-body)] uppercase tracking-wider">
            You Buy (minimum)
          </label>
          {showConnectedState && (
            <span className="text-xs text-muted font-[family-name:var(--font-body)]">
              Balance: {buyBalance.formatted ?? "—"}
            </span>
          )}
        </div>
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
            onChange={(e) => {
              if (e.target.value === sellToken) handleSwapTokens();
              else setBuyToken(e.target.value);
            }}
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
              Commitment computed locally and stored on-chain; reveal verified later by the Rust PVM privacy engine
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
        disabled={isSigning || !showConnectedState || !sellAmount || !buyAmount || !!insufficientBalance}
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
            {isPrivate ? "Intent Submitted" : "Intent Signed"}
          </span>
        ) : status === "error" ? (
          "Transaction Failed"
        ) : !showConnectedState ? (
          "Connect Wallet First"
        ) : insufficientBalance ? (
          `Insufficient ${sellToken} Balance`
        ) : isPrivate ? (
          "Sign & Submit Private Intent"
        ) : (
          "Sign Intent"
        )}
      </button>

      {/* Info */}
      <p className="text-center text-xs text-muted-light font-[family-name:var(--font-body)]">
        {showConnectedState
          ? isPrivate
            ? "Private intents require on-chain approval + commitment submission. The later reveal is verified by the Rust PVM."
            : "Public intents are signed off-chain (gasless). No transaction until a solver fills it."
          : "Connect your wallet to sign intents on Polkadot Hub TestNet."}
      </p>
    </form>
  );
}
