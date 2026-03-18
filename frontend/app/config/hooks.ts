"use client";

import { useReadContract, useWriteContract, useSignTypedData, useBalance } from "wagmi";
import { parseEther, erc20Abi } from "viem";
import { CONTRACTS, TOKENS } from "./contracts";
import { polkadotHub } from "./wagmi";
import intentReactorAbi from "./abi/IntentReactor.json";
import solverRegistryAbi from "./abi/SolverRegistry.json";

const CHAIN_ID = polkadotHub.id;

// EIP-712 domain for intent signing
// Must include chainId + verifyingContract to match OpenZeppelin's EIP712 in the contract
const EIP712_DOMAIN = {
  name: "XCMIntents",
  version: "1",
  chainId: CHAIN_ID,
  verifyingContract: CONTRACTS.intentReactor,
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
    decayStartTime: bigint;
    nonce: bigint;
  }) => {
    return signTypedDataAsync({
      domain: EIP712_DOMAIN,
      types: INTENT_TYPES,
      primaryType: "Intent",
      message: {
        ...params,
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
      chainId: CHAIN_ID,
    });
  };

  return { stake, isPending };
}

export function useSolverInfo(address: `0x${string}` | undefined) {
  const { data: stakeData, refetch: refetchStake } = useReadContract({
    address: CONTRACTS.solverRegistry,
    abi: solverRegistryAbi,
    functionName: "getStake",
    args: address ? [address] : undefined,
    chainId: CHAIN_ID,
    query: { enabled: !!address },
  });

  const { data: isActive, refetch: refetchActive } = useReadContract({
    address: CONTRACTS.solverRegistry,
    abi: solverRegistryAbi,
    functionName: "isActiveSolver",
    args: address ? [address] : undefined,
    chainId: CHAIN_ID,
    query: { enabled: !!address },
  });

  const refetch = () => {
    refetchStake();
    refetchActive();
  };

  return {
    stake: stakeData as bigint | undefined,
    isActive: isActive as boolean | undefined,
    refetch,
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
    chainId: CHAIN_ID,
    query: { enabled: !!maker && nonce !== undefined },
  });

  return data as boolean | undefined;
}

// --- Token Balances ---

export function useTokenBalance(
  address: `0x${string}` | undefined,
  tokenSymbol: string
) {
  const token = TOKENS.find((t) => t.symbol === tokenSymbol);
  const isNative = !token?.address;

  const { data: nativeBalance, refetch: refetchNative } = useBalance({
    address,
    chainId: CHAIN_ID,
    query: { enabled: !!address && isNative },
  });

  const { data: erc20Balance, refetch: refetchErc20 } = useReadContract({
    address: token?.address as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: CHAIN_ID,
    query: { enabled: !!address && !isNative && !!token?.address },
  });

  const refetch = () => {
    if (isNative) refetchNative();
    else refetchErc20();
  };

  if (isNative) {
    const val = nativeBalance?.value;
    return {
      balance: val,
      decimals: 18,
      formatted: val != null ? (Number(val) / 1e18).toFixed(4) : undefined,
      refetch,
    };
  }

  return {
    balance: erc20Balance as bigint | undefined,
    decimals: token?.decimals ?? 18,
    formatted: erc20Balance != null
      ? (Number(erc20Balance as bigint) / 10 ** (token?.decimals ?? 18)).toFixed(
          token?.decimals === 6 ? 2 : 4
        )
      : undefined,
    refetch,
  };
}
