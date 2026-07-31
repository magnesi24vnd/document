/**
 * VNKR.JS — Main Module for VNKR App-Chain Frontend
 * Biến thư mục HTML tĩnh thành frontend hoàn chỉnh cho hệ sinh thái VNKR
 * 
 * Bao gồm:
 *   - VNKR Network configuration
 *   - Rebranding BitCloud → VNKR
 *   - Global state management
 *   - Navigation & routing cho static pages
 *   - Dark mode persistence
 *   - Notification system
 *   - Auth state handling
 * 
 * Dependencies: jQuery, vnkr-api.js, vnkr-wallet.js, vnkr-charts.js
 */

"use strict";

// ─── VNKR Network Configuration ─────────────────────────────────────────────
window.VNKR_CONFIG = {
  networkName: "VNKR Testnet",
  chainId: 789680,
  chainIdHex: "0xC0F50",
  rpcUrl: "https://testnet-rpc.vnkr.vn",
  wsUrl: "wss://testnet-ws.vnkr.vn",
  explorerUrl: "https://scan.vnkr.vn",
  faucetUrl: "https://faucet.vnkr.vn",
  nativeCurrency: {
    name: "VNKR",
    symbol: "VNKR",
    decimals: 18
  },
  // Mainnet config (locked until launch)
  mainnet: {
    networkName: "VNKR Mainnet",
    chainId: 78968,
    chainIdHex: "0x13488",
    rpcUrl: "https://rpc.vnkr.vn",
    wsUrl: "wss://ws.vnkr.vn"
  }
};

// ─── Global State ────────────────────────────────────────────────────────────
window.VNKR = {
  state: {
    isConnected: false,
    walletAddress: null,
    balance: "0",
    network: null,
    isTestnet: true,
    notifications: [],
    prices: {
      VNKR: { usd: 0, change24h: 0 },
      BTC: { usd: 0, change24h: 0 },
      ETH: { usd: 0, change24h: 0 }
    }
  },

  // ─── Rebranding: BitCloud → VNKR ─────────────────────────────────────
  rebrand: function () {
    // Thay đổi title trang
    document.title = document.title.replace(/BitCloud/g, "VNKR");

    // Thay logo alt text
    document.querySelectorAll('img[alt="BitCloud"]').forEach(function (img) {
      img.alt = "VNKR";
    });

    // Thay copyright text nếu có
    document.querySelectorAll('.footer__copyright').forEach(function (el) {
      el.innerHTML = el.innerHTML.replace(/BitCloud/g, "VNKR.VN");
    });

    // Thêm VNKR network badge vào header
    var header = document.querySelector('.header__control');
    if (header && !document.querySelector('.vnkr-network-badge')) {
      var badge = document.createElement('div');
      badge.className = 'vnkr-network-badge';
      badge.innerHTML = '<span class="vnkr-badge-dot"></span>VNKR Testnet';
      badge.style.cssText = [
        'display:flex', 'align-items:center', 'gap:5px',
        'font-size:11px', 'font-weight:600', 'color:#58BD7D',
        'background:rgba(88,189,125,0.1)', 'border:1px solid rgba(88,189,125,0.3)',
        'border-radius:20px', 'padding:3px 10px', 'margin-left:8px',
        'cursor:pointer'
      ].join(';');
      badge.querySelector('.vnkr-badge-dot').style.cssText = [
        'width:7px', 'height:7px', 'border-radius:50%',
        'background:#58BD7D', 'animation:vnkr-pulse 2s infinite'
      ].join(';');
      badge.addEventListener('click', function () {
        window.VNKR.wallet.showNetworkModal();
      });
      header.prepend(badge);
    }

    // Injects pulse animation
    if (!document.getElementById('vnkr-style')) {
      var style = document.createElement('style');
      style.id = 'vnkr-style';
      style.textContent = [
        '@keyframes vnkr-pulse {',
        '  0%,100%{opacity:1;transform:scale(1)}',
        '  50%{opacity:.5;transform:scale(1.3)}',
        '}',
        '.vnkr-toast{position:fixed;bottom:20px;right:20px;z-index:9999;',
        '  background:#23262F;border:1px solid #353945;border-radius:12px;',
        '  padding:14px 18px;color:#FCFCFD;font-size:13px;min-width:260px;',
        '  box-shadow:0 8px 32px rgba(0,0,0,.4);display:flex;align-items:center;gap:10px;',
        '  animation:vnkr-slide-in .3s ease}',
        '.vnkr-toast.success .vnkr-toast-icon{color:#58BD7D}',
        '.vnkr-toast.error .vnkr-toast-icon{color:#FF6838}',
        '.vnkr-toast.info .vnkr-toast-icon{color:#3772FF}',
        '@keyframes vnkr-slide-in{from{transform:translateX(120%);opacity:0}to{transform:translateX(0);opacity:1}}',
        '.vnkr-wallet-btn{background:linear-gradient(135deg,#3772FF,#7B3FE4)!important;',
        '  border:none!important;color:#fff!important}',
        '.vnkr-wallet-btn:hover{opacity:.9;transform:translateY(-1px)}'
      ].join('\n');
      document.head.appendChild(style);
    }
  },

  // ─── Toast Notification System ───────────────────────────────────────
  toast: function (message, type, duration) {
    type = type || 'info';
    duration = duration || 4000;

    var icons = {
      success: '✓',
      error: '✕',
      info: 'ℹ',
      warning: '⚠'
    };

    var toast = document.createElement('div');
    toast.className = 'vnkr-toast ' + type;
    toast.innerHTML = '<span class="vnkr-toast-icon">' + (icons[type] || 'ℹ') + '</span>' +
      '<span>' + message + '</span>';

    // Remove existing toasts
    document.querySelectorAll('.vnkr-toast').forEach(function (t) { t.remove(); });
    document.body.appendChild(toast);

    setTimeout(function () {
      toast.style.animation = 'none';
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(function () { toast.remove(); }, 300);
    }, duration);
  },

  // ─── Format Utilities ────────────────────────────────────────────────
  utils: {
    formatAddress: function (addr) {
      if (!addr) return '';
      return addr.slice(0, 6) + '...' + addr.slice(-4);
    },

    formatBalance: function (balance, decimals) {
      decimals = decimals || 18;
      if (!balance || balance === '0') return '0.000';
      try {
        var bn = parseFloat(balance) / Math.pow(10, decimals);
        return bn.toLocaleString('en-US', { maximumFractionDigits: 4 });
      } catch (e) {
        return '0.000';
      }
    },

    formatUSD: function (amount) {
      return '$' + parseFloat(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    },

    formatNumber: function (num) {
      if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
      if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
      if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
      return num.toFixed(2);
    },

    copyToClipboard: function (text) {
      navigator.clipboard.writeText(text).then(function () {
        window.VNKR.toast('Copied to clipboard!', 'success', 2000);
      }).catch(function () {
        // Fallback
        var ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        window.VNKR.toast('Copied!', 'success', 2000);
      });
    },

    timeAgo: function (timestamp) {
      var now = Date.now();
      var diff = Math.floor((now - timestamp * 1000) / 1000);
      if (diff < 60) return diff + 's ago';
      if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
      if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
      return Math.floor(diff / 86400) + 'd ago';
    }
  },

  // ─── Auth State Management ───────────────────────────────────────────
  auth: {
    getToken: function () {
      return localStorage.getItem('vnkr_token');
    },

    isLoggedIn: function () {
      return !!this.getToken() || !!window.VNKR.state.walletAddress;
    },

    logout: function () {
      localStorage.removeItem('vnkr_token');
      localStorage.removeItem('vnkr_user');
      window.VNKR.state.walletAddress = null;
      window.VNKR.state.isConnected = false;
      window.VNKR.updateHeaderUI(false);
      window.VNKR.toast('Logged out successfully', 'info');
      setTimeout(function () {
        window.location.href = '/sign-in.html';
      }, 1000);
    }
  },

  // ─── Update Header UI based on auth state ───────────────────────────
  updateHeaderUI: function (isConnected, address) {
    var walletBtn = document.querySelector('.header__button[href="wallet-overview.html"]');
    var btns = document.querySelector('.header__btns');

    if (isConnected && address) {
      // Show wallet address + hide sign-in btns
      if (walletBtn) {
        walletBtn.textContent = window.VNKR.utils.formatAddress(address);
        walletBtn.classList.add('vnkr-wallet-btn');
      }
      if (btns) btns.style.display = 'none';

      // Update avatar dropdown logout
      var logoutLink = document.querySelector('.header__el[href="#"]');
      if (logoutLink) {
        logoutLink.addEventListener('click', function (e) {
          e.preventDefault();
          window.VNKR.auth.logout();
        });
      }
    } else {
      if (walletBtn) walletBtn.textContent = 'Wallet';
      if (btns) btns.style.display = '';
    }
  },

  // ─── Page-specific initialization ───────────────────────────────────
  initPage: function () {
    var page = window.location.pathname.split('/').pop() || 'index.html';

    switch (page) {
      case 'index.html':
      case '':
        this.pages.home();
        break;
      case 'exchange.html':
        this.pages.exchange();
        break;
      case 'market.html':
        this.pages.market();
        break;
      case 'wallet-overview.html':
        this.pages.wallet();
        break;
      case 'staking.html':
        this.pages.staking();
        break;
      case 'faucet.html':
        this.pages.faucet();
        break;
      case 'explorer.html':
        this.pages.explorer();
        break;
      case 'dao.html':
        this.pages.dao();
        break;
    }
  },

  pages: {
    home: function () {
      window.VNKR.api.getPrices().then(function (prices) {
        window.VNKR.state.prices = prices;
        // Update hero section price ticker
        var ticker = document.querySelector('.crypto-ticker');
        if (ticker && prices.VNKR) {
          ticker.innerHTML = 'VNKR Price: $' + prices.VNKR.usd;
        }
      });
    },
    exchange: function () {
      if (window.VNKR_CHARTS) window.VNKR_CHARTS.initExchange();
      window.VNKR.api.getOrderbook('VNKR/USDT');
    },
    market: function () {
      window.VNKR.api.getMarketData().then(function (data) {
        window.VNKR.renderMarketTable(data);
      });
    },
    wallet: function () {
      if (!window.VNKR.auth.isLoggedIn()) {
        window.VNKR.toast('Please connect your wallet first', 'warning');
      } else {
        window.VNKR.api.getBalance(window.VNKR.state.walletAddress).then(function (bal) {
          window.VNKR.renderWalletBalance(bal);
        });
      }
    },
    staking: function () {
      window.VNKR.api.getStakingStats().then(function (stats) {
        window.VNKR.renderStakingStats(stats);
      });
    },
    faucet: function () {
      var form = document.querySelector('.faucet-form');
      if (form) {
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          window.VNKR.pages.requestFaucet();
        });
      }
    },
    explorer: function () {
      window.VNKR.api.getLatestBlocks(10).then(function (blocks) {
        window.VNKR.renderBlocks(blocks);
      });
      window.VNKR.api.getLatestTxs(10).then(function (txs) {
        window.VNKR.renderTxs(txs);
      });
    },
    dao: function () {
      window.VNKR.api.getProposals().then(function (proposals) {
        window.VNKR.renderProposals(proposals);
      });
    },
    requestFaucet: function () {
      var address = document.querySelector('#faucet-address');
      if (!address || !address.value) {
        window.VNKR.toast('Please enter a wallet address', 'error');
        return;
      }
      window.VNKR.api.requestFaucet(address.value).then(function (result) {
        if (result.success) {
          window.VNKR.toast('100 Test-VNKR sent! Tx: ' + window.VNKR.utils.formatAddress(result.txHash), 'success');
        } else {
          window.VNKR.toast(result.error || 'Faucet request failed', 'error');
        }
      });
    }
  },

  // ─── Render helpers ──────────────────────────────────────────────────
  renderMarketTable: function (data) {
    var tbody = document.querySelector('.market__table tbody, .js-market-table');
    if (!tbody || !data) return;
    tbody.innerHTML = data.slice(0, 20).map(function (item) {
      var changeClass = item.change24h >= 0 ? 'color-green' : 'color-red';
      return '<tr>' +
        '<td><div style="display:flex;align-items:center;gap:8px">' +
        '<img src="img/content/currency/' + item.symbol.toLowerCase() + '.svg" width="24" height="24" onerror="this.style.display=\'none\'">' +
        '<span>' + item.name + '</span><span style="color:#777e91">' + item.symbol + '</span></div></td>' +
        '<td class="text-right">' + window.VNKR.utils.formatUSD(item.price) + '</td>' +
        '<td class="text-right ' + changeClass + '">' + (item.change24h >= 0 ? '+' : '') + item.change24h.toFixed(2) + '%</td>' +
        '<td class="text-right">' + window.VNKR.utils.formatUSD(item.marketCap) + '</td>' +
        '</tr>';
    }).join('');
  },

  renderWalletBalance: function (bal) {
    var totalEl = document.querySelector('.wallet__total');
    if (totalEl) totalEl.textContent = window.VNKR.utils.formatUSD(bal.totalUSD);
  },

  renderStakingStats: function (stats) {
    var aprEl = document.querySelector('.staking__apr');
    var tvlEl = document.querySelector('.staking__tvl');
    if (aprEl) aprEl.textContent = (stats.apr || 0).toFixed(2) + '%';
    if (tvlEl) tvlEl.textContent = window.VNKR.utils.formatNumber(stats.tvl || 0) + ' VNKR';
  },

  renderBlocks: function (blocks) {
    var list = document.querySelector('.explorer__blocks');
    if (!list || !blocks) return;
    list.innerHTML = blocks.map(function (b) {
      return '<div class="explorer__item">' +
        '<span class="explorer__block-num">#' + b.number + '</span>' +
        '<span class="explorer__miner">' + window.VNKR.utils.formatAddress(b.miner) + '</span>' +
        '<span class="explorer__txcount">' + b.txCount + ' txs</span>' +
        '<span class="explorer__time">' + window.VNKR.utils.timeAgo(b.timestamp) + '</span>' +
        '</div>';
    }).join('');
  },

  renderTxs: function (txs) {
    var list = document.querySelector('.explorer__txs');
    if (!list || !txs) return;
    list.innerHTML = txs.map(function (tx) {
      return '<div class="explorer__item">' +
        '<span class="explorer__hash">' + window.VNKR.utils.formatAddress(tx.hash) + '</span>' +
        '<span class="explorer__from">' + window.VNKR.utils.formatAddress(tx.from) + '</span>' +
        '<span class="explorer__arrow">→</span>' +
        '<span class="explorer__to">' + window.VNKR.utils.formatAddress(tx.to) + '</span>' +
        '<span class="explorer__value">' + window.VNKR.utils.formatBalance(tx.value) + ' VNKR</span>' +
        '</div>';
    }).join('');
  },

  renderProposals: function (proposals) {
    var list = document.querySelector('.dao__proposals');
    if (!list || !proposals) return;
    list.innerHTML = proposals.map(function (p) {
      var total = p.votesFor + p.votesAgainst;
      var pct = total > 0 ? Math.round(p.votesFor / total * 100) : 0;
      return '<div class="dao__proposal">' +
        '<div class="dao__proposal-title">' + p.title + '</div>' +
        '<div class="dao__proposal-meta">Status: <strong>' + p.status + '</strong> | Ends: ' + new Date(p.endTime * 1000).toLocaleDateString() + '</div>' +
        '<div class="dao__progress-bar"><div style="width:' + pct + '%;height:6px;background:#3772FF;border-radius:3px"></div></div>' +
        '<div class="dao__votes">For: ' + pct + '% | Against: ' + (100 - pct) + '%</div>' +
        '</div>';
    }).join('');
  },

  // ─── Initialize ──────────────────────────────────────────────────────
  init: function () {
    var self = this;

    // Rebrand UI
    this.rebrand();

    // Restore dark mode
    if (localStorage.getItem('darkMode') === 'on') {
      document.body.classList.add('dark');
    }

    // Restore wallet connection
    var savedAddress = localStorage.getItem('vnkr_wallet_address');
    if (savedAddress) {
      this.state.walletAddress = savedAddress;
      this.state.isConnected = true;
      this.updateHeaderUI(true, savedAddress);
    }

    // Connect wallet button in wallet overview
    var connectBtn = document.querySelector('.js-wallet-connect');
    if (connectBtn) {
      connectBtn.addEventListener('click', function () {
        if (window.VNKR_WALLET) window.VNKR_WALLET.connect();
      });
    }

    // Initialize API
    if (window.VNKR_API) {
      window.VNKR_API.init(window.VNKR_CONFIG);
    }

    // Initialize Wallet module
    if (window.VNKR_WALLET) {
      window.VNKR_WALLET.init();
    }

    // Initialize page-specific features
    document.addEventListener('DOMContentLoaded', function () {
      self.initPage();
    });

    // If DOM already loaded
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
      this.initPage();
    }

    console.log('%c VNKR App-Chain Frontend v1.0', 'background:#3772FF;color:#fff;padding:4px 8px;border-radius:4px;font-weight:bold');
    console.log('Network: ' + this.config.networkName + ' | Chain ID: ' + this.config.chainId);
  },

  get api() { return window.VNKR_API || {}; },
  get wallet() { return window.VNKR_WALLET || {}; },
  get config() { return window.VNKR_CONFIG; }
};

// ─── Auto-initialize on script load ─────────────────────────────────────────
window.VNKR.init();
