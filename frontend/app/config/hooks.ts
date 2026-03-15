"use client";

import { useReadContract, useWriteContract, useSignTypedData } from "wagmi";
import { parseEther } from "viem";
import { CONTRACTS } from "./contracts";
import intentReactorAbi from "./abi/IntentReactor.json";
import solverRegistryAbi from "./abi/SolverRegistry.json";

// EIP-712 domain for intent signing
const EIP712_DOMAIN = {
  name: "XCMIntents",
  version: "1",
} as const;

const PRIVATE_INTENT_TYPES = {
  PrivateIntent: [
    { name: "maker", type: "address" },
    { name: "commitment", type: "bytes32" },
    { name: "deadline", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "exclusiveFiller", type: "address" },
  ],
} as const;

const INTENT_TYPES = {
  Intent: [
    { name: "maker", type: "address" },
    { name: "sellAsset", type: "address" },
    { name: "sellAmount", type: "uint256" },
    { name: "buyAsset", type: "address" },
    { name: "minBuyAmount", type: "uint256" },
    { name: "startBuyAmount", type: "uint256" },
    { name: "deadline", type: "uint256" },
    { name: "decayStartTime", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "exclusiveFiller", type: "address" },
  ],
} as const;

// --- Intent Signing ---

export function useSignIntent() {
  const { signTypedDataAsync, isPending, isSuccess, data } =
    useSignTypedData();

  const signIntent = async (params: {
    maker: `0x${string}`;
    sellAsset: `0x${string}`;
    sellAmount: bigint;
    buyAsset: `0x${string}`;
    minBuyAmount: bigint;
    startBuyAmount: bigint;
    deadline: bigint;
    nonce: bigint;
  }) => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    return signTypedDataAsync({
      domain: EIP712_DOMAIN,
      types: INTENT_TYPES,
      primaryType: "Intent",
      message: {
        ...params,
        decayStartTime: now,
        exclusiveFiller: "0x0000000000000000000000000000000000000000" as const,
      },
    });
  };

  return { signIntent, isPending, isSuccess, signature: data };
}

export function useSignPrivateIntent() {
  const { signTypedDataAsync, isPending, isSuccess, data } =
    useSignTypedData();

  const signPrivateIntent = async (params: {
    maker: `0x${string}`;
    commitment: `0x${string}`;
    deadline: bigint;
    nonce: bigint;
  }) => {
    return signTypedDataAsync({
      domain: EIP712_DOMAIN,
      types: PRIVATE_INTENT_TYPES,
      primaryType: "PrivateIntent",
      message: {
        ...params,
        exclusiveFiller: "0x0000000000000000000000000000000000000000" as const,
      },
    });
  };

  return { signPrivateIntent, isPending, isSuccess, signature: data };
}

// --- Solver Registry ---

export function useSolverStake() {
  const { writeContractAsync, isPending } = useWriteContract();

  const stake = async (amount: string) => {
    return writeContractAsync({
      address: CONTRACTS.solverRegistry,
      abi: solverRegistryAbi,
      functionName: "stake",
      value: parseEther(amount),
    });
  };

  return { stake, isPending };
}

export function useSolverInfo(address: `0x${string}` | undefined) {
  const { data: stakeData } = useReadContract({
    address: CONTRACTS.solverRegistry,
    abi: solverRegistryAbi,
    functionName: "getStake",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: isActive } = useReadContract({
    address: CONTRACTS.solverRegistry,
    abi: solverRegistryAbi,
    functionName: "isActiveSolver",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  return {
    stake: stakeData as bigint | undefined,
    isActive: isActive as boolean | undefined,
  };
}

// --- Intent Reactor reads ---

export function useNonceUsed(
  maker: `0x${string}` | undefined,
  nonce: bigint | undefined
) {
  const { data } = useReadContract({
    address: CONTRACTS.intentReactor,
    abi: intentReactorAbi,
    functionName: "nonceUsed",
    args: maker && nonce !== undefined ? [maker, nonce] : undefined,
    query: { enabled: !!maker && nonce !== undefined },
  });

  return data as boolean | undefined;
}
