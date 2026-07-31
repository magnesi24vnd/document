/**
 * VNKRContext.js — Global state cho VNKR App-Chain
 * Quản lý: wallet connection, price data, network status
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const VNKRContext = createContext(null);

export const VNKR_NETWORK = {
  testnet: {
    chainId: 789680,
    chainIdHex: "0xC0F50",
    name: "VNKR Testnet",
    rpcUrl: "https://testnet-rpc.vnkr.vn",
    wsUrl: "wss://testnet-ws.vnkr.vn",
    explorerUrl: "https://scan.vnkr.vn",
    faucetUrl: "https://faucet.vnkr.vn",
    nativeCurrency: { name: "VNKR", symbol: "VNKR", decimals: 18 },
  },
  mainnet: {
    chainId: 78968,
    chainIdHex: "0x13488",
    name: "VNKR Mainnet",
    rpcUrl: "https://rpc.vnkr.vn",
    wsUrl: "wss://ws.vnkr.vn",
    explorerUrl: "https://scan.vnkr.vn",
    nativeCurrency: { name: "VNKR", symbol: "VNKR", decimals: 18 },
  },
};

const MOCK_PRICES = {
  VNKR: { usd: 0.0842, change24h: 5.23, volume24h: 1284000, marketCap: 84200000 },
  BTC: { usd: 67420, change24h: -1.2, volume24h: 28000000000 },
  ETH: { usd: 3840, change24h: 2.8, volume24h: 14000000000 },
  BNB: { usd: 598, change24h: 0.5, volume24h: 1200000000 },
};

export function VNKRProvider({ children }) {
  const [wallet, setWallet] = useState({
    isConnected: false,
    address: null,
    balance: "0",
    network: null,
  });
  const [prices, setPrices] = useState(MOCK_PRICES);
  const [isTestnet] = useState(true);
  const network = isTestnet ? VNKR_NETWORK.testnet : VNKR_NETWORK.mainnet;

  // ─── Restore wallet session ────────────────────────────────────────────
  useEffect(() => {
    const savedAddress = localStorage.getItem("vnkr_wallet_address");
    if (savedAddress && window.ethereum) {
      window.ethereum.request({ method: "eth_accounts" })
        .then((accounts) => {
          if (accounts.includes(savedAddress)) {
            setWallet((prev) => ({
              ...prev,
              isConnected: true,
              address: savedAddress,
            }));
          } else {
            localStorage.removeItem("vnkr_wallet_address");
          }
        })
        .catch(() => {});
    }
  }, []);

  // ─── Price polling ─────────────────────────────────────────────────────
  useEffect(() => {
    // Simulate price updates
    const interval = setInterval(() => {
      setPrices((prev) => ({
        ...prev,
        VNKR: {
          ...prev.VNKR,
          usd: Math.max(0.0001, prev.VNKR.usd + (Math.random() - 0.5) * 0.0002),
        },
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // ─── Connect Wallet ────────────────────────────────────────────────────
  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error("MetaMask not found. Please install it.");
    }
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    if (!accounts?.length) throw new Error("No accounts found");

    const address = accounts[0];

    // Check/switch network
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    if (parseInt(chainId, 16) !== network.chainId) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: network.chainIdHex }],
        });
      } catch (switchErr) {
        if (switchErr.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: network.chainIdHex,
              chainName: network.name,
              nativeCurrency: network.nativeCurrency,
              rpcUrls: [network.rpcUrl],
              blockExplorerUrls: [network.explorerUrl],
            }],
          });
        } else {
          throw switchErr;
        }
      }
    }

    // Get balance
    const balHex = await window.ethereum.request({
      method: "eth_getBalance",
      params: [address, "latest"],
    }).catch(() => "0x0");
    const balVNKR = (parseInt(balHex, 16) / 1e18).toFixed(4);

    setWallet({ isConnected: true, address, balance: balVNKR, network: network.chainId });
    localStorage.setItem("vnkr_wallet_address", address);
    return address;
  }, [network]);

  // ─── Disconnect ────────────────────────────────────────────────────────
  const disconnectWallet = useCallback(() => {
    setWallet({ isConnected: false, address: null, balance: "0", network: null });
    localStorage.removeItem("vnkr_wallet_address");
  }, []);

  // ─── Listen MetaMask events ────────────────────────────────────────────
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        setWallet((prev) => ({ ...prev, address: accounts[0] }));
        localStorage.setItem("vnkr_wallet_address", accounts[0]);
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);
    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [disconnectWallet]);

  // ─── Utility: format address ───────────────────────────────────────────
  const formatAddress = (addr) => {
    if (!addr) return "";
    return addr.slice(0, 6) + "..." + addr.slice(-4);
  };

  const value = {
    wallet,
    prices,
    network,
    isTestnet,
    connectWallet,
    disconnectWallet,
    formatAddress,
  };

  return <VNKRContext.Provider value={value}>{children}</VNKRContext.Provider>;
}

export function useVNKR() {
  const ctx = useContext(VNKRContext);
  if (!ctx) throw new Error("useVNKR must be used within VNKRProvider");
  return ctx;
}

export default VNKRContext;
