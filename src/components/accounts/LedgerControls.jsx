import { Download, FileDown, Printer, RefreshCw } from "lucide-react";
import API from "../../services/api";
import { openPrintDocument, escapePrintHtml } from "../../utils/printHead";

const money = (v) => {
  if (v === null || v === undefined || v === "") return "—";
  const amount = Number(v);
  return Number.isFinite(amount) ? new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 2 }).format(amount) : "—";
};
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

export default function LedgerControls({ data, dates, onLoad, busy = false, title = "Benevolent Constitution Ledger", personalContributionTotal, contributionStatus, currentBalanceLabel = "Scheme Current Book Balance" }) {
  const printLedger = () => {
    if (!data) return false;
    const rows = (data.entries || []).map((entry) => `<tr><td>${escapePrintHtml(dt(entry.date))}</td><td>${escapePrintHtml(entry.transactionNumber || "—")}</td><td>${escapePrintHtml(entry.transactedByName || entry.transactedBy?.fullName || entry.transactedBy?.name || "Recorded actor unavailable")}</td><td>${escapePrintHtml(entry.description || "—")}</td><td>${escapePrintHtml(entry.category || "—")}</td><td>${escapePrintHtml(money(entry.amount))}</td><td>${escapePrintHtml(entry.direction || "—")}</td><td>${escapePrintHtml(entry.status || "—")}</td><td>${escapePrintHtml(money(entry.runningBalance))}</td></tr>`).join("");
    const bodyHtml = `<p class="print-note">Current live book balance reflects authoritative ledger entries available as of the generated timestamp.</p><div class="print-summary"><div><span>${escapePrintHtml(currentBalanceLabel)}</span><strong>${escapePrintHtml(money(data.currentBookBalance))}</strong></div><div><span>Opening balance</span><strong>${escapePrintHtml(money(data.openingBalance))}</strong></div><div><span>Money in</span><strong>${escapePrintHtml(money(data.totals?.credit))}</strong></div><div><span>Money out</span><strong>${escapePrintHtml(money(data.totals?.debit))}</strong></div><div><span>Closing balance</span><strong>${escapePrintHtml(money(data.closingBalance))}</strong></div>${personalContributionTotal !== undefined && personalContributionTotal !== null ? `<div><span>Payroll contributions</span><strong>${escapePrintHtml(money(personalContributionTotal))}</strong></div>` : ""}${contributionStatus ? `<div><span>Contribution status</span><strong>${escapePrintHtml(contributionStatus)}</strong></div>` : ""}<div><span>As of</span><strong>${escapePrintHtml(dt(data.asOf))}</strong></div></div><div class="print-table-wrap"><table><thead><tr><th>Date</th><th>Transaction</th><th>Transacted by</th><th>Description</th><th>Category</th><th>Amount</th><th>Direction</th><th>Status</th><th>Running balance</th></tr></thead><tbody>${rows || '<tr><td colspan="9">No valid ledger entries were recorded for this date range.</td></tr>'}</tbody></table></div>`;
    return openPrintDocument({ title, subtitle:`Date range: ${data.startDate} to ${data.endDate}`, portal:"Member / Admin / SuperAdmin", documentType:"Constitution Ledger", dateRange:`${data.startDate} to ${data.endDate}`, classification:"Official Record", bodyHtml, orientation:"landscape", filename:`benevolent-constitution-ledger-${dates?.start || "range"}-${dates?.end || "range"}` });
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
    {busy && !data && <div className="portal-empty">Loading ledger…</div>}

  </>;
}
