/**
 * vnkr-api.js — VNKR API Service for React Frontend
 * Fetch wrapper cho RPC + REST API endpoints
 */

const API_URL = process.env.REACT_APP_API_URL || "https://api.vnkr.vn/v1";
const RPC_URL = process.env.REACT_APP_RPC_URL || "https://testnet-rpc.vnkr.vn";

// ─── Mock data fallbacks ────────────────────────────────────────────────────
const MOCK = {
  marketData: [
    { symbol: "VNKR", name: "VNKR Token", price: 0.0842, change24h: 5.23, marketCap: 84200000, volume24h: 1284000 },
    { symbol: "BTC", name: "Bitcoin", price: 67420, change24h: -1.2, marketCap: 1320000000000, volume24h: 28000000000 },
    { symbol: "ETH", name: "Ethereum", price: 3840, change24h: 2.8, marketCap: 461000000000, volume24h: 14000000000 },
    { symbol: "BNB", name: "BNB", price: 598, change24h: 0.5, marketCap: 89000000000, volume24h: 1200000000 },
    { symbol: "USDT", name: "Tether", price: 1.00, change24h: 0.01, marketCap: 110000000000, volume24h: 50000000000 },
    { symbol: "ADA", name: "Cardano", price: 0.52, change24h: -3.1, marketCap: 18000000000, volume24h: 620000000 },
    { symbol: "XRP", name: "Ripple", price: 0.614, change24h: 1.4, marketCap: 34000000000, volume24h: 1800000000 },
    { symbol: "LINK", name: "Chainlink", price: 18.24, change24h: -0.8, marketCap: 10200000000, volume24h: 520000000 },
  ],
  stakingStats: { apr: 15.4, tvl: 48200000, totalStakers: 3842, yourStaked: 0, pendingRewards: 0 },
  blocks: Array.from({ length: 10 }, (_, i) => ({
    number: 182440 - i,
    miner: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    txCount: Math.floor(Math.random() * 40) + 5,
    timestamp: Math.floor(Date.now() / 1000) - i * 12,
    gasUsed: Math.floor(Math.random() * 8000000) + 2000000,
  })),
  proposals: [
    { id: 1, title: "Tăng phần thưởng staking từ 15% lên 18% APR", status: "Active", votesFor: 8200000, votesAgainst: 1800000, endTime: Math.floor(Date.now() / 1000) + 86400 * 3 },
    { id: 2, title: "Tích hợp NFT Marketplace vào Game Hub", status: "Active", votesFor: 12400000, votesAgainst: 3200000, endTime: Math.floor(Date.now() / 1000) + 86400 * 7 },
    { id: 3, title: "Mở rộng Validator Node sang Singapore", status: "Passed", votesFor: 18000000, votesAgainst: 2000000, endTime: Math.floor(Date.now() / 1000) - 86400 },
  ],
};

// ─── Generic fetch helpers ─────────────────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
  try {
    const res = await fetch(API_URL + endpoint, {
      headers: { "Content-Type": "application/json", ...options.headers },
      ...options,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return null;
  }
}

async function rpcCall(method, params = []) {
  try {
    const res = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method, params, id: Date.now() }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.result;
  } catch {
    return null;
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────
const VNKRApi = {
  // Market
  getMarketData: async () => (await apiFetch("/market/overview")) || MOCK.marketData,
  getVNKRPrice: async () => (await apiFetch("/price/vnkr")) || { usd: 0.0842, change24h: 5.23 },

  // Staking
  getStakingStats: async () => (await apiFetch("/staking/stats")) || MOCK.stakingStats,
  getUserStaking: async (address) =>
    (await apiFetch(`/staking/user/${address}`)) || { staked: 0, rewards: 0 },
  stake: async (amount, days) =>
    (await apiFetch("/staking/stake", {
      method: "POST",
      body: JSON.stringify({ amount, days }),
    })) || { success: false, error: "API not available" },
  unstake: async () =>
    (await apiFetch("/staking/unstake", { method: "POST" })) || { success: false },
  claimRewards: async () =>
    (await apiFetch("/staking/claim", { method: "POST" })) || { success: false },

  // Faucet
  requestFaucet: async (address) => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return { success: false, error: "Invalid wallet address" };
    }
    return (
      (await apiFetch("/faucet/request", {
        method: "POST",
        body: JSON.stringify({ address }),
      })) || {
        success: true,
        txHash: "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
        amount: "100",
        symbol: "Test-VNKR",
      }
    );
  },

  // Explorer
  getLatestBlocks: async (limit = 10) =>
    (await apiFetch(`/blocks/latest?limit=${limit}`)) || MOCK.blocks.slice(0, limit),
  getLatestTxs: async (limit = 10) =>
    (await apiFetch(`/transactions/latest?limit=${limit}`)) || [],
  getBlock: async (numberOrHash) =>
    await rpcCall("eth_getBlockByNumber", [
      typeof numberOrHash === "number"
        ? "0x" + numberOrHash.toString(16)
        : numberOrHash,
      true,
    ]),
  getTx: async (hash) => await rpcCall("eth_getTransactionByHash", [hash]),
  getBalance: async (address) => {
    const hex = await rpcCall("eth_getBalance", [address, "latest"]);
    return hex ? parseInt(hex, 16) / 1e18 : 0;
  },
  getBlockNumber: async () => {
    const hex = await rpcCall("eth_blockNumber");
    return hex ? parseInt(hex, 16) : 182440;
  },

  // DAO
  getProposals: async () => (await apiFetch("/dao/proposals")) || MOCK.proposals,
  createProposal: async (title, description) =>
    await apiFetch("/dao/proposals", {
      method: "POST",
      body: JSON.stringify({ title, description }),
    }),
  vote: async (proposalId, support) =>
    await apiFetch("/dao/vote", {
      method: "POST",
      body: JSON.stringify({ proposalId, support }),
    }),
};

export default VNKRApi;
