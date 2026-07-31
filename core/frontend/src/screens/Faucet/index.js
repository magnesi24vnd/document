import React, { useState, useEffect } from "react";
import VNKRApi from "../../services/vnkr-api";
import { useVNKR } from "../../contexts/VNKRContext";

const Faucet = () => {
  const { wallet, connectWallet } = useVNKR();
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [recentRequests] = useState([
    { address: "0x742d...f44e", amount: "100", time: "2m ago" },
    { address: "0x1a2B...a0B", amount: "300", time: "15m ago" },
    { address: "0xAbc1...tu9", amount: "100", time: "1h ago" },
    { address: "0xDef4...ef0", amount: "100", time: "2h ago" },
  ]);

  useEffect(() => {
    if (wallet.address) setAddress(wallet.address);
  }, [wallet.address]);

  const handleRequest = async () => {
    if (!address) {
      setResult({ success: false, error: "Please enter a wallet address" });
      return;
    }
    setLoading(true);
    setResult(null);
    const res = await VNKRApi.requestFaucet(address);
    setLoading(false);
    setResult(res);
  };

  return (
    <div className="section" style={{ padding: "60px 0" }}>
      <div className="center">
        <div style={{ maxWidth: 600, margin: "0 auto" }}>

          {/* Hero */}
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🚰</div>
            <h2 className="h2" style={{ marginBottom: 12 }}>VNKR Testnet Faucet</h2>
            <p style={{ color: "#777e91", fontSize: 15 }}>
              Nhận 100 Test-VNKR miễn phí để kiểm thử smart contract và tính năng mạng lưới.
              Mỗi địa chỉ nhận tối đa 1 lần mỗi 24 giờ.
            </p>
          </div>

          {/* Network Info */}
          <div style={{ background: "#23262F", borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13, marginBottom: 12 }}>
              <div><span style={{ color: "#777e91" }}>Network: </span><strong>VNKR Testnet</strong></div>
              <div><span style={{ color: "#777e91" }}>Chain ID: </span><strong>789680</strong></div>
              <div><span style={{ color: "#777e91" }}>RPC: </span><span style={{ color: "#3772FF", fontSize: 11 }}>https://testnet-rpc.vnkr.vn</span></div>
              <div><span style={{ color: "#777e91" }}>Explorer: </span><span style={{ color: "#3772FF", fontSize: 11 }}>scan.vnkr.vn</span></div>
            </div>
            <button
              onClick={() => {
                if (!window.ethereum) { alert("MetaMask not found"); return; }
                window.ethereum.request({
                  method: "wallet_addEthereumChain",
                  params: [{
                    chainId: "0xC0F50",
                    chainName: "VNKR Testnet",
                    nativeCurrency: { name: "VNKR", symbol: "VNKR", decimals: 18 },
                    rpcUrls: ["https://testnet-rpc.vnkr.vn"],
                    blockExplorerUrls: ["https://scan.vnkr.vn"],
                  }],
                });
              }}
              style={{
                background: "#3772FF20", border: "1px solid #3772FF40",
                borderRadius: 8, padding: "8px 16px", color: "#3772FF",
                fontSize: 13, cursor: "pointer", fontWeight: 600,
              }}
            >
              + Add VNKR Testnet to MetaMask
            </button>
          </div>

          {/* Faucet Form */}
          <div style={{ background: "#23262F", borderRadius: 16, padding: 32, marginBottom: 24 }}>
            <h3 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>Request Test-VNKR</h3>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, color: "#777e91", fontWeight: 600, marginBottom: 8 }}>
                WALLET ADDRESS
              </label>
              <input
                type="text"
                placeholder="0x..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={{
                  width: "100%", background: "#141416", border: "2px solid #353945",
                  borderRadius: 8, padding: "14px 16px", color: "#FCFCFD",
                  fontSize: 15, fontFamily: "monospace", boxSizing: "border-box",
                }}
              />
            </div>

            {!wallet.isConnected && (
              <button
                onClick={() => connectWallet().then(({ address }) => setAddress(address))}
                style={{
                  width: "100%", background: "#353945", border: "none", borderRadius: 8,
                  padding: "10px 16px", color: "#FCFCFD", fontSize: 13, cursor: "pointer",
                  marginBottom: 16, fontWeight: 600,
                }}
              >
                Or use connected wallet address
              </button>
            )}

            {/* Amount display */}
            <div style={{
              background: "#141416", borderRadius: 8, padding: 14, marginBottom: 20,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 20 }}>100 Test-VNKR</div>
                <div style={{ fontSize: 12, color: "#777e91" }}>Per request (every 24h)</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: "#777e91" }}>Tweet bonus</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#58BD7D" }}>+200 VNKR</div>
              </div>
            </div>

            {/* Result */}
            {result && (
              <div style={{
                padding: 14, borderRadius: 8, marginBottom: 16,
                background: result.success ? "#58BD7D20" : "#FF683820",
                border: `1px solid ${result.success ? "#58BD7D" : "#FF6838"}`,
                color: result.success ? "#58BD7D" : "#FF6838",
                fontSize: 13,
              }}>
                {result.success
                  ? `✓ Sent 100 Test-VNKR! Tx: ${result.txHash?.slice(0, 20)}...`
                  : `✕ ${result.error}`}
              </div>
            )}

            <button
              onClick={handleRequest}
              disabled={loading}
              className="button"
              style={{ width: "100%", padding: 16, fontSize: 15, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Sending..." : "🚰 Request Test-VNKR"}
            </button>
          </div>

          {/* Recent requests */}
          <div style={{ background: "#23262F", borderRadius: 16, padding: 24, marginBottom: 24 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>Recent Requests</h3>
            {recentRequests.map((r, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", padding: "10px 0",
                borderBottom: i < recentRequests.length - 1 ? "1px solid #353945" : "none",
                fontSize: 13,
              }}>
                <span style={{ color: "#777e91", fontFamily: "monospace" }}>{r.address}</span>
                <span style={{ color: "#58BD7D", fontWeight: 600 }}>{r.amount} VNKR</span>
                <span style={{ color: "#777e91" }}>{r.time}</span>
              </div>
            ))}
          </div>

          {/* How to use */}
          <div style={{
            background: "#3772FF10", border: "1px solid #3772FF30",
            borderRadius: 12, padding: 20,
          }}>
            <h4 style={{ margin: "0 0 12px", color: "#3772FF" }}>How to use Test-VNKR</h4>
            <ol style={{ margin: 0, paddingLeft: 20, color: "#777e91", fontSize: 13, lineHeight: 1.8 }}>
              <li>Add VNKR Testnet to MetaMask using button above</li>
              <li>Enter your wallet address and click Request</li>
              <li>Receive 100 Test-VNKR within ~10 seconds</li>
              <li>Use at Exchange or deploy your smart contracts</li>
              <li>Share on Twitter to get 200 bonus Test-VNKR</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Faucet;
