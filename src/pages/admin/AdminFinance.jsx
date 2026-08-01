import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../services/api";
import "../../styles/portalModule.css";

export default function AdminFinance() {
  const [summary, setSummary] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true); setError("");
      const [s, t, c] = await Promise.all([
        API.get("/finance/summary/dashboard"),
        API.get("/finance"),
        API.get("/contributions"),
      ]);
      setSummary(s.data?.summary || s.data || {});
      setTransactions(Array.isArray(t.data?.transactions) ? t.data.transactions : []);
      setContributions(Array.isArray(c.data?.contributions) ? c.data.contributions : []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to load finance records.");
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const number = (value) => new Intl.NumberFormat("en-KE", { style:"currency", currency:"KES", maximumFractionDigits:0 }).format(Number(value || 0));
  const first = (...keys) => {
    for (const key of keys) if (summary?.[key] !== undefined) return summary[key];
    return 0;
  };

  return (
    <DashboardLayout>
      <div className="portal-module">
        <header className="portal-module-header">
          <div><span>FINANCIAL CONTROL</span><h1>Finance</h1><p>Monitor contributions, transactions and the Benevolent Midax financial position.</p></div>
          <button className="portal-btn" onClick={load} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</button>
        </header>
        {error && <div className="portal-alert">{error}</div>}

        <div className="portal-stat-grid">
          <Stat label="Total Income" value={number(first("totalIncome","income","totalContributions"))} />
          <Stat label="Total Expenses" value={number(first("totalExpenses","expenses"))} />
          <Stat label="Balance" value={number(first("balance","netBalance","currentBalance"))} />
          <Stat label="Transactions" value={transactions.length} />
        </div>

        <section className="portal-panel">
          <h2>Recent Transactions</h2>
          {transactions.length === 0 ? <div className="portal-empty">No finance transactions returned.</div> :
            <div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Amount</th><th>Status</th></tr></thead><tbody>
              {transactions.slice(0,30).map((x,i)=><tr key={x._id||i}><td>{date(x.date||x.createdAt)}</td><td>{x.type||"—"}</td><td>{x.description||x.reference||"—"}</td><td>{number(x.amount)}</td><td><span className="portal-badge">{x.status||"Recorded"}</span></td></tr>)}
            </tbody></table></div>}
        </section>

        <section className="portal-panel">
          <h2>Contributions</h2>
          {contributions.length === 0 ? <div className="portal-empty">No contribution records returned.</div> :
            <div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Member</th><th>Period</th><th>Expected</th><th>Paid</th><th>Status</th></tr></thead><tbody>
              {contributions.slice(0,30).map((x,i)=><tr key={x._id||i}><td>{x.member?.fullName||x.member?.memberNumber||"Member"}</td><td>{x.month||"—"} {x.year||""}</td><td>{number(x.expectedAmount)}</td><td>{number(x.paidAmount)}</td><td><span className="portal-badge">{x.status||"Recorded"}</span></td></tr>)}
            </tbody></table></div>}
        </section>
      </div>
    </DashboardLayout>
  );
}
function Stat({label,value}){return <div className="portal-stat"><span>{label}</span><strong>{value}</strong></div>}
function date(v){return v?new Date(v).toLocaleDateString("en-KE",{day:"2-digit",month:"short",year:"numeric"}):"—"}
