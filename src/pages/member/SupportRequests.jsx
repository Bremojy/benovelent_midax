import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Edit3, FileText, Filter, HandHeart, Search, Trash2, X, RefreshCw, ShieldCheck } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import API, { resolveApiUrl } from "../../services/api";
import "../../styles/portalModule.css";

const TYPES = ["", "medical", "funeral", "education", "support"];
const STATUSES = ["", "Pending", "Under Review", "Documents Required", "Eligibility Review", "Approval Review", "Approved", "Disbursement Pending", "Paid", "Completed", "Rejected", "Cancelled", "Closed"];
const money = (value) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(Number(value || 0));
const dateTime = (value) => value ? new Date(value).toLocaleString("en-KE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const statusClass = (status) => ["Rejected","Cancelled","Closed"].includes(status) ? "rejected" : ["Approved","Paid","Completed"].includes(status) ? "approved" : "";
const typeLabel = (type) => ({ medical: "Medical", funeral: "Funeral", education: "Education", support: "General support" }[String(type || "").toLowerCase()] || "Support");

export default function SupportRequests() {
  const location = useLocation();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ search: "", status: "", type: "", sort: "newest" });
  const [draftSearch, setDraftSearch] = useState("");
  const [claims, setClaims] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [permissionAction, setPermissionAction] = useState("");
  const [permissionReason, setPermissionReason] = useState("");
  const [editDraft, setEditDraft] = useState({ description: "", requestedAmount: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = async (nextPage = page) => {
    try {
      setLoading(true); setError("");
      const [claimsRes, permissionRes] = await Promise.all([
        API.get("/member/claims", { params: { ...filters, page: nextPage, limit: 10 } }),
        API.get("/member/support-requests/permissions/mine"),
      ]);
      const response = claimsRes.data || {};
      const permissionData = permissionRes.data || {};
      setClaims(Array.isArray(response.claims) ? response.claims : []);
      setPage(Number(response.page || nextPage));
      setPages(Math.max(1, Number(response.pages || 1)));
      setTotal(Number(response.total ?? response.count ?? 0));
      setPermissions(Array.isArray(permissionData.permissionRequests) ? permissionData.permissionRequests : []);
      const requestedId = new URLSearchParams(location.search).get("requestId");
      if (requestedId) {
        const found = (response.claims || []).find((row) => String(row._id) === requestedId && String(row.sourceType).toLowerCase() === "support");
        if (found) setSelected(found);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to load your requests.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(1); }, [filters.status, filters.type, filters.search, filters.sort]);
  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === "Escape" && !permissionAction) setSelected(null); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [permissionAction]);

  const filteredPermissions = useMemo(() => permissions.filter((permission) => permission.sourceRequest || permission.sourceId), [permissions]);
  const permissionFor = (claim, action) => filteredPermissions.find((permission) => String(permission.sourceId) === String(claim._id) && permission.requestedAction === action && ["Pending", "Approved"].includes(permission.status));

  const openClaim = (claim) => {
    setSelected(claim);
    setEditDraft({ description: claim.description || "", requestedAmount: String(claim.requestedAmount || claim.amount || "") });
    navigate(`/member/support/requests?requestId=${claim._id}`, { replace: true });
  };

  const requestPermission = async () => {
    if (!selected || !permissionAction) return;
    if (permissionReason.trim().length < 5) { setError("Please explain why you need this permission."); return; }
    try {
      setBusy(`permission-${permissionAction}`); setError(""); setSuccess("");
      const { data } = await API.post("/member/support-requests/permissions", { sourceId: selected._id, requestedAction: permissionAction, reason: permissionReason.trim() });
      if (!data?.success) throw new Error(data?.message || "Unable to request permission.");
      setPermissionAction(""); setPermissionReason(""); setSuccess(data.message || "Permission request submitted for administrator review.");
      await load(page);
    } catch (err) { setError(err.response?.data?.message || err.message || "Unable to request permission."); }
    finally { setBusy(""); }
  };

  const saveEdit = async () => {
    if (!selected) return;
    const permission = permissionFor(selected, "edit");
    if (!permission || permission.status !== "Approved") { setError("An approved edit permission is required."); return; }
    if (!editDraft.description.trim() || !(Number(editDraft.requestedAmount) > 0)) { setError("Enter a description and positive requested amount."); return; }
    try {
      setBusy("edit"); setError(""); setSuccess("");
      const { data } = await API.put(`/member/support-requests/mine/${selected._id}`, { permissionRequestId: permission._id, description: editDraft.description.trim(), requestedAmount: Number(editDraft.requestedAmount), keepDocuments: JSON.stringify(selected.documents || []) });
      if (!data?.success) throw new Error(data?.message || "Unable to update request.");
      setSuccess(data.message || "Support request updated."); setSelected(null);
      await load(page);
    } catch (err) { setError(err.response?.data?.message || err.message || "Unable to update request."); }
    finally { setBusy(""); }
  };

  const deleteRequest = async () => {
    if (!selected) return;
    const permission = permissionFor(selected, "delete");
    if (!permission || permission.status !== "Approved") { setError("An approved delete permission is required."); return; }
    const confirmed = window.confirm("This approved permission will be consumed and the support request will be deleted. Continue?");
    if (!confirmed) return;
    try {
      setBusy("delete"); setError(""); setSuccess("");
      const { data } = await API.delete(`/member/support-requests/mine/${selected._id}`, { data: { permissionRequestId: permission._id } });
      if (!data?.success) throw new Error(data?.message || "Unable to delete request.");
      setSuccess(data.message || "Support request deleted."); setSelected(null);
      await load(Math.min(page, pages));
    } catch (err) { setError(err.response?.data?.message || err.message || "Unable to delete request."); }
    finally { setBusy(""); }
  };

  const renderFieldGrid = (claim) => {
    const rows = [];
    if (claim.sourceType === "medical") rows.push(["Dependent", claim.dependent?.fullName || "—"], ["Hospital", claim.hospitalName || "—"], ["Location", claim.hospitalLocation || "—"], ["Diagnosis", claim.diagnosis || "—"]);
    if (claim.sourceType === "funeral") rows.push(["Deceased", claim.deceasedName || "—"], ["Relationship", claim.relationship || claim.deceasedRelationship || "—"], ["Date of death", claim.dateOfDeath ? dateTime(claim.dateOfDeath) : "—"], ["Burial date", claim.burialDate ? dateTime(claim.burialDate) : "—"], ["Burial location", claim.burialLocation || "—"]);
    if (claim.sourceType === "education") rows.push(["Dependent", claim.dependent?.fullName || "—"], ["School", claim.school || claim.dependent?.school || "—"], ["Purpose", claim.purpose || "—"], ["Repayment", claim.repaymentEnabled ? `${claim.repaymentMonths || 12} months` : "Not enabled"], ["Repayment balance", claim.repaymentEnabled ? money(claim.balance) : "—"]);
    if (claim.sourceType === "support") rows.push(["Policy", claim.policyName || claim.policySlug || "—"], ["Description", claim.description || "—"]);
    return rows;
  };

  return <DashboardLayout>
    <main className="portal-page support-requests-workspace">
      <header className="portal-module-header">
        <div><span>MEMBER SUPPORT</span><h1>My Requests</h1><p>A review workspace for submitted support requests. Editing or deletion requires administrator permission and is always tied to the exact request.</p></div>
        <div className="portal-actions"><button className="portal-btn secondary" type="button" onClick={() => load(page)} disabled={loading}><RefreshCw size={16}/> Refresh</button><a className="portal-btn primary" href="/member/support"><HandHeart size={16}/> Request Support</a></div>
      </header>
      {error && <div className="portal-alert error">{error}</div>}
      {success && <div className="portal-alert success">{success}</div>}

      <section className="portal-panel">
        <div className="portal-form-grid">
          <div className="portal-field portal-field-wide"><label htmlFor="member-request-search"><Search size={14}/> Search</label><form onSubmit={(e) => { e.preventDefault(); setFilters((x) => ({ ...x, search: draftSearch.trim() })); }} style={{ display: "flex", gap: 8 }}><input id="member-request-search" value={draftSearch} onChange={(e) => setDraftSearch(e.target.value)} placeholder="Request ID, hospital, school, policy or status" /><button className="portal-btn secondary" type="submit"><Search size={16}/> Search</button></form></div>
          <div className="portal-field"><label htmlFor="member-request-status"><Filter size={14}/> Status</label><select id="member-request-status" value={filters.status} onChange={(e) => setFilters((x) => ({ ...x, status: e.target.value }))}>{STATUSES.map((status) => <option key={status} value={status}>{status || "All statuses"}</option>)}</select></div>
          <div className="portal-field"><label htmlFor="member-request-type">Type</label><select id="member-request-type" value={filters.type} onChange={(e) => setFilters((x) => ({ ...x, type: e.target.value }))}>{TYPES.map((type) => <option key={type} value={type}>{type ? typeLabel(type) : "All request types"}</option>)}</select></div>
          <div className="portal-field"><label htmlFor="member-request-sort">Sort</label><select id="member-request-sort" value={filters.sort} onChange={(e) => setFilters((x) => ({ ...x, sort: e.target.value }))}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></div>
        </div>
      </section>

      {loading ? <div className="portal-loading-card"><RefreshCw className="spinning" size={20}/> Loading your requests…</div> : claims.length === 0 ? <div className="portal-empty"><FileText size={30}/><h3>No matching requests</h3><p>No support records match the current filters. A genuine empty result is different from an unavailable data response.</p></div> : (
        <section className="portal-grid two">
          {claims.map((claim) => {
            const editPermission = permissionFor(claim, "edit");
            const deletePermission = permissionFor(claim, "delete");
            return <article className="portal-panel request-list-card" key={`${claim.sourceType}-${claim._id}`}>
              <div className="claim-card-head"><div><span className="portal-badge">{typeLabel(claim.sourceType)}</span><h2>{claim.policyName || claim.description || claim.hospitalName || claim.deceasedName || claim.school || "Support request"}</h2><p>Ref {claim._id} · Submitted {dateTime(claim.createdAt || claim.applicationDate)}</p></div><span className={`portal-badge ${statusClass(claim.status)}`}>{claim.status || "Pending"}</span></div>
              <div className="portal-stat-grid compact"><div className="portal-stat"><span>Requested</span><strong>{money(claim.requestedAmount || claim.amount)}</strong></div><div className="portal-stat"><span>Approved</span><strong>{money(claim.approvedAmount)}</strong></div><div className="portal-stat"><span>Last updated</span><strong style={{ fontSize: 14 }}>{dateTime(claim.updatedAt)}</strong></div></div>
              <div className="claim-latest"><strong>Latest decision / stage</strong><p>{claim.rejectionReason || claim.remarks || (Array.isArray(claim.timeline) && claim.timeline.length ? claim.timeline[claim.timeline.length - 1]?.remarks : "No decision note recorded yet.") || "No decision note recorded yet."}</p></div>
              <div className="portal-actions" style={{ marginTop: 14 }}><button className="portal-btn primary" type="button" onClick={() => openClaim(claim)}>Open details</button>{claim.sourceType === "support" && claim.status === "Under Review" && <>{editPermission?.status === "Approved" ? <span className="portal-badge approved"><CheckCircle2 size={13}/> Edit approved</span> : <button className="portal-btn secondary" type="button" onClick={() => { setSelected(claim); setPermissionAction("edit"); setPermissionReason(""); }}>Request edit permission</button>}{deletePermission?.status === "Approved" ? <span className="portal-badge approved"><CheckCircle2 size={13}/> Delete approved</span> : <button className="portal-btn danger" type="button" onClick={() => { setSelected(claim); setPermissionAction("delete"); setPermissionReason(""); }}>Request delete permission</button>}</>}</div>
            </article>;
          })}
        </section>
      )}

      {!loading && dataPagination(total, pages, page, setPage, load)}

      {selected && <div className="portal-modal-backdrop support-detail-modal" role="presentation" onMouseDown={(e) => { if (e.currentTarget === e.target && !permissionAction) setSelected(null); }}>
        <section className="portal-modal-card support-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="member-request-detail-title">
          <header className="portal-modal-head support-detail-header"><div><span>{typeLabel(selected.sourceType)} REQUEST</span><h2 id="member-request-detail-title">Request details</h2><p>Reference {selected._id} · {selected.status || "Pending"}</p></div><button type="button" className="portal-btn secondary" onClick={() => setSelected(null)}><X size={16}/> Close</button></header>
          <div className="support-detail-body">
            <div className="portal-stat-grid compact"><div className="portal-stat"><span>Requested</span><strong>{money(selected.requestedAmount || selected.amount)}</strong></div><div className="portal-stat"><span>Approved</span><strong>{money(selected.approvedAmount)}</strong></div><div className="portal-stat"><span>Submitted</span><strong style={{ fontSize: 14 }}>{dateTime(selected.createdAt || selected.applicationDate)}</strong></div><div className="portal-stat"><span>Last update</span><strong style={{ fontSize: 14 }}>{dateTime(selected.updatedAt)}</strong></div></div>
            <section className="portal-panel detail-section"><h3>Request information</h3><div className="portal-form-grid detail-fields">{renderFieldGrid(selected).map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></section>
            {Array.isArray(selected.documents) && <section className="portal-panel detail-section"><h3>Documents</h3><div className="claim-documents">{selected.documents.length ? selected.documents.map((doc, index) => { const url = typeof doc === "string" ? doc : doc?.fileUrl; const label = typeof doc === "string" ? `Document ${index + 1}` : doc?.label || doc?.fileName || `Document ${index + 1}`; if (!url) return null; return <a key={`${url}-${index}`} href={resolveApiUrl(url)} target="_blank" rel="noreferrer"><FileText size={15}/><span>{label}</span></a>; }) : <span className="portal-empty">No documents recorded.</span>}</div></section>}
            <section className="portal-panel detail-section"><h3>Workflow timeline</h3>{Array.isArray(selected.timeline) && selected.timeline.length ? <div className="timeline-list">{selected.timeline.slice().reverse().map((item, index) => <div key={`${item.date || index}-${item.status}`} className="timeline-item"><span className="timeline-dot"><Clock3 size={11}/></span><div><strong>{item.status || "Update"}</strong><p>{item.remarks || "No note"}</p><small>{dateTime(item.date || item.updatedAt)}</small></div></div>)}</div> : <p>No timeline updates recorded.</p>}</section>
          </div>
          <footer className="support-detail-footer">
            {selected.sourceType === "support" && selected.status === "Under Review" ? <div className="portal-actions">{permissionFor(selected, "edit")?.status === "Approved" ? <button type="button" className="portal-btn primary" onClick={() => setPermissionAction("edit")}><Edit3 size={16}/> Use approved edit permission</button> : <button type="button" className="portal-btn secondary" onClick={() => { setPermissionAction("edit"); setPermissionReason(""); }}><Edit3 size={16}/> Request edit permission</button>}{permissionFor(selected, "delete")?.status === "Approved" ? <button type="button" className="portal-btn danger" onClick={deleteRequest} disabled={busy === "delete"}><Trash2 size={16}/> {busy === "delete" ? "Deleting…" : "Use approved delete permission"}</button> : <button type="button" className="portal-btn danger" onClick={() => { setPermissionAction("delete"); setPermissionReason(""); }}><Trash2 size={16}/> Request delete permission</button>}</div> : <span className="portal-badge"><ShieldCheck size={13}/> Direct member edit/delete is unavailable for this workflow stage.</span>}
          </footer>
        </section>
      </div>}

      {selected && permissionAction === "edit" && permissionFor(selected, "edit")?.status === "Approved" && <div className="portal-modal-backdrop support-permission-layer" role="presentation" onMouseDown={(e) => { if (e.currentTarget === e.target) setPermissionAction(""); }}><section className="portal-modal-card"><header className="portal-modal-head"><div><span>APPROVED PERMISSION</span><h2>Edit request</h2><p>The permission is tied to this exact support request and is consumed on a successful save.</p></div><button className="portal-btn secondary" type="button" onClick={() => setPermissionAction("")}><X size={16}/> Close</button></header><div className="portal-field"><label>Description</label><textarea rows="5" value={editDraft.description} onChange={(e) => setEditDraft((x) => ({ ...x, description: e.target.value }))}/></div><div className="portal-field"><label>Requested amount</label><input type="number" min="1" value={editDraft.requestedAmount} onChange={(e) => setEditDraft((x) => ({ ...x, requestedAmount: e.target.value }))}/></div><div className="portal-actions"><button className="portal-btn primary" type="button" onClick={saveEdit} disabled={busy === "edit"}>{busy === "edit" ? "Saving…" : "Save approved edit"}</button><button className="portal-btn secondary" type="button" onClick={() => setPermissionAction("")}>Cancel</button></div></section></div>}

      {selected && permissionAction && !(permissionAction === "edit" && permissionFor(selected, "edit")?.status === "Approved") && <div className="portal-modal-backdrop support-permission-layer" role="presentation" onMouseDown={(e) => { if (e.currentTarget === e.target) setPermissionAction(""); }}><section className="portal-modal-card"><header className="portal-modal-head"><div><span>PERMISSION WORKFLOW</span><h2>Request permission to {permissionAction}</h2><p>Explain why you need this action. The request is sent to an authorized administrator for review.</p></div><button className="portal-btn secondary" type="button" onClick={() => setPermissionAction("")}><X size={16}/> Close</button></header><div className="portal-field"><label htmlFor="support-permission-reason">Reason</label><textarea id="support-permission-reason" rows="6" maxLength={1200} value={permissionReason} onChange={(e) => setPermissionReason(e.target.value)} placeholder="Explain the correction or deletion you need."/></div><div className="portal-actions"><button className="portal-btn primary" type="button" onClick={requestPermission} disabled={busy.startsWith("permission-")}>{busy ? "Submitting…" : "Submit permission request"}</button><button className="portal-btn secondary" type="button" onClick={() => setPermissionAction("")}>Cancel</button></div></section></div>}
    </main>
  </DashboardLayout>;
}

function dataPagination(total, pages, page, setPage, load) {
  if (pages <= 1) return <div className="portal-pagination" style={{ marginTop: 18 }}><span>{total} request{total === 1 ? "" : "s"} shown.</span></div>;
  return <div className="portal-pagination" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 18 }}><span>Page {page} of {pages} · {total} total</span><div className="portal-actions"><button className="portal-btn secondary" type="button" onClick={() => { setPage(page - 1); load(page - 1); }} disabled={page <= 1}><span>Previous</span></button><button className="portal-btn secondary" type="button" onClick={() => { setPage(page + 1); load(page + 1); }} disabled={page >= pages}><span>Next</span></button></div></div>;
}
