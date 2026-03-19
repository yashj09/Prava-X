/**
 * On-chain Event Logger for XCM Intents
 *
 * Watches IntentReactor + SolverRegistry events and prints formatted
 * logs to the terminal. Uses a manual polling loop with raw getLogs
 * (no topic filters) because Polkadot Hub RPC rejects topic arrays.
 *
 * Runs inside Next.js via instrumentation.ts so everything appears
 * in the same `npm run dev` terminal.
 */

import {
  createPublicClient,
  http,
  formatUnits,
  decodeEventLog,
  type Address,
  type Abi,
} from "viem";

// ── Contract addresses from env ──────────────────────────────────────

const REACTOR = process.env.NEXT_PUBLIC_INTENT_REACTOR_ADDRESS as Address;
const REGISTRY = process.env.NEXT_PUBLIC_SOLVER_REGISTRY_ADDRESS as Address;
const USDC = (process.env.NEXT_PUBLIC_MOCK_USDC_ADDRESS ?? "").toLowerCase();
const DOT = (process.env.NEXT_PUBLIC_MOCK_DOT_ADDRESS ?? "").toLowerCase();
const EXPLORER = "https://blockscout-testnet.polkadot.io/tx";

// ── Helpers ──────────────────────────────────────────────────────────

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const PINK = "\x1b[38;5;198m";
const GREEN = "\x1b[38;5;114m";
const CYAN = "\x1b[38;5;117m";
const YELLOW = "\x1b[38;5;221m";
const GRAY = "\x1b[38;5;245m";
const WHITE = "\x1b[38;5;255m";
const BG_PINK = "\x1b[48;5;198m\x1b[38;5;255m";

function timestamp(): string {
  return `${GRAY}[${new Date().toLocaleTimeString("en-US", { hour12: false })}]${RESET}`;
}

function addr(a: string): string {
  return `${CYAN}${a.slice(0, 6)}...${a.slice(-4)}${RESET}`;
}

function tokenName(a: string): string {
  const lower = a.toLowerCase();
  if (lower === USDC) return `${GREEN}USDC${RESET}`;
  if (lower === DOT) return `${YELLOW}DOT${RESET}`;
  return addr(a);
}

function formatTokenAmount(amount: bigint, tokenAddr: string): string {
  const lower = tokenAddr.toLowerCase();
  if (lower === USDC) return formatUnits(amount, 6);
  return formatUnits(amount, 18);
}

function txLink(hash: string): string {
  return `${DIM}${EXPLORER}/${hash}${RESET}`;
}

function line(char = "─", len = 60): string {
  return `${GRAY}${char.repeat(len)}${RESET}`;
}

// ── Event ABIs (only the events we care about) ──────────────────────

const reactorAbi: Abi = [
  {
    type: "event",
    name: "IntentFilled",
    inputs: [
      { name: "intentHash", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "maker", type: "address", indexed: true, internalType: "address" },
      { name: "filler", type: "address", indexed: true, internalType: "address" },
      { name: "sellAsset", type: "address", indexed: false, internalType: "address" },
      { name: "sellAmount", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "buyAsset", type: "address", indexed: false, internalType: "address" },
      { name: "buyAmount", type: "uint256", indexed: false, internalType: "uint256" },
    ],
  },
  {
    type: "event",
    name: "PrivateIntentSubmitted",
    inputs: [
      { name: "commitmentHash", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "maker", type: "address", indexed: true, internalType: "address" },
      { name: "deadline", type: "uint256", indexed: false, internalType: "uint256" },
    ],
  },
  {
    type: "event",
    name: "PrivateIntentFilled",
    inputs: [
      { name: "commitmentHash", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "maker", type: "address", indexed: true, internalType: "address" },
      { name: "filler", type: "address", indexed: true, internalType: "address" },
      { name: "sellAsset", type: "address", indexed: false, internalType: "address" },
      { name: "sellAmount", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "buyAsset", type: "address", indexed: false, internalType: "address" },
      { name: "minBuyAmount", type: "uint256", indexed: false, internalType: "uint256" },
    ],
  },
  {
    type: "event",
    name: "IntentCancelled",
    inputs: [
      { name: "maker", type: "address", indexed: true, internalType: "address" },
      { name: "nonce", type: "uint256", indexed: false, internalType: "uint256" },
    ],
  },
];

const registryAbi: Abi = [
  {
    type: "event",
    name: "SolverStaked",
    inputs: [
      { name: "solver", type: "address", indexed: true, internalType: "address" },
      { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "total", type: "uint256", indexed: false, internalType: "uint256" },
    ],
  },
  {
    type: "event",
    name: "SolverSlashed",
    inputs: [
      { name: "solver", type: "address", indexed: true, internalType: "address" },
      { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
    ],
  },
];

// ── Event handlers ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleEvent(eventName: string, args: Record<string, any>, txHash: string) {
  switch (eventName) {
    case "IntentFilled": {
      const sell = formatTokenAmount(args.sellAmount, args.sellAsset);
      const buy = formatTokenAmount(args.buyAmount, args.buyAsset);
      console.log(`\n${timestamp()} ${GREEN}${BOLD} INTENT FILLED ${RESET}`);
      console.log(`   ${WHITE}Maker${RESET}   ${addr(args.maker)}  ${GRAY}→${RESET}  ${WHITE}Solver${RESET}  ${addr(args.filler)}`);
      console.log(`   ${WHITE}Swap${RESET}    ${BOLD}${sell}${RESET} ${tokenName(args.sellAsset)}  ${PINK}→${RESET}  ${BOLD}${buy}${RESET} ${tokenName(args.buyAsset)}`);
      console.log(`   ${WHITE}Tx${RESET}      ${txLink(txHash)}`);
      console.log(line());
      break;
    }

    case "PrivateIntentSubmitted": {
      const dl = Number(args.deadline);
      const minsLeft = Math.max(0, Math.floor((dl - Date.now() / 1000) / 60));
      const commitShort = `${(args.commitmentHash as string).slice(0, 10)}...${(args.commitmentHash as string).slice(-6)}`;
      console.log(`\n${timestamp()} ${PINK}${BOLD} PRIVATE INTENT SUBMITTED ${RESET}`);
      console.log(`   ${WHITE}Maker${RESET}       ${addr(args.maker)}`);
      console.log(`   ${WHITE}Commitment${RESET}  ${CYAN}${commitShort}${RESET}  ${GRAY}(params hidden)${RESET}`);
      console.log(`   ${WHITE}Deadline${RESET}    ${YELLOW}${minsLeft}m${RESET} from now`);
      console.log(`   ${WHITE}Tx${RESET}          ${txLink(txHash)}`);
      console.log(line());
      break;
    }

    case "PrivateIntentFilled": {
      const sell = formatTokenAmount(args.sellAmount, args.sellAsset);
      const buy = formatTokenAmount(args.minBuyAmount, args.buyAsset);
      const commitShort = `${(args.commitmentHash as string).slice(0, 10)}...${(args.commitmentHash as string).slice(-6)}`;
      console.log(`\n${timestamp()} ${BG_PINK}${BOLD} PRIVATE INTENT FILLED (Cross-VM Verified) ${RESET}`);
      console.log(`   ${WHITE}Commitment${RESET}  ${CYAN}${commitShort}${RESET}`);
      console.log(`   ${WHITE}Maker${RESET}       ${addr(args.maker)}  ${GRAY}→${RESET}  ${WHITE}Solver${RESET}  ${addr(args.filler)}`);
      console.log(`   ${WHITE}Revealed${RESET}    ${BOLD}${sell}${RESET} ${tokenName(args.sellAsset)}  ${PINK}→${RESET}  ${BOLD}${buy}${RESET} ${tokenName(args.buyAsset)}`);
      console.log(`   ${WHITE}Verified${RESET}    ${GREEN}Rust PVM Privacy Engine${RESET} ${GRAY}(keccak256 commitment match)${RESET}`);
      console.log(`   ${WHITE}Tx${RESET}          ${txLink(txHash)}`);
      console.log(line());
      break;
    }

    case "IntentCancelled": {
      console.log(`\n${timestamp()} ${YELLOW} INTENT CANCELLED ${RESET}  Maker: ${addr(args.maker)}  Nonce: ${String(args.nonce)}`);
      break;
    }

    case "SolverStaked": {
      const amt = formatUnits(args.amount, 18);
      const total = formatUnits(args.total, 18);
      console.log(`\n${timestamp()} ${CYAN}${BOLD} SOLVER STAKED ${RESET}`);
      console.log(`   ${WHITE}Solver${RESET}  ${addr(args.solver)}  ${WHITE}+${amt} PAS${RESET}  ${GRAY}(total: ${total} PAS)${RESET}`);
      console.log(line());
      break;
    }

    case "SolverSlashed": {
      const amt = formatUnits(args.amount, 18);
      console.log(`\n${timestamp()} ${YELLOW}${BOLD} SOLVER SLASHED ${RESET}  ${addr(args.solver)}  ${BOLD}-${amt} PAS${RESET}`);
      break;
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────

export function startEventLogger() {
  if (!REACTOR || !REGISTRY) {
    console.log(`${YELLOW}[Event Logger] Missing contract addresses, skipping.${RESET}`);
    return;
  }

  const client = createPublicClient({
    chain: {
      id: 420420417,
      name: "Polkadot Hub TestNet",
      nativeCurrency: { name: "PAS", symbol: "PAS", decimals: 18 },
      rpcUrls: {
        default: { http: ["https://services.polkadothub-rpc.com/testnet"] },
      },
    },
    transport: http("https://services.polkadothub-rpc.com/testnet"),
  });

  // Print banner
  console.log(`\n${line("═", 60)}`);
  console.log(`${PINK}${BOLD}  XCM Intents — Live Event Monitor${RESET}`);
  console.log(`${line("═", 60)}`);
  console.log(`  ${WHITE}Reactor${RESET}   ${CYAN}${REACTOR}${RESET}`);
  console.log(`  ${WHITE}Registry${RESET}  ${CYAN}${REGISTRY}${RESET}`);
  console.log(`  ${WHITE}Chain${RESET}     ${YELLOW}Polkadot Hub TestNet (420420417)${RESET}`);
  console.log(`  ${WHITE}Polling${RESET}   ${GRAY}every 4s${RESET}`);
  console.log(`${line("═", 60)}`);
  console.log(`${GRAY}  Listening for IntentFilled, PrivateIntentSubmitted,`);
  console.log(`  PrivateIntentFilled, SolverStaked, SolverSlashed...${RESET}`);
  console.log(`${line("═", 60)}\n`);

  // Manual polling loop — avoids RPC's broken eth_getLogs topic filters.
  // We fetch ALL logs from each contract address (no topics param) and
  // decode them ourselves with viem's decodeEventLog.
  let lastBlock = 0n;

  const poll = async () => {
    try {
      const currentBlock = await client.getBlockNumber();

      if (lastBlock === 0n) {
        // Start from the current block (don't replay history)
        lastBlock = currentBlock;
        return;
      }

      if (currentBlock <= lastBlock) return;

      const fromBlock = lastBlock + 1n;
      const toBlock = currentBlock;
      lastBlock = currentBlock;

      // Fetch raw logs from both contracts — NO topic filters
      const [reactorLogs, registryLogs] = await Promise.all([
        client.request({
          method: "eth_getLogs",
          params: [{
            address: REACTOR,
            fromBlock: `0x${fromBlock.toString(16)}`,
            toBlock: `0x${toBlock.toString(16)}`,
          }],
        }),
        client.request({
          method: "eth_getLogs",
          params: [{
            address: REGISTRY,
            fromBlock: `0x${fromBlock.toString(16)}`,
            toBlock: `0x${toBlock.toString(16)}`,
          }],
        }),
      ]);

      // Decode and handle reactor logs
      for (const rawLog of reactorLogs as Array<{ topics: `0x${string}`[]; data: `0x${string}`; transactionHash: string }>) {
        try {
          const decoded = decodeEventLog({
            abi: reactorAbi,
            data: rawLog.data,
            topics: rawLog.topics,
          });
          handleEvent(decoded.eventName, decoded.args as Record<string, unknown>, rawLog.transactionHash);
        } catch {
          // Unknown event from this contract — ignore
        }
      }

      // Decode and handle registry logs
      for (const rawLog of registryLogs as Array<{ topics: `0x${string}`[]; data: `0x${string}`; transactionHash: string }>) {
        try {
          const decoded = decodeEventLog({
            abi: registryAbi,
            data: rawLog.data,
            topics: rawLog.topics,
          });
          handleEvent(decoded.eventName, decoded.args as Record<string, unknown>, rawLog.transactionHash);
        } catch {
          // Unknown event from this contract — ignore
        }
      }
    } catch (err) {
      // Only log truly unexpected errors, not RPC hiccups
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("Failed to filter")) {
        console.error(`${YELLOW}[Event Logger] Poll error: ${msg}${RESET}`);
      }
    }
  };

  // Poll every 4 seconds
  setInterval(poll, 4_000);
  // Run first poll immediately
  poll();
}
