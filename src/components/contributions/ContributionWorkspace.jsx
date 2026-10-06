import { useEffect, useState } from "react";
import { Download, RefreshCw, Search, ChevronLeft, ChevronRight, WalletCards, Eye, Edit3, CheckCircle2, RotateCcw, Trash2, X } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../services/api";
import { openPrintDocument, escapePrintHtml } from "../../utils/printHead";
import { confirmAction } from "../../utils/modernDialog";
import "../../styles/portalModule.css";

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
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
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editingContribution, setEditingContribution] = useState(null);
  const [editForm, setEditForm] = useState({ expectedAmount: "", paidAmount: "", receiptNumber: "", mpesaCode: "", paymentDate: "", notes: "" });
  const [actionBusy, setActionBusy] = useState("");

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

  useEffect(() => {
    const handler = (event) => {
      if (event.key !== "Escape") return;
      if (editingContribution) setEditingContribution(null);
      else if (selected) setSelected(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editingContribution, selected]);

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
    API.get(admin ? "/contributions" : "/member/contributions", { params: { ...filters, page: next, limit: admin ? 25 : 12 } })
      .then(({ data: response }) => response?.success && setData(response))
      .catch((err) => setError(err.response?.data?.message || err.message || "Unable to load this contribution page."));
  };

  const openDetails = async (row) => {
    try {
      setDetailLoading(true); setError("");
      const { data: response } = await API.get(`/contributions/${row._id}`);
      if (!response?.success) throw new Error(response?.message || "Contribution details are unavailable.");
      setSelected(response.contribution || null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to load contribution details.");
    } finally { setDetailLoading(false); }
  };

  const startEdit = (row) => {
    setEditingContribution(row);
    setEditForm({
      expectedAmount: row?.expectedAmount ?? "",
      paidAmount: row?.paidAmount ?? "",
      receiptNumber: row?.receiptNumber || "",
      mpesaCode: row?.mpesaCode || "",
      paymentDate: row?.paymentDate ? new Date(row.paymentDate).toISOString().slice(0, 10) : "",
      notes: row?.notes || "",
    });
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    if (!editingContribution?._id) return;
    try {
      setActionBusy(`edit-${editingContribution._id}`); setError(""); setMessage("");
      const { data: response } = await API.put(`/contributions/${editingContribution._id}`, {
        expectedAmount: Number(editForm.expectedAmount),
        paidAmount: Number(editForm.paidAmount),
        paymentMethod: "Payroll",
        receiptNumber: editForm.receiptNumber,
        mpesaCode: editForm.mpesaCode,
        paymentDate: editForm.paymentDate || undefined,
        notes: editForm.notes,
      });
      if (!response?.success) throw new Error(response?.message || "Unable to update contribution.");
      setMessage("Contribution updated and its linked finance record synchronized.");
      setEditingContribution(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to update contribution.");
    } finally { setActionBusy(""); }
  };

  const updateWorkflow = async (row, endpoint, confirmation) => {
    if (!row?._id) return;
    if (confirmation && !(await confirmAction(confirmation))) return;
    try {
      setActionBusy(`${endpoint}-${row._id}`); setError(""); setMessage("");
      const { data: response } = await API.put(`/contributions/${row._id}/${endpoint}`);
      if (!response?.success) throw new Error(response?.message || `Unable to ${endpoint} this contribution.`);
      setMessage(response.message || "Contribution updated successfully.");
      await load();
      if (selected?._id === row._id) setSelected(response.contribution || selected);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Contribution update failed.");
    } finally { setActionBusy(""); }
  };

  const removeContribution = async (row) => {
    if (!row?._id) return;
    const target = row?.member?.fullName ? `${row.member.fullName} — ${months[Math.max(0, Number(row.month || 1) - 1)]} ${row.year}` : `${months[Math.max(0, Number(row.month || 1) - 1)]} ${row.year}`;
    if (!(await confirmAction(`Remove ${target}? Settled or finance-linked records are archived instead of being destroyed, so accounting evidence remains protected.`))) return;
    try {
      setActionBusy(`remove-${row._id}`); setError(""); setMessage("");
      const { data: response } = await API.delete(`/contributions/${row._id}`);
      if (!response?.success) throw new Error(response?.message || "Unable to remove contribution.");
      setMessage(response.message || "Contribution removed safely.");
      if (selected?._id === row._id) setSelected(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to remove contribution.");
    } finally { setActionBusy(""); }
  };

  const exportPrint = () => {
    const body = rows.map((row) => `<tr><td>${escapePrintHtml(admin ? (row.member?.fullName || "—") : "My record")}</td><td>${escapePrintHtml(row.member?.memberNumber || "—")}</td><td>${escapePrintHtml(`${months[Math.max(0, Number(row.month || 1) - 1)]} ${row.year || "—"}`)}</td><td>${escapePrintHtml(money(row.expectedAmount))}</td><td>${escapePrintHtml(money(row.paidAmount))}</td><td>${escapePrintHtml(money(row.balance))}</td><td>${escapePrintHtml(row.paymentMethod || "—")}</td><td>${escapePrintHtml(row.receiptNumber || row.mpesaCode || row.finance?.referenceNumber || "—")}</td><td>${escapePrintHtml(row.status || "—")}</td><td>${escapePrintHtml(fmt(row.paymentDate))}</td></tr>`).join("");
    return openPrintDocument({ title, subtitle, portal: admin ? (scope === "superadmin" ? "SuperAdmin" : "Admin") : "Member", documentType: "Payroll Contributions", dateRange: `${filters.month || "all"} / ${filters.year || "all"}`, classification: "Official Record", bodyHtml: `<table><thead><tr><th>${admin ? "Member" : "Account"}</th><th>Employee no.</th><th>Period</th><th>Expected</th><th>Paid</th><th>Outstanding</th><th>Method</th><th>Finance / receipt record</th><th>Status</th><th>Payment date</th></tr></thead><tbody>${body || `<tr><td colspan="10">No contribution records.</td></tr>`}</tbody></table>`, orientation: "landscape", filename: `${scope}-contribution-history` });
  };

  const totalExpected = summary?.totalExpected ?? null;
  const totalPaid = admin ? summary?.totalContributed ?? null : summary?.totalPaid ?? null;
  const outstanding = admin ? summary?.outstanding ?? null : summary?.totalBalance ?? null;

  return (
    <DashboardLayout>
      <main className="portal-page contribution-workspace">
        <header className="portal-module-header">
          <div><span>{admin ? "SCHEME CONTRIBUTIONS" : "PERSONAL CONTRIBUTIONS"}</span><h1>{title}</h1><p>{subtitle}</p></div>
          <div className="portal-actions"><button className="portal-btn secondary" type="button" onClick={load} disabled={loading}><RefreshCw size={16}/> Refresh</button><button className="portal-btn secondary" type="button" onClick={exportPrint} disabled={!data}><Download size={16}/> Print / Save PDF</button></div>
        </header>
        {message && <div className="portal-alert success" role="status" aria-live="polite">{message}</div>}
        {error && <div className="portal-alert error" role="alert">{error}</div>}

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
                  <table className="portal-table contribution-table"><thead><tr>{admin && <th>Member</th>}{admin && <th>Employee no.</th>}<th>Period</th><th>Expected</th><th>Paid</th><th>Outstanding</th><th>Method</th><th>Finance / receipt record</th><th>Status</th><th>Payment date</th>{admin && <th>Actions</th>}</tr></thead><tbody>{rows.map((row) => <tr key={row._id}>{admin && <td>{row.member?.fullName || "—"}</td>}{admin && <td>{row.member?.memberNumber || "—"}</td>}<td>{months[Math.max(0, Number(row.month || 1) - 1)]} {row.year || "—"}</td><td>{money(row.expectedAmount)}</td><td>{money(row.paidAmount)}</td><td>{money(row.balance)}</td><td>{row.paymentMethod || "—"}</td><td>{row.receiptNumber || row.mpesaCode || row.finance?.referenceNumber || "—"}</td><td><span className="portal-badge">{row.status || "—"}</span></td><td>{fmt(row.paymentDate)}</td>{admin && <td><div className="portal-actions table-actions"><button className="portal-btn secondary" type="button" onClick={() => openDetails(row)} title="View contribution details" aria-label="View contribution details"><Eye size={15}/><span>View</span></button><button className="portal-btn secondary" type="button" onClick={() => startEdit(row)} title="Edit contribution" aria-label="Edit contribution"><Edit3 size={15}/><span>Edit</span></button><button className="portal-btn secondary" type="button" onClick={() => updateWorkflow(row, "approve", "Approve this contribution record?")} disabled={Boolean(actionBusy)} title="Approve contribution" aria-label="Approve contribution"><CheckCircle2 size={15}/></button><button className="portal-btn secondary" type="button" onClick={() => updateWorkflow(row, "reject", "Send this contribution back for review?")} disabled={Boolean(actionBusy)} title="Send contribution back for review" aria-label="Send contribution back for review"><RotateCcw size={15}/></button><button className="portal-btn danger" type="button" onClick={() => removeContribution(row)} disabled={Boolean(actionBusy)} title="Remove or archive contribution" aria-label="Remove or archive contribution"><Trash2 size={15}/></button></div></td>}</tr>)}</tbody></table>
                </div>
              )}
              {pages > 1 && <div className="portal-pagination" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 16 }}><span>Page {page} of {pages}</span><div className="portal-actions"><button className="portal-btn secondary" type="button" onClick={() => setPage(page - 1)} disabled={page <= 1}><ChevronLeft size={16}/> Previous</button><button className="portal-btn secondary" type="button" onClick={() => setPage(page + 1)} disabled={page >= pages}>Next <ChevronRight size={16}/></button></div></div>}
            </section>
          </>
        )}

        {admin && detailLoading && <div className="portal-loading-card" role="status" aria-live="polite">Loading contribution details…</div>}
        {selected && <div className="portal-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><section className="portal-modal" role="dialog" aria-modal="true" aria-labelledby="contribution-detail-title"><header className="portal-modal-head"><div><span>OFFICIAL PAYROLL RECORD</span><h2 id="contribution-detail-title">Contribution details</h2><p>{selected.member?.fullName || "Member record"} · {selected.member?.memberNumber || "Employee number unavailable"}</p></div><button className="portal-btn secondary" type="button" onClick={() => setSelected(null)} aria-label="Close contribution details"><X size={16}/> Close</button></header><div className="portal-modal-body"><div className="portal-detail-grid"><div><span>Payroll period</span><strong>{months[Math.max(0, Number(selected.month || 1) - 1)]} {selected.year}</strong></div><div><span>Status</span><strong>{selected.status || "Unavailable"}</strong></div><div><span>Expected</span><strong>{money(selected.expectedAmount)}</strong></div><div><span>Paid</span><strong>{money(selected.paidAmount)}</strong></div><div><span>Outstanding</span><strong>{money(selected.balance)}</strong></div><div><span>Payment date</span><strong>{fmt(selected.paymentDate)}</strong></div><div><span>Finance record</span><strong>{selected.finance?.transactionNumber || "Not linked"}</strong></div><div><span>Receipt</span><strong>{selected.receiptNumber || selected.finance?.receiptNumber || "Unavailable"}</strong></div><div><span>Recorded method</span><strong>{selected.paymentMethod || "Payroll"}</strong></div><div><span>Approved by</span><strong>{selected.approvedBy?.fullName || (selected.approvedBy ? "Historical approver unavailable" : "Not approved")}</strong></div></div><div className="portal-panel" style={{ marginTop: 16 }}><span>Notes</span><p style={{ whiteSpace: "pre-wrap" }}>{selected.notes || "No notes were recorded."}</p></div></div></section></div>}

        {editingContribution && <div className="portal-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingContribution(null); }}><section className="portal-modal" role="dialog" aria-modal="true" aria-labelledby="contribution-edit-title"><header className="portal-modal-head"><div><span>CONTROLLED EDIT</span><h2 id="contribution-edit-title">Edit contribution</h2><p>Payroll contribution only. Linked finance evidence remains synchronized.</p></div><button className="portal-btn secondary" type="button" onClick={() => setEditingContribution(null)} aria-label="Close contribution editor"><X size={16}/> Close</button></header><form className="portal-modal-body" onSubmit={saveEdit}><div className="portal-form-grid"><label className="portal-field"><span>Expected amount</span><input type="number" min="0" step="0.01" required value={editForm.expectedAmount} onChange={(e) => setEditForm((x) => ({ ...x, expectedAmount: e.target.value }))}/></label><label className="portal-field"><span>Paid amount</span><input type="number" min="0" step="0.01" required value={editForm.paidAmount} onChange={(e) => setEditForm((x) => ({ ...x, paidAmount: e.target.value }))}/></label><label className="portal-field"><span>Receipt number</span><input value={editForm.receiptNumber} onChange={(e) => setEditForm((x) => ({ ...x, receiptNumber: e.target.value }))}/></label><label className="portal-field"><span>Payroll record code</span><input value={editForm.mpesaCode} onChange={(e) => setEditForm((x) => ({ ...x, mpesaCode: e.target.value }))}/></label><label className="portal-field"><span>Payment date</span><input type="date" value={editForm.paymentDate} onChange={(e) => setEditForm((x) => ({ ...x, paymentDate: e.target.value }))}/></label><label className="portal-field field-full"><span>Notes</span><textarea rows="4" value={editForm.notes} onChange={(e) => setEditForm((x) => ({ ...x, notes: e.target.value }))}/></label></div><div className="portal-actions"><button className="portal-btn secondary" type="button" onClick={() => setEditingContribution(null)}>Cancel</button><button className="portal-btn primary" type="submit" disabled={Boolean(actionBusy)}>{actionBusy ? "Saving…" : "Save changes"}</button></div></form></section></div>}
      </main>
    </DashboardLayout>
  );
}
