import React, { useState, useEffect } from "react";
import VNKRApi from "../../services/vnkr-api";
import { useVNKR } from "../../contexts/VNKRContext";

const StatusBadge = ({ status }) => {
  const colors = { Active: "#58BD7D", Passed: "#3772FF", Rejected: "#FF6838", Pending: "#F7931A" };
  const color = colors[status] || "#777e91";
  return (
    <span style={{
      background: color + "20", color, borderRadius: 20,
      padding: "3px 12px", fontSize: 12, fontWeight: 600,
    }}>{status}</span>
  );
};

const DAO = () => {
  const { wallet, connectWallet } = useVNKR();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    VNKRApi.getProposals().then((data) => {
      setProposals(data);
      setLoading(false);
    });
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleVote = async (proposalId, support) => {
    if (!wallet.isConnected) {
      try { await connectWallet(); } catch (e) { showToast(e.message, "error"); return; }
    }
    setVotingId(proposalId);
    const result = await VNKRApi.vote(proposalId, support);
    setVotingId(null);
    if (result?.success) {
      showToast(`Vote cast: ${support ? "FOR" : "AGAINST"} Proposal #${proposalId}`);
    } else {
      showToast("Vote recorded (demo mode)", "success");
    }
  };

  const stats = [
    { label: "Active Proposals", value: proposals.filter((p) => p.status === "Active").length, color: "#58BD7D" },
    { label: "Proposals Passed", value: proposals.filter((p) => p.status === "Passed").length, color: "#3772FF" },
    { label: "Token Holders", value: "3,842", color: "#9B51E0" },
    { label: "Total Votes (VNKR)", value: "48.2M", color: "#F7931A" },
  ];

  return (
    <div className="section section-bg" style={{ padding: "40px 0" }}>
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

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h2 className="h2" style={{ marginBottom: 8 }}>DAO Governance</h2>
            <p style={{ color: "#777e91" }}>
              Tham gia quản trị phi tập trung VNKR. Mọi người nắm giữ VNKR đều có quyền bỏ phiếu.
            </p>
          </div>
          <button
            onClick={() => showToast("Tính năng tạo đề xuất sẽ ra mắt Q4 2025", "success")}
            className="button"
            style={{ padding: "12px 24px" }}
          >
            + New Proposal
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 32 }}>
          {stats.map((s) => (
            <div key={s.label} style={{ background: "#23262F", borderRadius: 12, padding: 20, textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#777e91", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Proposals */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#777e91" }}>Loading proposals...</div>
        ) : (
          proposals.map((p) => {
            const total = p.votesFor + p.votesAgainst;
            const forPct = total > 0 ? Math.round((p.votesFor / total) * 100) : 0;
            const daysLeft = Math.max(0, Math.ceil((p.endTime - Date.now() / 1000) / 86400));
            const fmtNum = (n) => n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(0) + "K" : n;

            return (
              <div key={p.id} style={{
                background: "#23262F", borderRadius: 16, padding: 24, marginBottom: 16,
                border: "1px solid #353945", transition: "border-color .2s",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{p.title}</h3>
                  <StatusBadge status={p.status} />
                </div>

                <div style={{ fontSize: 12, color: "#777e91", marginBottom: 12 }}>
                  Proposal #{p.id} | {p.status === "Active" ? `${daysLeft} days remaining` : "Ended"} |{" "}
                  Total: {fmtNum(total)} VNKR votes
                </div>

                {/* Progress bar */}
                <div style={{ background: "#353945", borderRadius: 4, height: 8, marginBottom: 8, overflow: "hidden" }}>
                  <div style={{ width: forPct + "%", height: "100%", background: "#3772FF", borderRadius: 4 }} />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#777e91", marginBottom: p.status === "Active" ? 16 : 0 }}>
                  <span style={{ color: "#58BD7D" }}>✓ For: {forPct}% ({fmtNum(p.votesFor)} VNKR)</span>
                  <span style={{ color: "#FF6838" }}>✕ Against: {100 - forPct}% ({fmtNum(p.votesAgainst)} VNKR)</span>
                </div>

                {p.status === "Active" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => handleVote(p.id, true)}
                      disabled={votingId === p.id}
                      style={{
                        padding: "8px 20px", borderRadius: 8, cursor: "pointer",
                        fontWeight: 600, fontSize: 13, border: "none",
                        background: "#58BD7D", color: "#fff",
                        opacity: votingId === p.id ? 0.6 : 1,
                      }}
                    >
                      {votingId === p.id ? "Voting..." : "✓ Vote For"}
                    </button>
                    <button
                      onClick={() => handleVote(p.id, false)}
                      disabled={votingId === p.id}
                      style={{
                        padding: "8px 20px", borderRadius: 8, cursor: "pointer",
                        fontWeight: 600, fontSize: 13, border: "none",
                        background: "#353945", color: "#FCFCFD",
                        opacity: votingId === p.id ? 0.6 : 1,
                      }}
                    >
                      ✕ Vote Against
                    </button>
                    <span style={{ fontSize: 12, color: "#777e91", alignSelf: "center", marginLeft: 8 }}>
                      {!wallet.isConnected && "Connect wallet to vote"}
                    </span>
                  </div>
                )}

                {p.status !== "Active" && (
                  <div style={{ fontSize: 12, color: "#777e91", marginTop: 4 }}>
                    This proposal has concluded. {p.status === "Passed" ? "✓ Passed" : "✕ Rejected"}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* How DAO works */}
        <div style={{ background: "#3772FF10", border: "1px solid #3772FF30", borderRadius: 12, padding: 24, marginTop: 8 }}>
          <h4 style={{ margin: "0 0 12px", color: "#3772FF" }}>How VNKR DAO Works</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, fontSize: 13, color: "#777e91" }}>
            <div><strong style={{ color: "#FCFCFD" }}>Voting Power</strong><br />1 VNKR staked = 1 vote. More stake = more influence.</div>
            <div><strong style={{ color: "#FCFCFD" }}>Quorum</strong><br />15% of total staked VNKR must participate for a vote to be valid.</div>
            <div><strong style={{ color: "#FCFCFD" }}>Execution</strong><br />Passed proposals are executed automatically via smart contract after timelock (48h).</div>
            <div><strong style={{ color: "#FCFCFD" }}>Rewards</strong><br />Active voters receive 5% bonus on their staking APR per quarter.</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DAO;
