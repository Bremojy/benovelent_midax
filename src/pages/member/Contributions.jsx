import { useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../services/api";
import { buildPrintHeadHtml, printHeadStyles } from "../../utils/printHead";
import "../../styles/portalModule.css";

const money = (value) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 2 }).format(Number(value || 0));
const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function Contributions() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true); setError("");
      const { data: response } = await API.get("/member/contributions", { params: { year } });
      if (!response?.success) throw new Error(response?.message || "Unable to load your contributions.");
      setData(response);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to load your contributions.");
      setData(null);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [year]);

  const rows = Array.isArray(data?.contributions) ? data.contributions : [];
  const summary = data?.summary || {};
  const print = () => {
    const popup = window.open("", "_blank", "noopener,noreferrer");
    if (!popup) return;
    const table = rows.map((x) => `<tr><td>${months[Math.max(0, Number(x.month || 1)-1)]} ${x.year || year}</td><td>${money(x.expectedAmount)}</td><td>${money(x.paidAmount)}</td><td>${money(x.balance)}</td><td>${x.paymentMethod || "—"}</td><td>${x.receiptNumber || x.finance?.referenceNumber || "—"}</td><td>${x.status || "—"}</td></tr>`).join("");
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>My Benevolent Contributions</title>${printHeadStyles()}</head><body>${buildPrintHeadHtml({ title: "Member Contribution Statement", subtitle: `Contribution history for ${year}` })}<div class="portal-stat-grid"><div><strong>${money(summary.totalExpected)}</strong><span>Expected</span></div><div><strong>${money(summary.totalPaid)}</strong><span>Paid</span></div><div><strong>${money(summary.totalBalance)}</strong><span>Outstanding</span></div></div><table><thead><tr><th>Period</th><th>Expected</th><th>Paid</th><th>Outstanding</th><th>Method</th><th>Reference</th><th>Status</th></tr></thead><tbody>${table || '<tr><td colspan="7">No contribution records for this year.</td></tr>'}</tbody></table><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),100));</script></body></html>`);
    popup.document.close();
  };

  return <DashboardLayout><main className="portal-page">
    <header className="portal-module-header"><div><span>PERSONAL CONTRIBUTIONS</span><h1>My Contributions</h1><p>This page contains only your personal contribution history. It is separate from the shared Constitution Ledger.</p></div><div className="portal-actions"><button className="portal-btn secondary" type="button" onClick={load} disabled={loading}><RefreshCw size={16}/> Refresh</button><button className="portal-btn secondary" type="button" onClick={print} disabled={!data}><Download size={16}/> Print / export</button></div></header>
    {error && <div className="portal-alert error">{error}</div>}
    <section className="portal-panel"><div className="date-filter-row"><label>Contribution year<select value={year} onChange={(e)=>setYear(Number(e.target.value))}>{Array.from({length:6},(_,i)=>new Date().getFullYear()-i).map((y)=><option key={y} value={y}>{y}</option>)}</select></label></div></section>
    {loading ? <div className="portal-panel">Loading your contribution history…</div> : data && <>
      <section className="portal-stat-grid"><div className="portal-stat"><span>Total expected</span><strong>{money(summary.totalExpected)}</strong></div><div className="portal-stat"><span>Amount paid</span><strong>{money(summary.totalPaid)}</strong></div><div className="portal-stat"><span>Outstanding</span><strong>{money(summary.totalBalance)}</strong></div><div className="portal-stat"><span>Records</span><strong>{rows.length}</strong></div></section>
      <section className="portal-panel"><div className="portal-module-header"><div><span>PERSONAL HISTORY</span><h2>{year} contribution records</h2></div></div><div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Period</th><th>Expected</th><th>Paid</th><th>Outstanding</th><th>Payment method</th><th>Reference</th><th>Status</th></tr></thead><tbody>{rows.length ? rows.map((x)=><tr key={x._id}><td>{months[Math.max(0, Number(x.month || 1)-1)]} {x.year || year}</td><td>{money(x.expectedAmount)}</td><td>{money(x.paidAmount)}</td><td>{money(x.balance)}</td><td>{x.paymentMethod || "—"}</td><td>{x.receiptNumber || x.finance?.referenceNumber || "—"}</td><td><span className="portal-badge">{x.status || "—"}</span></td></tr>) : <tr><td colSpan="7">No contribution records were found for {year}.</td></tr>}</tbody></table></div></section>
    </>}
  </main></DashboardLayout>;
}
