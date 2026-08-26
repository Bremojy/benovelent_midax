import { useEffect, useState } from "react";
import { ArrowLeft, RefreshCw, ReceiptText, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../services/api";

const money = (v) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 2 }).format(Number(v || 0));

export default function MpesaRecords() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = async () => {
    try { setLoading(true); setError(""); const { data } = await API.get("/payments/mine"); setTransactions(Array.isArray(data?.transactions) ? data.transactions : []); }
    catch (e) { setError(e.response?.data?.message || "Unable to load your M-PESA records."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  return <DashboardLayout><main className="portal-page"><div className="portal-module-header"><div><span>ACCOUNT RECORDS</span><h1><ReceiptText size={25}/> M-PESA Records</h1><p>Only transactions linked to your own member account are displayed.</p></div><div className="portal-actions"><Link className="portal-btn secondary" to="/member/accounts"><ArrowLeft size={15}/> Back to Accounts</Link><button className="portal-btn secondary" onClick={load} disabled={loading}><RefreshCw size={15}/> Refresh</button></div></div><div className="portal-alert success"><ShieldCheck size={16}/> Your payment records are protected by your member account permissions. Phone numbers and other members’ private details are never displayed.</div>{error && <div className="portal-alert">{error}</div>}<section className="portal-panel">{loading ? <div className="portal-empty">Loading M-PESA records…</div> : <div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Timestamp</th><th>Purpose</th><th>Amount</th><th>Status</th><th>M-PESA Receipt</th><th>Reference</th></tr></thead><tbody>{transactions.map((x) => <tr key={x._id}><td>{x.createdAt ? new Date(x.createdAt).toLocaleString("en-KE") : "—"}</td><td>{String(x.purpose || "payment").replace(/_/g, " ")}</td><td>{money(x.amount)}</td><td><span className="portal-badge">{x.status || "—"}</span></td><td>{x.mpesaReceiptNumber || "Pending"}</td><td>{x.accountReference || x.requestReference || "—"}</td></tr>)}{transactions.length === 0 && <tr><td colSpan="6">No M-PESA transaction records have been recorded for your account yet.</td></tr>}</tbody></table></div>}</section></main></DashboardLayout>;
}
