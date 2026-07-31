/**
 * VNKR-WALLET.JS — MetaMask / WalletConnect Integration
 * Kết nối ví Web3 với VNKR App-Chain
 * 
 * Chức năng:
 *   - Detect & connect MetaMask
 *   - Auto add VNKR network to MetaMask
 *   - WalletConnect support
 *   - Account change / network change handlers
 *   - Sign messages & transactions
 *   - Disconnect & cleanup
 */

"use strict";

(function (window) {

  var _provider = null;
  var _networkConfig = null;
  var _listeners = {};

  window.VNKR_WALLET = {

    // ─── Initialize ─────────────────────────────────────────────────────
    init: function () {
      _networkConfig = window.VNKR_CONFIG;

      // Handle connect buttons across all pages
      document.querySelectorAll('.js-wallet-connect, [data-wallet-connect]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          window.VNKR_WALLET.connect();
        });
      });

      // Handle disconnect
      document.querySelectorAll('.js-wallet-disconnect, [data-wallet-disconnect]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          window.VNKR_WALLET.disconnect();
        });
      });

      // Auto-reconnect if address saved
      var savedAddress = localStorage.getItem('vnkr_wallet_address');
      if (savedAddress && window.ethereum) {
        this._silentReconnect(savedAddress);
      }

      // Setup MetaMask event listeners
      this._setupEventListeners();
    },

    // ─── Detect Available Wallets ────────────────────────────────────────
    detectWallet: function () {
      if (window.ethereum) {
        if (window.ethereum.isMetaMask) return 'metamask';
        if (window.ethereum.isTrust) return 'trustwallet';
        if (window.ethereum.isCoinbaseWallet) return 'coinbase';
        return 'injected';
      }
      return null;
    },

    // ─── Connect Wallet ──────────────────────────────────────────────────
    connect: function () {
      var self = this;
      var walletType = this.detectWallet();

      if (!walletType) {
        this._showNoWalletModal();
        return Promise.reject(new Error('No wallet detected'));
      }

      _provider = window.ethereum;

      return _provider.request({ method: 'eth_requestAccounts' })
        .then(function (accounts) {
          if (!accounts || accounts.length === 0) {
            throw new Error('No accounts found');
          }
          var address = accounts[0];
          return self._handleAccountConnected(address);
        })
        .catch(function (err) {
          if (err.code === 4001) {
            window.VNKR.toast('Connection rejected by user', 'error');
          } else {
            window.VNKR.toast('Wallet connection failed: ' + err.message, 'error');
          }
          return Promise.reject(err);
        });
    },

    // ─── Handle Connected Account ────────────────────────────────────────
    _handleAccountConnected: function (address) {
      var self = this;

      // Check if on VNKR network, if not — prompt to switch
      return _provider.request({ method: 'eth_chainId' })
        .then(function (chainId) {
          var currentChainId = parseInt(chainId, 16);
          var targetChainId = _networkConfig.chainId;

          if (currentChainId !== targetChainId) {
            return self.switchNetwork().then(function () {
              return address;
            });
          }
          return address;
        })
        .then(function (address) {
          // Save state
          window.VNKR.state.walletAddress = address;
          window.VNKR.state.isConnected = true;
          localStorage.setItem('vnkr_wallet_address', address);

          // Update UI
          window.VNKR.updateHeaderUI(true, address);
          window.VNKR.toast('Wallet connected: ' + window.VNKR.utils.formatAddress(address), 'success');

          // Fetch balance
          if (window.VNKR_API) {
            window.VNKR_API.getBalance(address).then(function (bal) {
              window.VNKR.state.balance = bal.vnkr.toFixed(4);
              self._updateBalanceUI(bal);
            });
          }

          // Emit connected event
          self._emit('connected', { address: address });

          return address;
        });
    },

    // ─── Switch to VNKR Network ──────────────────────────────────────────
    switchNetwork: function () {
      var self = this;
      var config = _networkConfig;
      var chainIdHex = '0x' + config.chainId.toString(16);

      return _provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }]
      })
        .catch(function (switchError) {
          // Chain not added yet (error 4902)
          if (switchError.code === 4902) {
            return self.addNetwork();
          }
          throw switchError;
        });
    },

    // ─── Add VNKR Network to MetaMask ───────────────────────────────────
    addNetwork: function () {
      var config = _networkConfig;
      return _provider.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x' + config.chainId.toString(16),
          chainName: config.networkName,
          nativeCurrency: config.nativeCurrency,
          rpcUrls: [config.rpcUrl],
          blockExplorerUrls: [config.explorerUrl]
        }]
      })
        .then(function () {
          window.VNKR.toast('VNKR network added to MetaMask!', 'success');
        })
        .catch(function (err) {
          window.VNKR.toast('Failed to add network: ' + err.message, 'error');
        });
    },

    // ─── Show Network Modal ──────────────────────────────────────────────
    showNetworkModal: function () {
      var config = _networkConfig;
      var modal = document.createElement('div');
      modal.style.cssText = [
        'position:fixed;top:0;left:0;width:100%;height:100%;z-index:10000',
        'background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center'
      ].join(';');

      modal.innerHTML = [
        '<div style="background:#23262F;border-radius:16px;padding:32px;max-width:420px;width:90%;color:#FCFCFD">',
        '<h3 style="margin:0 0 20px;font-size:18px;font-weight:700">VNKR Network Info</h3>',
        '<div style="background:#141416;border-radius:8px;padding:16px;margin-bottom:12px">',
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px">',
        '<span style="color:#777e91">Network</span><span>' + config.networkName + '</span>',
        '<span style="color:#777e91">Chain ID</span><span>' + config.chainId + '</span>',
        '<span style="color:#777e91">Symbol</span><span>' + config.nativeCurrency.symbol + '</span>',
        '<span style="color:#777e91">RPC URL</span><span style="word-break:break-all;font-size:11px">' + config.rpcUrl + '</span>',
        '<span style="color:#777e91">Explorer</span><span style="font-size:11px">' + config.explorerUrl + '</span>',
        '</div></div>',
        '<div style="display:flex;gap:12px;margin-top:20px">',
        '<button id="vnkr-add-network" style="flex:1;padding:12px;background:#3772FF;border:none;border-radius:8px;color:#fff;font-weight:600;cursor:pointer">Add to MetaMask</button>',
        '<button id="vnkr-modal-close" style="padding:12px 20px;background:#353945;border:none;border-radius:8px;color:#FCFCFD;cursor:pointer">Close</button>',
        '</div></div>'
      ].join('');

      document.body.appendChild(modal);

      modal.querySelector('#vnkr-add-network').addEventListener('click', function () {
        window.VNKR_WALLET.addNetwork();
        modal.remove();
      });

      modal.querySelector('#vnkr-modal-close').addEventListener('click', function () {
        modal.remove();
      });

      modal.addEventListener('click', function (e) {
        if (e.target === modal) modal.remove();
      });
    },

    // ─── Show No Wallet Modal ────────────────────────────────────────────
    _showNoWalletModal: function () {
      var modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:10000;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center';
      modal.innerHTML = [
        '<div style="background:#23262F;border-radius:16px;padding:32px;max-width:380px;width:90%;color:#FCFCFD;text-align:center">',
        '<div style="font-size:48px;margin-bottom:16px">🦊</div>',
        '<h3 style="margin:0 0 12px;font-size:20px">No Wallet Found</h3>',
        '<p style="color:#777e91;font-size:14px;margin:0 0 24px">Install MetaMask to connect to VNKR App-Chain</p>',
        '<a href="https://metamask.io/download/" target="_blank" style="display:block;padding:14px;background:#F6851B;border-radius:8px;color:#fff;font-weight:700;text-decoration:none;margin-bottom:12px">Install MetaMask</a>',
        '<button id="vnkr-nowallet-close" style="padding:10px 20px;background:#353945;border:none;border-radius:8px;color:#FCFCFD;cursor:pointer;width:100%">Close</button>',
        '</div>'
      ].join('');
      document.body.appendChild(modal);
      modal.querySelector('#vnkr-nowallet-close').addEventListener('click', function () { modal.remove(); });
      modal.addEventListener('click', function (e) { if (e.target === modal) modal.remove(); });
    },

    // ─── Disconnect ──────────────────────────────────────────────────────
    disconnect: function () {
      window.VNKR.state.walletAddress = null;
      window.VNKR.state.isConnected = false;
      window.VNKR.state.balance = '0';
      localStorage.removeItem('vnkr_wallet_address');
      window.VNKR.updateHeaderUI(false);
      window.VNKR.toast('Wallet disconnected', 'info');
      this._emit('disconnected', {});
    },

    // ─── Sign Message ────────────────────────────────────────────────────
    signMessage: function (message) {
      var address = window.VNKR.state.walletAddress;
      if (!address) return Promise.reject(new Error('Wallet not connected'));
      return _provider.request({
        method: 'personal_sign',
        params: [message, address]
      });
    },

    // ─── Silent Reconnect ────────────────────────────────────────────────
    _silentReconnect: function (savedAddress) {
      if (!window.ethereum) return;
      window.ethereum.request({ method: 'eth_accounts' })
        .then(function (accounts) {
          if (accounts && accounts.includes(savedAddress)) {
            window.VNKR.state.walletAddress = savedAddress;
            window.VNKR.state.isConnected = true;
            window.VNKR.updateHeaderUI(true, savedAddress);
          } else {
            localStorage.removeItem('vnkr_wallet_address');
          }
        }).catch(function () {});
    },

    // ─── Update Balance in UI ────────────────────────────────────────────
    _updateBalanceUI: function (bal) {
      document.querySelectorAll('[data-vnkr-balance]').forEach(function (el) {
        el.textContent = bal.vnkr.toFixed(4) + ' VNKR';
      });
      document.querySelectorAll('[data-vnkr-balance-usd]').forEach(function (el) {
        el.textContent = window.VNKR.utils.formatUSD(bal.totalUSD);
      });
    },

    // ─── Event System ────────────────────────────────────────────────────
    on: function (event, callback) {
      if (!_listeners[event]) _listeners[event] = [];
      _listeners[event].push(callback);
    },

    _emit: function (event, data) {
      if (_listeners[event]) {
        _listeners[event].forEach(function (cb) { cb(data); });
      }
    },

    // ─── MetaMask Event Listeners ────────────────────────────────────────
    _setupEventListeners: function () {
      if (!window.ethereum) return;

      window.ethereum.on('accountsChanged', function (accounts) {
        if (accounts.length === 0) {
          window.VNKR_WALLET.disconnect();
        } else {
          var newAddress = accounts[0];
          window.VNKR.state.walletAddress = newAddress;
          localStorage.setItem('vnkr_wallet_address', newAddress);
          window.VNKR.updateHeaderUI(true, newAddress);
          window.VNKR.toast('Account changed: ' + window.VNKR.utils.formatAddress(newAddress), 'info');
        }
      });

      window.ethereum.on('chainChanged', function (chainId) {
        var newChainId = parseInt(chainId, 16);
        var expectedChainId = (_networkConfig || window.VNKR_CONFIG).chainId;
        if (newChainId !== expectedChainId) {
          window.VNKR.toast('Please switch to VNKR Network (Chain ID: ' + expectedChainId + ')', 'warning');
        } else {
          window.VNKR.toast('Connected to VNKR Network', 'success');
        }
      });

      window.ethereum.on('disconnect', function () {
        window.VNKR_WALLET.disconnect();
      });
    }
  };

})(window);
