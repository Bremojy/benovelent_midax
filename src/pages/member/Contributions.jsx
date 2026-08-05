
import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../services/api";
import { buildPrintHeadHtml, printHeadStyles } from "../../utils/printHead";
import "../../styles/portalModule.css";

export default function Contributions() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const year = new Date().getFullYear();

  useEffect(() => {
    API.get(`/member/accounts?year=${year}`)
      .then((response) => setData(response.data))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, [year]);

  const printPage = () => {
    const win = window.open("", "_blank", "width=1100,height=800");
    if (!win) return;
    const totals = data?.totals || {};
    const monthly = data?.monthly || [];
    const transactions = [...(data?.transactions || [])].sort((a, b) => new Date(b.transactionDate || b.createdAt || 0) - new Date(a.transactionDate || a.createdAt || 0));
    win.document.write(`
      <html>
        <head>
          <title>Accounts — Benevolent Midax</title>
          ${printHeadStyles()}
        </head>
        <body>
          ${buildPrintHeadHtml({
            title: `Accounts Ledger — ${year}`,
            subtitle: "Ledger-style report generated from the Benevolent Midax portal.",
          })}
          <p class="print-note">Contributed this year: ${money(totals.contributedThisYear)} • Ledger balance: ${money(totals.ledgerBalance)} • Cases helped: ${Number(totals.totalCasesHelped || 0)} • Pending claims: ${Number(totals.pendingClaims || 0)}</p>
          <h3>Monthly contribution summary</h3>
          <table>
            <thead><tr><th>Month</th><th>Amount contributed</th><th>Contributing records</th></tr></thead>
            <tbody>
              ${monthly.map((m) => `
                <tr>
                  <td>${new Date(2000, m.month - 1, 1).toLocaleString("en-KE", { month: "long" })}</td>
                  <td>${money(m.contributed)}</td>
                  <td>${Number(m.contributingMembers || 0)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <h3 style="margin-top:22px;">Ledger entries</h3>
          <table>
            <thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              ${transactions.map((x) => `
                <tr>
                  <td>${x.transactionDate ? new Date(x.transactionDate).toLocaleDateString("en-KE") : "—"}</td>
                  <td>${escapeHtml(x.type || "—")}</td>
                  <td>${escapeHtml(x.description || x.category || "—")}</td>
                  <td>${money(x.amount)}</td>
                  <td>${escapeHtml(x.status || "—")}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  if (loading) {
    return <DashboardLayout><div className="portal-empty">Loading Accounts...</div></DashboardLayout>;
  }

  if (error) {
    return <DashboardLayout><div className="portal-alert">{error}</div></DashboardLayout>;
  }

  const totals = data?.totals || {};

  return (
    <DashboardLayout>
      <div className="portal-module">
        <header className="portal-module-header">
          <div>
            <span>BENEVOLENT ACCOUNTING</span>
            <h1>Accounts</h1>
            <p>Ledger-style view of your scheme activity.</p>
          </div>
          <button className="portal-btn" onClick={printPage}>Print / Download</button>
        </header>

        <div className="portal-stat-grid">
          <Stat label="Contributed this year" value={money(totals.contributedThisYear)} />
          <Stat label="Ledger balance" value={money(totals.ledgerBalance)} />
          <Stat label="Cases helped" value={totals.totalCasesHelped || 0} />
          <Stat label="Pending claims" value={totals.pendingClaims || 0} />
        </div>

        <section className="portal-panel">
          <h2>Monthly contribution summary — {year}</h2>
          <div className="portal-table-wrap">
            <table className="portal-table">
              <thead>
                <tr><th>Month</th><th>Amount contributed</th><th>Contributing records</th></tr>
              </thead>
              <tbody>
                {(data?.monthly || []).map((m) => (
                  <tr key={m.month}>
                    <td>{new Date(2000, m.month - 1, 1).toLocaleString("en-KE", { month: "long" })}</td>
                    <td>{money(m.contributed)}</td>
                    <td>{m.contributingMembers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="portal-panel">
          <h2>Ledger</h2>
          <div className="portal-table-wrap">
            <table className="portal-table">
              <thead>
                <tr><th>Date</th><th>Type</th><th>Description</th><th>Amount</th><th>Status</th></tr>
              </thead>
              <tbody>
                {([...((data?.transactions || []))].sort((a, b) => new Date(b.transactionDate || b.createdAt || 0) - new Date(a.transactionDate || a.createdAt || 0))).map((x, i) => (
                  <tr key={x._id || i}>
                    <td>{x.transactionDate ? new Date(x.transactionDate).toLocaleDateString("en-KE") : "—"}</td>
                    <td>{x.type}</td>
                    <td>{x.description || x.category || "—"}</td>
                    <td>{money(x.amount)}</td>
                    <td><span className="portal-badge">{x.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

function Stat({ label, value }) {
  return <div className="portal-stat"><span>{label}</span><strong>{value}</strong></div>;
}

const money = (value) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(Number(value || 0));

function escapeHtml(input) {
  return String(input || "").replace(/[&<>\"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[character]));
}
