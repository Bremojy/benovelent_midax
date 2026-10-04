import { useEffect, useMemo, useState } from "react";
import { Download, RefreshCw, Search, ChevronLeft, ChevronRight, CalendarRange, WalletCards } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../services/api";
import { buildPrintHeadHtml, printHeadStyles } from "../../utils/printHead";
import "../../styles/portalModule.css";

const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const money = (value) => (value === null || value === undefined || value === "" ? "Unavailable" : new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 2 }).format(Number(value)));
const fmt = (value) => value ? new Date(value).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function ContributionWorkspace({ scope = "member" }) {
  const admin = scope === "admin" || scope === "superadmin";
  const title = admin ? "Contribution History" : "My Contributions";
  const subtitle = admin
    ? scope === "superadmin" ? "Scheme-wide payroll contribution history with governance visibility." : "Authorized scheme contribution history for payroll reconciliation."
    : "Your personal payroll contribution history, separate from the shared Constitution Ledger.";
  const [filters, setFilters] = useState({ year: "", month: "", status: "", search: "" });
  const [draftSearch, setDraftSearch] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true); setError("");
      const endpoint = admin ? "/contributions" : "/member/contributions";
      const params = { page: data?.page || 1, limit: admin ? 25 : 12 };
      Object.entries(filters).forEach(([key, value]) => { if (value !== "") params[key] = value; });
      const { data: response } = await API.get(endpoint, { params });
      if (!response?.success) throw new Error(response?.message || "Contribution history is unavailable.");
      setData(response);
    } catch (err) {
      setData(null);
      setError(err.response?.data?.message || err.message || "Unable to load contribution history.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filters.year, filters.month, filters.status, filters.search]);
  const rows = Array.isArray(data?.contributions) ? data.contributions : [];
  const summary = data?.summary || null;
  const page = Number(data?.page || 1);
  const pages = Number(data?.pages || 1);

  const submitSearch = (event) => {
    event?.preventDefault?.();
    setFilters((current) => ({ ...current, search: draftSearch.trim() }));
  };
  const setPage = (next) => {
    if (!data || next < 1 || next > pages || next === page) return;
    setData((current) => ({ ...current, page: next }));
    // Query directly to avoid waiting for unrelated filter changes.
    API.get(admin ? "/contributions" : "/member/contributions", { params: { ...filters, page: next, limit: admin ? 25 : 12 } })
      .then(({ data: response }) => response?.success && setData(response))
      .catch((err) => setError(err.response?.data?.message || err.message || "Unable to load this contribution page."));
  };

  const exportPrint = () => {
    const popup = window.open("", "_blank", "noopener,noreferrer");
    if (!popup) return;
    const body = rows.map((row) => `<tr><td>${admin ? (row.member?.fullName || "—") : "My record"}</td><td>${row.member?.memberNumber || "—"}</td><td>${months[Math.max(0, Number(row.month || 1) - 1)]} ${row.year || "—"}</td><td>${money(row.expectedAmount)}</td><td>${money(row.paidAmount)}</td><td>${money(row.balance)}</td><td>${row.paymentMethod || "—"}</td><td>${row.receiptNumber || row.mpesaCode || row.finance?.referenceNumber || "—"}</td><td>${row.status || "—"}</td><td>${fmt(row.paymentDate)}</td></tr>`).join("");
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>${printHeadStyles()}</head><body>${buildPrintHeadHtml({ title, subtitle })}<table><thead><tr>${admin ? "<th>Member</th><th>Employee no.</th>" : ""}<th>Period</th><th>Expected</th><th>Paid</th><th>Outstanding</th><th>Method</th><th>Reference</th><th>Status</th><th>Payment date</th></tr></thead><tbody>${body || `<tr><td colspan="${admin ? 10 : 8}">No contribution records.</td></tr>`}</tbody></table><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),100));</script></body></html>`);
    popup.document.close();
  };

  const totalExpected = summary?.totalExpected ?? null;
  const totalPaid = admin ? summary?.totalContributed ?? null : summary?.totalPaid ?? null;
  const outstanding = admin ? summary?.outstanding ?? null : summary?.totalBalance ?? null;

  return (
    <DashboardLayout>
      <main className="portal-page contribution-workspace">
        <header className="portal-module-header">
          <div><span>{admin ? "SCHEME CONTRIBUTIONS" : "PERSONAL CONTRIBUTIONS"}</span><h1>{title}</h1><p>{subtitle}</p></div>
          <div className="portal-actions"><button className="portal-btn secondary" type="button" onClick={load} disabled={loading}><RefreshCw size={16}/> Refresh</button><button className="portal-btn secondary" type="button" onClick={exportPrint} disabled={!data}><Download size={16}/> Print / export</button></div>
        </header>
        {error && <div className="portal-alert error">{error}</div>}

        <section className="portal-panel">
          <div className="portal-form-grid">
            <div className="portal-field"><label htmlFor={`${scope}-contribution-year`}>Year</label><select id={`${scope}-contribution-year`} value={filters.year} onChange={(e) => setFilters((x) => ({ ...x, year: e.target.value }))}><option value="">All years</option>{Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - i).map((year) => <option value={year} key={year}>{year}</option>)}</select></div>
            <div className="portal-field"><label htmlFor={`${scope}-contribution-month`}>Month</label><select id={`${scope}-contribution-month`} value={filters.month} onChange={(e) => setFilters((x) => ({ ...x, month: e.target.value }))}><option value="">All months</option>{months.map((month, index) => <option value={index + 1} key={month}>{month}</option>)}</select></div>
            <div className="portal-field"><label htmlFor={`${scope}-contribution-status`}>Status</label><select id={`${scope}-contribution-status`} value={filters.status} onChange={(e) => setFilters((x) => ({ ...x, status: e.target.value }))}><option value="">All statuses</option><option value="pending">Pending</option><option value="partial">Partial</option><option value="paid">Paid</option><option value="overdue">Overdue</option></select></div>
            {admin && <div className="portal-field"><label htmlFor={`${scope}-contribution-search`}>Member / employee no. / receipt</label><form onSubmit={submitSearch} style={{ display: "flex", gap: 8 }}><input id={`${scope}-contribution-search`} value={draftSearch} onChange={(e) => setDraftSearch(e.target.value)} placeholder="Search authorized records" /><button className="portal-btn secondary" type="submit" aria-label="Search contributions"><Search size={16}/></button></form></div>}
          </div>
        </section>

        {loading ? <div className="portal-loading-card"><RefreshCw className="spinning" size={20}/> Loading authoritative contribution records…</div> : !data ? null : (
          <>
            <section className="portal-stat-grid">
              <div className="portal-stat"><span>Expected</span><strong>{totalExpected === null ? "Unavailable" : money(totalExpected)}</strong></div>
              <div className="portal-stat"><span>Paid</span><strong>{totalPaid === null ? "Unavailable" : money(totalPaid)}</strong></div>
              <div className="portal-stat"><span>Outstanding</span><strong>{outstanding === null ? "Unavailable" : money(outstanding)}</strong></div>
              <div className="portal-stat"><span>Records</span><strong>{Number(data.total ?? data.count ?? rows.length)}</strong></div>
            </section>

            <section className="portal-panel">
              <div className="portal-module-header compact-header"><div><span>CANONICAL PAYROLL HISTORY</span><h2>Contribution records</h2><p>{Number(data.total ?? data.count ?? rows.length)} authorized records match the current filters.</p></div><WalletCards size={24}/></div>
              {rows.length === 0 ? <div className="portal-empty"><h3>No contribution records found</h3><p>There are no authoritative records matching the current filters.</p></div> : (
                <div className="portal-table-wrap">
                  <table className="portal-table contribution-table"><thead><tr>{admin && <th>Member</th>}{admin && <th>Employee no.</th>}<th>Period</th><th>Expected</th><th>Paid</th><th>Outstanding</th><th>Method</th><th>Reference</th><th>Status</th><th>Payment date</th></tr></thead><tbody>{rows.map((row) => <tr key={row._id}>{admin && <td>{row.member?.fullName || "—"}</td>}{admin && <td>{row.member?.memberNumber || "—"}</td>}<td>{months[Math.max(0, Number(row.month || 1) - 1)]} {row.year || "—"}</td><td>{money(row.expectedAmount)}</td><td>{money(row.paidAmount)}</td><td>{money(row.balance)}</td><td>{row.paymentMethod || "—"}</td><td>{row.receiptNumber || row.mpesaCode || row.finance?.referenceNumber || "—"}</td><td><span className="portal-badge">{row.status || "—"}</span></td><td>{fmt(row.paymentDate)}</td></tr>)}</tbody></table>
                </div>
              )}
              {pages > 1 && <div className="portal-pagination" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 16 }}><span>Page {page} of {pages}</span><div className="portal-actions"><button className="portal-btn secondary" type="button" onClick={() => setPage(page - 1)} disabled={page <= 1}><ChevronLeft size={16}/> Previous</button><button className="portal-btn secondary" type="button" onClick={() => setPage(page + 1)} disabled={page >= pages}>Next <ChevronRight size={16}/></button></div></div>}
            </section>
          </>
        )}
      </main>
    </DashboardLayout>
  );
}
