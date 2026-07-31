import React, { useState, useEffect, useCallback } from "react";
import VNKRApi from "../../services/vnkr-api";

const formatAddr = (addr) => addr ? addr.slice(0, 8) + "..." + addr.slice(-6) : "";
const timeAgo = (ts) => {
  const diff = Math.floor((Date.now() - ts * 1000) / 1000);
  if (diff < 60) return diff + "s ago";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  return Math.floor(diff / 3600) + "h ago";
};

const Explorer = () => {
  const [blocks, setBlocks] = useState([]);
  const [txs, setTxs] = useState([]);
  const [blockNumber, setBlockNumber] = useState(182440);
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    VNKRApi.getLatestBlocks(10).then(setBlocks);
    VNKRApi.getLatestTxs(10).then(setTxs);
    VNKRApi.getBlockNumber().then(setBlockNumber);

    // Simulate live block updates
    const interval = setInterval(() => {
      setBlockNumber((prev) => {
        if (Math.random() > 0.6) {
          const newBlock = prev + 1;
          setBlocks((prevBlocks) => [{
            number: newBlock,
            miner: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
            txCount: Math.floor(Math.random() * 35) + 5,
            timestamp: Math.floor(Date.now() / 1000),
            gasUsed: Math.floor(Math.random() * 8000000) + 2000000,
          }, ...prevBlocks.slice(0, 9)]);
          return newBlock;
        }
        return prev;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleSearch = useCallback(async () => {
    if (!search.trim()) return;
    setSearchLoading(true);
    setSearchResult(null);
    try {
      let result;
      if (/^\d+$/.test(search)) {
        result = await VNKRApi.getBlock(parseInt(search));
        if (result) result._type = "block";
      } else if (/^0x[a-fA-F0-9]{64}$/.test(search)) {
        result = await VNKRApi.getTx(search);
        if (result) result._type = "tx";
      } else if (/^0x[a-fA-F0-9]{40}$/.test(search)) {
        const balance = await VNKRApi.getBalance(search);
        result = { address: search, balance, _type: "address" };
      }
      setSearchResult(result || { _type: "notfound" });
    } catch {
      setSearchResult({ _type: "notfound" });
    }
    setSearchLoading(false);
  }, [search]);

  return (
    <div className="section section-bg" style={{ padding: "32px 0" }}>
      <div className="center">

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 32 }}>
          {[
            { label: "Latest Block", value: blockNumber.toLocaleString(), color: "#3772FF" },
            { label: "Block Time", value: "~3s", color: "#58BD7D" },
            { label: "TPS", value: "24", color: "#9B51E0" },
            { label: "Validators", value: "3", color: "#F7931A" },
            { label: "VNKR Price", value: "$0.0842", color: "#FCFCFD" },
          ].map((s) => (
            <div key={s.label} style={{ background: "#23262F", borderRadius: 12, padding: "16px", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#777e91", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ background: "#23262F", borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <input
              type="text"
              placeholder="Search by block number, tx hash, or wallet address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              style={{
                flex: 1, background: "#141416", border: "2px solid #353945",
                borderRadius: 8, padding: "12px 16px", color: "#FCFCFD",
                fontSize: 14, fontFamily: "Poppins, sans-serif",
              }}
            />
            <button onClick={handleSearch} className="button button-small" style={{ padding: "12px 24px", whiteSpace: "nowrap" }}>
              {searchLoading ? "..." : "Search"}
            </button>
          </div>
          {searchResult && (
            <div style={{ marginTop: 16, padding: 16, background: "#141416", borderRadius: 8, fontSize: 13 }}>
              {searchResult._type === "notfound" && <span style={{ color: "#FF6838" }}>No results found for that query.</span>}
              {searchResult._type === "address" && (
                <div>
                  <strong>Address:</strong> <span style={{ fontFamily: "monospace" }}>{searchResult.address}</span><br />
                  <strong>Balance:</strong> <span style={{ color: "#58BD7D" }}>{searchResult.balance?.toFixed(4)} VNKR</span>
                </div>
              )}
              {searchResult._type === "block" && (
                <div>
                  <strong>Block #{searchResult.number}</strong> | Miner: {formatAddr(searchResult.miner)} | Txs: {searchResult.transactions?.length || 0}
                </div>
              )}
              {searchResult._type === "tx" && (
                <div>
                  <strong>Tx:</strong> <span style={{ fontFamily: "monospace", fontSize: 11 }}>{searchResult.hash}</span><br />
                  From: {formatAddr(searchResult.from)} → To: {formatAddr(searchResult.to)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Blocks + Txs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
          {/* Latest Blocks */}
          <div style={{ background: "#23262F", borderRadius: 16, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Latest Blocks</h3>
              <span style={{ fontSize: 12, color: "#3772FF" }}>Live</span>
            </div>
            {blocks.map((b) => (
              <div key={b.number} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 0", borderBottom: "1px solid #353945", fontSize: 12,
              }}>
                <span style={{ background: "#3772FF20", color: "#3772FF", borderRadius: 4, padding: "2px 8px", fontFamily: "monospace" }}>
                  #{b.number}
                </span>
                <span style={{ color: "#777e91" }}>{formatAddr(b.miner)}</span>
                <span style={{ background: "#58BD7D20", color: "#58BD7D", borderRadius: 4, padding: "1px 6px" }}>
                  {b.txCount} txs
                </span>
                <span style={{ color: "#777e91" }}>{timeAgo(b.timestamp)}</span>
              </div>
            ))}
          </div>

          {/* Latest Txs */}
          <div style={{ background: "#23262F", borderRadius: 16, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Latest Transactions</h3>
            </div>
            {txs.length === 0 ? (
              <div style={{ color: "#777e91", textAlign: "center", padding: 20 }}>No transactions yet</div>
            ) : (
              txs.map((tx, i) => (
                <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid #353945", fontSize: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "#3772FF", fontFamily: "monospace" }}>{formatAddr(tx.hash)}</span>
                    <span style={{
                      background: tx.type === "burn" ? "#FF683820" : "#58BD7D20",
                      color: tx.type === "burn" ? "#FF6838" : "#58BD7D",
                      borderRadius: 4, padding: "1px 6px", textTransform: "uppercase", fontSize: 10, fontWeight: 600,
                    }}>{tx.type}</span>
                  </div>
                  <div style={{ color: "#777e91" }}>
                    {formatAddr(tx.from)} → {formatAddr(tx.to)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Network Info */}
        <div style={{ background: "#23262F", borderRadius: 16, padding: 24 }}>
          <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>VNKR App-Chain Network</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, fontSize: 13 }}>
            {[
              ["Network", "VNKR Testnet"],
              ["Chain ID", "789680"],
              ["Native Token", "VNKR (18 decimals)"],
              ["Consensus", "Clique PoA → PoS Mainnet"],
              ["RPC URL", "https://testnet-rpc.vnkr.vn"],
              ["Block Time", "~3 seconds"],
            ].map(([k, v]) => (
              <div key={k}>
                <span style={{ color: "#777e91" }}>{k}</span><br />
                <span style={{ fontWeight: 600, fontFamily: k.includes("URL") ? "monospace" : "inherit", fontSize: k.includes("URL") ? 11 : 13, color: k.includes("URL") ? "#3772FF" : "inherit" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Explorer;
