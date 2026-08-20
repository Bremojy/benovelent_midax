import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../services/api";
import { buildPrintHeadHtml, printHeadStyles } from "../../utils/printHead";
import "../../styles/portalModule.css";

const money = (value) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(Number(value || 0));
const monthName = (month) => new Date(2000, Number(month) - 1, 1).toLocaleString("en-KE", { month: "long" });
const safe = (input) => String(input ?? "").replace(/[&<>\"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

export default function Contributions() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const year = new Date().getFullYear();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await API.get(`/member/accounts?year=${year}`);
      setData(response.data || null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to load scheme accounts.");
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const printPage = () => {
    if (!data) return;
    const win = window.open("", "_blank", "width=1100,height=800");
    if (!win) return;
    const totals = data.totals || {};
    win.document.write(`
      <html><head><title>Benovelent MIDAX Scheme Accounts</title>${printHeadStyles()}</head><body>
      ${buildPrintHeadHtml({ title: `Benovelent MIDAX Scheme Accounts — ${year}`, subtitle: "General Benovelent MIDAX scheme account statement." })}
      <p class="print-note">Standard monthly payroll deduction: ${money(data.standardMonthlyDeduction)} • Active members: ${Number(data.activeMembers || 0)} • Total collected: ${money(totals.totalCollected)} • Outstanding: ${money(totals.outstanding)}</p>
      <h3>Monthly scheme contribution summary</h3>
      <table><thead><tr><th>Month</th><th>Expected</th><th>Collected</th><th>Outstanding</th><th>Members charged</th></tr></thead><tbody>
      ${(data.monthly || []).map((m) => `<tr><td>${monthName(m.month)}</td><td>${money(m.expected)}</td><td>${money(m.collected)}</td><td>${money(m.outstanding)}</td><td>${Number(m.membersCharged || 0)}</td></tr>`).join("")}
      </tbody></table>
      <h3 style="margin-top:22px;">Support summary</h3>
      <p>Total cases: ${Number(data.support?.totalCases || 0)} • Approved cases: ${Number(data.support?.approvedCases || 0)} • Pending cases: ${Number(data.support?.pendingCases || 0)} • Approved support: ${money(data.support?.approvedSupportTotal)}</p>
      <h3 style="margin-top:22px;">Scheme ledger summary</h3>
      <p>Credits: ${money(data.totals?.ledgerCredits)} • Debits: ${money(data.totals?.ledgerDebits)} • Closing balance: ${money(data.totals?.ledgerBalance)}</p>
      <table><thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead><tbody>
      ${(data.ledger?.entries || []).map((x) => `<tr><td>${x.date ? new Date(x.date).toLocaleDateString("en-KE") : "—"}</td><td>${safe(x.type || "—")}</td><td>${safe(x.category || "—")}</td><td>${safe(x.description || "—")}</td><td>${money(x.debit)}</td><td>${money(x.credit)}</td><td>${money(x.runningBalance)}</td></tr>`).join("")}
      </tbody></table>
      <script>window.onload=()=>window.print();</script></body></html>
    `);
    win.document.close();
  };

  if (loading) return <DashboardLayout><div className="portal-empty">Loading scheme Accounts…</div></DashboardLayout>;
  if (error) return <DashboardLayout><div className="portal-alert">{error}</div></DashboardLayout>;

  const totals = data?.totals || {};
  const currentMonth = data?.monthly?.find((m) => Number(m.month) === Number(data.month));

  return (
    <DashboardLayout>
      <div className="portal-module">
        <header className="portal-module-header">
          <div><span>BENOVELENT SCHEME ACCOUNTS</span><h1>Accounts</h1><p>One transparent, scheme-wide account view shared consistently by every member.</p></div>
          <div className="portal-actions"><button className="portal-btn secondary" onClick={load} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button><button className="portal-btn" onClick={printPage} disabled={!data}>Print / Download</button></div>
        </header>

        <section className="portal-panel">
          <div className="portal-alert success"><strong>Payroll contribution model:</strong> the scheme applies one standard monthly deduction across the membership.</div>
        </section>

        <div className="portal-stat-grid">
          <Stat label="Standard monthly deduction" value={money(data?.standardMonthlyDeduction)} />
          <Stat label="Active members" value={Number(data?.activeMembers || 0)} />
          <Stat label="Collected this year" value={money(totals.totalCollected)} />
          <Stat label="Outstanding" value={money(totals.outstanding)} />
          <Stat label="Support approved" value={money(totals.approvedSupportTotal)} />
          <Stat label="Scheme balance" value={money(totals.ledgerBalance)} />
        </div>

        <section className="portal-panel">
          <div className="portal-module-header"><div><span>MONTHLY PAYROLL PULSE</span><h2>{monthName(data?.month)} {year}</h2><p>Current scheme-wide deduction and collection status.</p></div></div>
          <div className="portal-stat-grid">
            <Stat label="Expected this month" value={money(currentMonth?.expected)} />
            <Stat label="Collected this month" value={money(currentMonth?.collected)} />
            <Stat label="Outstanding this month" value={money(currentMonth?.outstanding)} />
            <Stat label="Members charged" value={Number(currentMonth?.membersCharged || 0)} />
          </div>
        </section>

        <section className="portal-panel">
          <h2>Monthly scheme contribution summary</h2>
          <div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Month</th><th>Expected</th><th>Collected</th><th>Outstanding</th><th>Members charged</th></tr></thead><tbody>
            {(data?.monthly || []).map((m) => <tr key={m.month}><td>{monthName(m.month)}</td><td>{money(m.expected)}</td><td>{money(m.collected)}</td><td>{money(m.outstanding)}</td><td>{m.membersCharged}</td></tr>)}
          </tbody></table></div>
        </section>

        <section className="portal-grid two">
          <article className="portal-panel"><h2>Support summary</h2><div className="portal-stat-grid"><Stat label="All support cases" value={data?.support?.totalCases || 0} /><Stat label="Approved cases" value={data?.support?.approvedCases || 0} /><Stat label="Pending cases" value={data?.support?.pendingCases || 0} /><Stat label="Approved support" value={money(data?.support?.approvedSupportTotal)} /></div></article>
          <article className="portal-panel"><h2>Scheme ledger</h2><div className="portal-stat-grid"><Stat label="Credits" value={money(data?.totals?.ledgerCredits)} /><Stat label="Debits" value={money(data?.totals?.ledgerDebits)} /><Stat label="Closing balance" value={money(data?.totals?.ledgerBalance)} /></div><p className="print-note">This is a shared scheme account view for members.</p></article>
        </section>

        <section className="portal-panel"><h2>Recent scheme ledger activity</h2><div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead><tbody>
          {(data?.ledger?.entries || []).slice(0, 40).map((x, i) => <tr key={i}><td>{x.date ? new Date(x.date).toLocaleDateString("en-KE") : "—"}</td><td>{x.type || "—"}</td><td>{x.category || "—"}</td><td>{x.description || "—"}</td><td>{x.debit ? money(x.debit) : "—"}</td><td>{x.credit ? money(x.credit) : "—"}</td><td>{money(x.runningBalance)}</td></tr>)}
          {!data?.ledger?.entries?.length && <tr><td colSpan="7">No approved scheme ledger activity for this year.</td></tr>}
        </tbody></table></div></section>
      </div>
    </DashboardLayout>
  );
}

function Stat({ label, value }) { return <div className="portal-stat"><span>{label}</span><strong>{value}</strong></div>; }
