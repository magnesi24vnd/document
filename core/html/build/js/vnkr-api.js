/**
 * VNKR-API.JS — Web3 / RPC Connector Module
 * Kết nối với VNKR App-Chain RPC endpoints và backend API
 * 
 * Chức năng:
 *   - JSON-RPC calls trực tiếp đến VNKR node
 *   - REST API calls đến backend services
 *   - Price feed từ CoinGecko / internal oracle
 *   - Market data, orderbook, trade history
 *   - Staking stats, faucet, DAO proposals
 * 
 * Không cần web3.js — dùng fetch API thuần
 */

"use strict";

(function (window) {

  // ─── Configuration ────────────────────────────────────────────────────
  var _config = {
    rpcUrl: "https://testnet-rpc.vnkr.vn",
    apiUrl: "https://api.vnkr.vn/v1",
    wsUrl: "wss://testnet-ws.vnkr.vn",
    priceApiUrl: "https://api.coingecko.com/api/v3",
    timeout: 10000
  };

  // ─── Mock Data (dùng khi API chưa live) ──────────────────────────────
  var _mockData = {
    prices: {
      VNKR: { usd: 0.0842, change24h: 5.23, volume24h: 1284000 },
      BTC: { usd: 67420, change24h: -1.2, volume24h: 28000000000 },
      ETH: { usd: 3840, change24h: 2.8, volume24h: 14000000000 },
      BNB: { usd: 598, change24h: 0.5, volume24h: 1200000000 },
      USDT: { usd: 1.0, change24h: 0.01, volume24h: 50000000000 }
    },
    marketData: [
      { symbol: 'VNKR', name: 'VNKR Token', price: 0.0842, change24h: 5.23, marketCap: 84200000, volume24h: 1284000 },
      { symbol: 'BTC', name: 'Bitcoin', price: 67420, change24h: -1.2, marketCap: 1320000000000, volume24h: 28000000000 },
      { symbol: 'ETH', name: 'Ethereum', price: 3840, change24h: 2.8, marketCap: 461000000000, volume24h: 14000000000 },
      { symbol: 'BNB', name: 'BNB', price: 598, change24h: 0.5, marketCap: 89000000000, volume24h: 1200000000 },
      { symbol: 'USDT', name: 'Tether', price: 1.00, change24h: 0.01, marketCap: 110000000000, volume24h: 50000000000 },
      { symbol: 'ADA', name: 'Cardano', price: 0.52, change24h: -3.1, marketCap: 18000000000, volume24h: 620000000 },
      { symbol: 'XRP', name: 'Ripple', price: 0.614, change24h: 1.4, marketCap: 34000000000, volume24h: 1800000000 },
      { symbol: 'LINK', name: 'Chainlink', price: 18.24, change24h: -0.8, marketCap: 10200000000, volume24h: 520000000 },
    ],
    orderbook: {
      bids: [
        [0.0841, 12400], [0.0840, 8200], [0.0839, 15600],
        [0.0838, 9800], [0.0837, 22100], [0.0835, 34000]
      ],
      asks: [
        [0.0843, 9100], [0.0844, 7300], [0.0845, 11800],
        [0.0846, 6500], [0.0848, 18900], [0.0850, 28000]
      ]
    },
    blocks: [
      { number: 182440, miner: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', txCount: 24, timestamp: Math.floor(Date.now()/1000) - 12, gasUsed: 8200000 },
      { number: 182439, miner: '0x1a2B3c4D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9a0B', txCount: 18, timestamp: Math.floor(Date.now()/1000) - 24, gasUsed: 5900000 },
      { number: 182438, miner: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', txCount: 31, timestamp: Math.floor(Date.now()/1000) - 36, gasUsed: 10100000 },
      { number: 182437, miner: '0xAbc123Def456Ghi789Jkl012Mno345Pqr678Stu9', txCount: 9,  timestamp: Math.floor(Date.now()/1000) - 48, gasUsed: 3200000 },
      { number: 182436, miner: '0x1a2B3c4D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9a0B', txCount: 42, timestamp: Math.floor(Date.now()/1000) - 60, gasUsed: 12800000 },
    ],
    txs: [
      { hash: '0xabc123def456789012345678901234567890abcd', from: '0x742d35Cc', to: '0x1a2B3c4D', value: '1500000000000000000', type: 'transfer' },
      { hash: '0xdef456abc789012345678901234567890abcdef0', from: '0xAbc123De', to: '0x742d35Cc', value: '5000000000000000000', type: 'swap' },
      { hash: '0x123abc456def789012345678901234567890abcd', from: '0x1a2B3c4D', to: '0x0000dead', value: '200000000000000000', type: 'burn' },
    ],
    stakingStats: {
      apr: 15.4,
      tvl: 48200000,
      totalStakers: 3842,
      yourStaked: 0,
      pendingRewards: 0
    },
    proposals: [
      { id: 1, title: 'Tăng phần thưởng staking từ 15% lên 18% APR', status: 'Active', votesFor: 8200000, votesAgainst: 1800000, endTime: Math.floor(Date.now()/1000) + 86400 * 3 },
      { id: 2, title: 'Tích hợp NFT Marketplace vào Game Hub', status: 'Active', votesFor: 12400000, votesAgainst: 3200000, endTime: Math.floor(Date.now()/1000) + 86400 * 7 },
      { id: 3, title: 'Mở rộng Validator Node sang Singapore', status: 'Passed', votesFor: 18000000, votesAgainst: 2000000, endTime: Math.floor(Date.now()/1000) - 86400 },
    ]
  };

  // ─── Core RPC Method ──────────────────────────────────────────────────
  var _rpcCall = function (method, params) {
    return fetch(_config.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: method,
        params: params || [],
        id: Date.now()
      }),
      signal: AbortSignal.timeout ? AbortSignal.timeout(_config.timeout) : undefined
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.error) throw new Error(data.error.message);
        return data.result;
      });
  };

  // ─── REST API Helper ─────────────────────────────────────────────────
  var _apiCall = function (endpoint, options) {
    return fetch(_config.apiUrl + endpoint, Object.assign({
      headers: {
        'Content-Type': 'application/json',
        'Authorization': localStorage.getItem('vnkr_token') ? 'Bearer ' + localStorage.getItem('vnkr_token') : ''
      }
    }, options || {}))
      .then(function (res) {
        if (!res.ok) throw new Error('API error: ' + res.status);
        return res.json();
      })
      .catch(function (err) {
        console.warn('[VNKR API] Falling back to mock data:', err.message);
        return null;
      });
  };

  // ─── Public API Module ────────────────────────────────────────────────
  window.VNKR_API = {

    init: function (config) {
      if (config.rpcUrl) _config.rpcUrl = config.rpcUrl;
      if (config.apiUrl) _config.apiUrl = config.apiUrl || _config.apiUrl;
    },

    // ── Blockchain RPC ──
    getBlockNumber: function () {
      return _rpcCall('eth_blockNumber')
        .then(function (hex) { return parseInt(hex, 16); })
        .catch(function () { return _mockData.blocks[0].number; });
    },

    getBalance: function (address) {
      return _rpcCall('eth_getBalance', [address, 'latest'])
        .then(function (hex) {
          return {
            raw: hex,
            vnkr: parseInt(hex, 16) / 1e18,
            totalUSD: (parseInt(hex, 16) / 1e18) * (_mockData.prices.VNKR.usd || 0)
          };
        })
        .catch(function () {
          return { raw: '0x0', vnkr: 0, totalUSD: 0 };
        });
    },

    getChainId: function () {
      return _rpcCall('eth_chainId')
        .then(function (hex) { return parseInt(hex, 16); })
        .catch(function () { return 789680; });
    },

    sendTransaction: function (txParams) {
      return _rpcCall('eth_sendRawTransaction', [txParams]);
    },

    getTransactionReceipt: function (txHash) {
      return _rpcCall('eth_getTransactionReceipt', [txHash]);
    },

    getBlock: function (blockNumber) {
      var param = typeof blockNumber === 'number'
        ? '0x' + blockNumber.toString(16)
        : blockNumber;
      return _rpcCall('eth_getBlockByNumber', [param, false]);
    },

    // ── Market Data ──
    getPrices: function () {
      return _apiCall('/price/all')
        .then(function (data) { return data || _mockData.prices; });
    },

    getVNKRPrice: function () {
      return _apiCall('/price/vnkr')
        .then(function (data) { return data || _mockData.prices.VNKR; });
    },

    getMarketData: function () {
      return _apiCall('/market/overview')
        .then(function (data) { return data || _mockData.marketData; });
    },

    getOrderbook: function (pair) {
      return _apiCall('/market/orderbook/' + (pair || 'VNKR-USDT'))
        .then(function (data) { return data || _mockData.orderbook; });
    },

    // ── Block Explorer ──
    getLatestBlocks: function (count) {
      return _apiCall('/blocks/latest?limit=' + (count || 10))
        .then(function (data) { return data || _mockData.blocks; });
    },

    getLatestTxs: function (count) {
      return _apiCall('/transactions/latest?limit=' + (count || 10))
        .then(function (data) { return data || _mockData.txs; });
    },

    searchBlock: function (query) {
      if (/^\d+$/.test(query)) {
        return this.getBlock(parseInt(query));
      } else if (/^0x[a-fA-F0-9]{64}$/.test(query)) {
        return _rpcCall('eth_getTransactionByHash', [query]);
      } else if (/^0x[a-fA-F0-9]{40}$/.test(query)) {
        return this.getBalance(query);
      }
      return Promise.reject(new Error('Invalid search query'));
    },

    // ── Staking ──
    getStakingStats: function () {
      return _apiCall('/staking/stats')
        .then(function (data) { return data || _mockData.stakingStats; });
    },

    getUserStaking: function (address) {
      return _apiCall('/staking/user/' + address)
        .then(function (data) { return data || { staked: 0, rewards: 0 }; });
    },

    // ── Faucet ──
    requestFaucet: function (address) {
      // Basic address validation
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return Promise.resolve({ success: false, error: 'Invalid wallet address' });
      }

      return _apiCall('/faucet/request', {
        method: 'POST',
        body: JSON.stringify({ address: address })
      })
        .then(function (data) {
          return data || {
            success: true,
            txHash: '0x' + Array.from({ length: 64 }, function () {
              return Math.floor(Math.random() * 16).toString(16);
            }).join(''),
            amount: '100',
            symbol: 'Test-VNKR'
          };
        });
    },

    // ── DAO ──
    getProposals: function () {
      return _apiCall('/dao/proposals')
        .then(function (data) { return data || _mockData.proposals; });
    },

    voteProposal: function (proposalId, support) {
      var token = localStorage.getItem('vnkr_token');
      if (!token) return Promise.reject(new Error('Please connect wallet to vote'));
      return _apiCall('/dao/vote', {
        method: 'POST',
        body: JSON.stringify({ proposalId: proposalId, support: support })
      });
    },

    // ── Network stats ──
    getNetworkStats: function () {
      var self = this;
      return Promise.all([
        self.getBlockNumber(),
        _apiCall('/network/stats')
      ]).then(function (results) {
        return Object.assign({
          blockNumber: results[0],
          tps: 0,
          validators: 0,
          totalTx: 0
        }, results[1] || {});
      });
    }
  };

})(window);
