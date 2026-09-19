import { Download, FileDown, Printer, RefreshCw } from "lucide-react";
import API from "../../services/api";
import { buildPrintHeadHtml, printHeadStyles } from "../../utils/printHead";

const money = (v) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 2 }).format(Number(v || 0));
const dt = (v) => v ? new Date(v).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—";

async function downloadBlob(url, params, fallbackName, type) {
  const response = await API.get(url, { params, responseType: "blob" });
  const blob = new Blob([response.data], { type });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = fallbackName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(href);
}

export default function LedgerControls({ data, dates, onLoad, busy = false, title = "Benevolent Constitution Ledger", personalContributionTotal, contributionStatus }) {
  const printLedger = () => {
    if (!data) return;
    const popup = window.open("", "_blank", "noopener,noreferrer");
    if (!popup) return;
    const rows = (data.entries || []).map((entry) => `
      <tr><td>${dt(entry.date)}</td><td>${entry.transactionNumber || "—"}</td><td>${entry.description || "—"}</td><td>${entry.category || "—"}</td><td>${money(entry.amount)}</td><td>${entry.direction || "—"}</td><td>${entry.status || "—"}</td><td>${money(entry.runningBalance)}</td></tr>
    `).join("");
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>${printHeadStyles()}<style>@page{size:A4 landscape;margin:10mm}.print-shell{break-after:auto}.ledger-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:0 0 18px}.ledger-summary div{border:1px solid #ddd;padding:8px}.ledger-summary span{display:block;font-size:10px}.ledger-summary strong{font-size:14px}table{font-size:8px}th,td{padding:6px}</style></head><body>
      ${buildPrintHeadHtml({ title, subtitle: `Date range: ${data.startDate} to ${data.endDate}` })}
      <p class="print-note">Generated ${dt(new Date())}. Current live book balance reflects valid approved/completed scheme transactions as of the timestamp below.</p>
      <div class="ledger-summary"><div><span>Opening balance</span><strong>${money(data.openingBalance)}</strong></div><div><span>Money in</span><strong>${money(data.totals?.credit)}</strong></div><div><span>Money out</span><strong>${money(data.totals?.debit)}</strong></div><div><span>Closing balance</span><strong>${money(data.closingBalance)}</strong></div><div><span>Current book balance</span><strong>${money(data.currentBookBalance)}</strong></div>${personalContributionTotal !== undefined ? `<div><span>My contributions</span><strong>${money(personalContributionTotal)}</strong></div>` : ""}${contributionStatus ? `<div><span>Contribution status</span><strong>${contributionStatus}</strong></div>` : ""}<div><span>As of</span><strong>${dt(data.asOf)}</strong></div></div>
      <table><thead><tr><th>Date</th><th>Transaction/reference</th><th>Description</th><th>Category</th><th>Amount</th><th>Direction</th><th>Status</th><th>Running balance</th></tr></thead><tbody>${rows || '<tr><td colspan="8">No valid ledger entries were recorded for this date range.</td></tr>'}</tbody></table>
      <script>window.addEventListener('load',()=>setTimeout(()=>window.print(),100));</script></body></html>`);
    popup.document.close();
  };

  const runDownload = async (format) => {
    if (!data || !dates?.start || !dates?.end) return;
    const suffix = `${dates.start}-${dates.end}`;
    if (format === "pdf") await downloadBlob("/finance/constitution-ledger/export.pdf", { startDate: dates.start, endDate: dates.end }, `benevolent-constitution-ledger-${suffix}.pdf`, "application/pdf");
    else await downloadBlob("/finance/constitution-ledger/export.csv", { startDate: dates.start, endDate: dates.end }, `benevolent-constitution-ledger-${suffix}.csv`, "text/csv;charset=utf-8");
  };

  return <>
    <div className="date-filter-row" style={{ alignItems: "end", flexWrap: "wrap" }}>
      <label>From<input type="date" value={dates?.start || ""} onChange={(e) => dates?.setStart?.(e.target.value)} /></label>
      <label>To<input type="date" value={dates?.end || ""} onChange={(e) => dates?.setEnd?.(e.target.value)} /></label>
      <button className="portal-btn" type="button" onClick={onLoad} disabled={busy}><RefreshCw size={16} /> {busy ? "Loading…" : "Load ledger"}</button>
      {data && <>
        <button className="portal-btn secondary" type="button" onClick={printLedger}><Printer size={16} /> Print ledger</button>
        <button className="portal-btn secondary" type="button" onClick={() => runDownload("pdf")}><Download size={16} /> Download PDF</button>
        <button className="portal-btn secondary" type="button" onClick={() => runDownload("csv")}><FileDown size={16} /> Download CSV</button>
      </>}
    </div>
    {data && <div className="account-grid four">
      <div className="account-card compact"><span>Current Constitution Book Balance</span><strong>{money(data.currentBookBalance)}</strong><small>As of {dt(data.asOf)}</small></div>
      <div className="account-card compact"><span>Opening balance</span><strong>{money(data.openingBalance)}</strong><small>Balance before selected period</small></div>
      <div className="account-card compact"><span>Money in</span><strong>{money(data.totals?.credit)}</strong><small>Selected period</small></div>
      <div className="account-card compact"><span>Money out</span><strong>{money(data.totals?.debit)}</strong><small>Selected period</small></div>
      <div className="account-card compact"><span>Closing balance</span><strong>{money(data.closingBalance)}</strong><small>Selected period</small></div>
      {personalContributionTotal !== undefined && <div className="account-card compact"><span>My contribution total</span><strong>{money(personalContributionTotal)}</strong><small>Personal history, not scheme balance</small></div>}
      {contributionStatus && <div className="account-card compact"><span>Contribution status</span><strong>{contributionStatus}</strong><small>Your current contribution position</small></div>}
    </div>}
  </>;
}
