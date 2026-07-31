import React, { useState, useEffect } from "react";
import cn from "classnames";
import VNKRApi from "../../services/vnkr-api";
import { useVNKR } from "../../contexts/VNKRContext";

const TIERS = [
  { name: "Bronze", minStake: 100, days: 30, apr: 12, color: "#CD7F32" },
  { name: "Silver", minStake: 1000, days: 60, apr: 14, color: "#C0C0C0" },
  { name: "Gold", minStake: 10000, days: 90, apr: 15.4, color: "#F7931A" },
  { name: "Platinum", minStake: 100000, days: 180, apr: 18, color: "#9B51E0" },
  { name: "Diamond", minStake: 1000000, days: 365, apr: 22, color: "#3772FF" },
];

const Staking = () => {
  const { wallet, connectWallet, formatAddress } = useVNKR();
  const [stats, setStats] = useState({ apr: 15.4, tvl: 48200000, totalStakers: 3842 });
  const [amount, setAmount] = useState("");
  const [selectedDays, setSelectedDays] = useState(90);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    VNKRApi.getStakingStats().then(setStats);
  }, []);

  const estimatedReward = () => {
    const tier = TIERS.find((t) => t.days === selectedDays) || TIERS[2];
    return ((parseFloat(amount) || 0) * (tier.apr / 100) * (selectedDays / 365)).toFixed(4);
  };

  const unlockDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDays);
    return d.toLocaleDateString("vi-VN");
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleStake = async () => {
    if (!wallet.isConnected) {
      try { await connectWallet(); } catch (e) { showToast(e.message, "error"); return; }
    }
    if (!amount || parseFloat(amount) <= 0) {
      showToast("Please enter an amount", "error");
      return;
    }
    setLoading(true);
    const result = await VNKRApi.stake(parseFloat(amount), selectedDays);
    setLoading(false);
    if (result?.success) {
      showToast(`Staked ${amount} VNKR for ${selectedDays} days!`);
      setAmount("");
    } else {
      showToast("Stake failed. Wallet required.", "error");
    }
  };

  return (
    <div className="section" style={{ padding: "40px 0" }}>
      <div className="center">
        {/* Toast */}
        {toast && (
          <div style={{
            position: "fixed", bottom: 20, right: 20, zIndex: 9999,
            background: toast.type === "error" ? "#FF683820" : "#58BD7D20",
            border: `1px solid ${toast.type === "error" ? "#FF6838" : "#58BD7D"}`,
            color: toast.type === "error" ? "#FF6838" : "#58BD7D",
            padding: "14px 20px", borderRadius: 12, fontWeight: 600, minWidth: 260,
          }}>{toast.msg}</div>
        )}

        <h2 className="h2" style={{ marginBottom: 8 }}>Staking & Earning</h2>
        <p style={{ color: "#777e91", marginBottom: 32 }}>
          Khóa VNKR để nhận thưởng từ doanh thu mạng lưới.{" "}
          APR hiện tại:{" "}
          <strong style={{ color: "#58BD7D" }}>{stats.apr}%</strong>
        </p>

        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 40 }}>
          {[
            { label: "Annual APR", value: stats.apr + "%", color: "#58BD7D" },
            { label: "Total Staked", value: (stats.tvl / 1e6).toFixed(1) + "M VNKR", color: "#3772FF" },
            { label: "Stakers", value: stats.totalStakers?.toLocaleString(), color: "#9B51E0" },
            { label: "Min Lock", value: "30 days", color: "#F7931A" },
          ].map((s) => (
            <div key={s.label} style={{ background: "#23262F", borderRadius: 12, padding: 20, textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#777e91", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Main Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 40 }}>
          {/* Stake Form */}
          <div style={{ background: "#23262F", borderRadius: 16, padding: 28 }}>
            <h3 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>Stake VNKR</h3>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, color: "#777e91", marginBottom: 8, fontWeight: 600 }}>
                Amount to Stake
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{
                    width: "100%", background: "#141416", border: "2px solid #353945",
                    borderRadius: 8, padding: "12px 70px 12px 16px", color: "#FCFCFD",
                    fontSize: 16, fontFamily: "Poppins, sans-serif", boxSizing: "border-box",
                  }}
                />
                <span style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", color: "#777e91", fontSize: 13, fontWeight: 600 }}>
                  VNKR
                </span>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, color: "#777e91", marginBottom: 8, fontWeight: 600 }}>
                Lock Period
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                {TIERS.map((t) => (
                  <button
                    key={t.days}
                    onClick={() => setSelectedDays(t.days)}
                    style={{
                      padding: "8px 4px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 12,
                      background: selectedDays === t.days ? t.color + "40" : "#141416",
                      border: `1px solid ${selectedDays === t.days ? t.color : "#353945"}`,
                      color: selectedDays === t.days ? t.color : "#777e91",
                    }}
                  >
                    {t.days}d
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background: "#141416", borderRadius: 8, padding: 14, marginBottom: 20, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#777e91" }}>APR</span>
                <span style={{ color: "#58BD7D", fontWeight: 600 }}>
                  {TIERS.find((t) => t.days === selectedDays)?.apr || 15.4}%
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#777e91" }}>Estimated Reward</span>
                <span style={{ color: "#58BD7D", fontWeight: 600 }}>{estimatedReward()} VNKR</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#777e91" }}>Unlock Date</span>
                <span>{unlockDate()}</span>
              </div>
            </div>

            <button
              onClick={handleStake}
              disabled={loading}
              className={cn("button", { disabled: loading })}
              style={{ width: "100%", padding: 14, fontSize: 14 }}
            >
              {loading ? "Processing..." : wallet.isConnected ? `Stake ${amount || "0"} VNKR` : "Connect Wallet to Stake"}
            </button>
          </div>

          {/* Your Staking */}
          <div style={{ background: "#23262F", borderRadius: 16, padding: 28 }}>
            <h3 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>Your Staking</h3>

            {wallet.isConnected ? (
              <>
                <div style={{ background: "#141416", borderRadius: 12, padding: 20, marginBottom: 16, textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>0.0000 VNKR</div>
                  <div style={{ fontSize: 12, color: "#777e91" }}>Total Staked</div>
                </div>
                <div style={{ background: "#141416", borderRadius: 12, padding: 20, marginBottom: 20, textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#58BD7D", marginBottom: 4 }}>0.0000 VNKR</div>
                  <div style={{ fontSize: 12, color: "#777e91" }}>Pending Rewards</div>
                </div>
                <button className="button-stroke button-small" style={{ width: "100%", padding: 12, marginBottom: 10 }}>
                  Claim Rewards
                </button>
                <button className="button-stroke button-small" style={{ width: "100%", padding: 12 }}>
                  Unstake
                </button>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
                <p style={{ color: "#777e91", marginBottom: 24 }}>Connect your wallet to see staking details</p>
                <button onClick={connectWallet} className="button" style={{ padding: "12px 24px" }}>
                  Connect Wallet
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tiers Table */}
        <div>
          <h3 style={{ marginBottom: 20 }}>Staking Tiers & Benefits</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#23262F" }}>
                  {["Tier", "Min Stake", "Lock Period", "APR", "Benefits"].map((h) => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#777e91", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIERS.map((t, i) => (
                  <tr key={t.name} style={{ borderTop: "1px solid #23262F", background: i % 2 === 1 ? "#141416" : "transparent" }}>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ background: t.color + "20", color: t.color, borderRadius: 4, padding: "2px 8px", fontWeight: 600, fontSize: 12 }}>
                        {t.name}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>{t.minStake.toLocaleString()} VNKR</td>
                    <td style={{ padding: "14px 16px" }}>{t.days} days</td>
                    <td style={{ padding: "14px 16px", color: "#58BD7D", fontWeight: 600 }}>{t.apr}%</td>
                    <td style={{ padding: "14px 16px", color: "#777e91" }}>
                      {t.name === "Bronze" && "Basic staking rewards"}
                      {t.name === "Silver" && "Rewards + Reduced trading fees"}
                      {t.name === "Gold" && "Rewards + DAO voting + Early access"}
                      {t.name === "Platinum" && "All above + Validator nomination"}
                      {t.name === "Diamond" && "All above + Annual NFT drop + Priority support"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Staking;
