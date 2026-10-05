import { confirmAction } from "../../utils/modernDialog";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Eye, HeartHandshake, Megaphone, Trash2, Smartphone, WalletCards, LockKeyhole, RefreshCw, CheckCircle2, XCircle, ShieldAlert } from "lucide-react"
import { useAuth } from "../../context/AuthContext";
import DashboardLayout from "../../layouts/DashboardLayout";
import API, { resolveApiUrl } from "../../services/api";
import MpesaPaymentButton from "../../components/payments/MpesaPaymentButton";
import "../../styles/portalModule.css";

const STAGES = ["Pending", "Under Review", "Documents Required", "Eligibility Review", "Approval Review", "Approved", "Disbursement Pending", "Paid", "Completed", "Rejected", "Cancelled", "Closed"];
const money = (v) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(Number(v || 0));
const formatDate = (v) => v ? new Date(v).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const typeLabel = (v) => String(v || "support").replace(/^./, (c) => c.toUpperCase());

export default function AdminClaims() {
  const { role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isSuperAdmin = String(role || "").toLowerCase() === "superadmin";
  const [claims, setClaims] = useState([]);
  const [community, setCommunity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState("");
  const [selected, setSelected] = useState(null);
  const [stage, setStage] = useState("");
  const [remarks, setRemarks] = useState("");
  const [approvedAmount, setApprovedAmount] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [repaymentAmount, setRepaymentAmount] = useState("");
  const [repaymentReference, setRepaymentReference] = useState("");
  const [communityTarget, setCommunityTarget] = useState("");
  const [communityTitle, setCommunityTitle] = useState("");
  const [communityDescription, setCommunityDescription] = useState("");
  const [communityDraft, setCommunityDraft] = useState(null);
  const [appealReview, setAppealReview] = useState(null);
  const [appealReason, setAppealReason] = useState("");
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [communityDeleteDialog, setCommunityDeleteDialog] = useState(null);
  const [communityDeleteConfirmation, setCommunityDeleteConfirmation] = useState("");
  const [publishDialog, setPublishDialog] = useState(null);
  const [publishPreview, setPublishPreview] = useState(null);
  const [filters, setFilters] = useState({ search: "", status: "", type: "", sort: "newest" });
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const detailRequestRef = useRef(0);

  const load = async (nextPage = page) => {
    try {
      setLoading(true);
      setError("");
      const [claimsRes, communityRes] = await Promise.all([
        API.get("/claims", { params: { ...filters, page: nextPage, limit: 12 } }),
        API.get("/payments/community-assistance/admin"),
      ]);
      const claimPayload = claimsRes.data || {};
      setClaims(Array.isArray(claimPayload.claims || claimPayload.records) ? (claimPayload.claims || claimPayload.records) : []);
      setPage(Number(claimPayload.page || nextPage));
      setPages(Math.max(1, Number(claimPayload.pages || 1)));
      setTotal(Number(claimPayload.total ?? claimPayload.count ?? 0));
      setCommunity(Array.isArray(communityRes.data?.campaigns) ? communityRes.data.campaigns : []);
      const params = new URLSearchParams(location.search);
      const claimId = params.get("claimId");
      const claimType = params.get("claimType");
      if (claimId) {
        const found = (claimPayload.claims || claimPayload.records || []).find((claim) => String(claim._id) === String(claimId) && (!claimType || String(claim.sourceType) === String(claimType)));
        if (found) open(found);
      }
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Unable to load claims.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); }, [filters.search, filters.status, filters.type, filters.sort]);
  useEffect(() => {
    const body = document.body;
    if (!selected && !communityDraft && !appealReview && !deleteDialog && !communityDeleteDialog && !publishDialog) return undefined;
    const previous = body.style.overflow;
    body.style.overflow = "hidden";
    return () => { body.style.overflow = previous; };
  }, [selected, communityDraft, appealReview, deleteDialog, communityDeleteDialog, publishDialog]);
  useEffect(() => {
    const onKeyDown = (event) => { if (event.key !== "Escape") return; if (selected) setSelected(null); else if (communityDraft) setCommunityDraft(null); else if (appealReview) setAppealReview(null); else if (deleteDialog) { setDeleteDialog(null); setDeleteConfirmation(""); } else if (communityDeleteDialog) { setCommunityDeleteDialog(null); setCommunityDeleteConfirmation(""); } else if (publishDialog) { setPublishDialog(null); setPublishPreview(null); } };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected]);

  const grouped = useMemo(() => claims.reduce((a, c) => {
    const key = c.status || "Pending";
    (a[key] ??= []).push(c);
    return a;
  }, {}), [claims]);

  const open = async (claim) => {
    const requestId = ++detailRequestRef.current;
    setSelected({ ...claim });
    setStage(claim.status || "Pending");
    setRemarks("");
    setApprovedAmount(String(claim.approvedAmount ?? claim.requestedAmount ?? ""));
    setPaymentReference(String(claim.paymentReference || ""));
    setRepaymentAmount(String(Math.min(Number(claim.balance || 0), Number(claim.monthlyInstallment || claim.balance || 0)) || ""));
    setRepaymentReference("");
    try {
      const { data } = await API.get(`/claims/${claim.sourceType}/${claim._id}`);
      if (requestId !== detailRequestRef.current) return;
      const detail = data?.claim || data?.record;
      if (detail) {
        setSelected(detail);
        setStage(detail.status || "Pending");
        setApprovedAmount(String(detail.approvedAmount ?? detail.requestedAmount ?? ""));
        setPaymentReference(String(detail.paymentReference || ""));
        setRepaymentAmount(String(Math.min(Number(detail.balance || 0), Number(detail.monthlyInstallment || detail.balance || 0)) || ""));
      }
    } catch (e) {
      if (requestId !== detailRequestRef.current) return;
      setError(e.response?.data?.message || e.message || "Unable to load the complete claim details.");
    }
  };


  const openDocument = async (claim, url) => {
    try {
      await API.post(`/admin/claims/${claim.sourceType}/${claim._id}/open`);
      const target = resolveApiUrl(url);
      if (target) window.open(target, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Unable to record document access.");
    }
  };

  const openCommunity = (claim) => {
    setCommunityDraft(claim);
    setCommunityTarget(String(claim.requestedAmount || claim.amount || claim.approvedAmount || ""));
    setCommunityTitle(`${typeLabel(claim.supportType)} Community Support`);
    setCommunityDescription("This verified support case was declined by the scheme. Members may voluntarily support the affected member through M-PESA community assistance.");
    setError("");
  };

  const saveStage = async () => {
    if (!selected || !stage) return;
    try {
      setBusy(selected._id);
      setError("");
      const payload = { status: stage, remarks, paymentReference: paymentReference.trim() };
      if (stage === "Approved") payload.approvedAmount = Number(approvedAmount || selected.requestedAmount || 0);
      if (stage === "Rejected") payload.rejectionReason = remarks;
      const { data } = await API.put(`/claims/${selected.sourceType}/${selected._id}/stage`, payload);
      if (!data?.success) throw new Error(data?.message || "Could not update claim.");
      setSelected(null);
      setSuccess(`Claim moved to ${stage}.`);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Unable to update claim.");
    } finally {
      setBusy("");
    }
  };


  const recordEducationRepayment = async () => {
    if (!selected || selected.sourceType !== "education") return;
    const amount = Number(repaymentAmount);
    if (!Number.isInteger(amount) || amount <= 0) {
      setError("Enter a valid whole-number repayment amount.");
      return;
    }
    if (amount > Number(selected.balance || 0)) {
      setError(`Repayment cannot exceed the current balance of ${money(selected.balance)}.`);
      return;
    }
    if (!repaymentReference.trim()) {
      setError("A repayment transaction/reference is required.");
      return;
    }
    try {
      setBusy(`repay-${selected._id}`);
      setError("");
      const { data } = await API.put(`/education/${selected._id}/repayment`, { amount, paymentReference: repaymentReference.trim(), method: "MANUAL" });
      if (!data?.success) throw new Error(data?.message || "Unable to record repayment.");
      setSuccess(data.message || "Education repayment recorded successfully.");
      setSelected(null);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Unable to record education repayment.");
    } finally {
      setBusy("");
    }
  };

  const createCommunity = async () => {
    if (!communityDraft) return;
    try {
      setBusy(`community-${communityDraft._id}`);
      setError("");
      const referenceModel = {
        medical: "MedicalSupport",
        funeral: "FuneralSupport",
        education: "EducationSupport",
        support: "SupportRequest",
      }[communityDraft.sourceType];
      if (!referenceModel) throw new Error("Unsupported claim type for community assistance.");
      const target = Number(communityTarget);
      if (!target || target <= 0) throw new Error("Enter a positive community support target.");
      const { data } = await API.post("/payments/community-assistance", {
        referenceModel,
        referenceId: communityDraft._id,
        targetAmount: target,
        title: communityTitle,
        description: communityDescription,
      });
      if (!data?.success) throw new Error(data?.message || "Unable to enable community support.");
      setCommunityDraft(null);
      setSuccess("Community M-PESA assistance was created as a pending appeal. It is not open until an authorised administrator approves it.");
      await load();
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Unable to enable community support.");
    } finally {
      setBusy("");
    }
  };

  const reviewAppeal = async (decision) => {
    if (!appealReview) return;
    if (decision === "reject" && !appealReason.trim()) {
      setError("A rejection reason is required.");
      return;
    }
    try {
      setBusy(`appeal-${appealReview._id}`);
      setError("");
      const { data } = await API.post(`/claims/community/${appealReview._id}/review`, { decision, reason: appealReason.trim() });
      if (!data?.success) throw new Error(data?.message || "Unable to review community appeal.");
      setAppealReview(null);
      setAppealReason("");
      setSuccess(decision === "approve" ? "Community appeal approved and the campaign is now open." : "Community appeal rejected. The campaign remains closed.");
      await load();
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Unable to review community appeal.");
    } finally {
      setBusy("");
    }
  };

  const preparePublishClaim = async (c) => {
    try {
      setBusy(`preview-${c._id}`);
      setError("");
      const { data } = await API.get(`/claims/${c.sourceType}/${c._id}/publish-news-preview`);
      if (!data?.success || !data.preview) throw new Error(data?.message || "Unable to prepare the public-safe News preview.");
      setPublishPreview(data.preview);
      setPublishDialog(c);
    } catch (e) {
      if (e.response?.data?.code === "CLAIM_ALREADY_PUBLISHED") {
        setSuccess("This claim has already been published to News.");
      } else {
        setError(e.response?.data?.message || e.message || "Unable to prepare the public-safe News preview.");
      }
    } finally {
      setBusy("");
    }
  };

  const publishClaim = async () => {
    if (!publishDialog) return;
    const c = publishDialog;
    try {
      setBusy(`publish-${c._id}`);
      setError(""); setSuccess("");
      const { data } = await API.post(`/claims/${c.sourceType}/${c._id}/publish-news`);
      if (!data?.success) throw Object.assign(new Error(data?.message || "The claim could not be published to News."), { response: { data } });
      setPublishDialog(null);
      setPublishPreview(null);
      setSuccess(data.message || "Claim published to News successfully. The article is now available on the News page and a notification has been created.");
      await load();
    } catch (e) {
      if (e.response?.data?.code === "CLAIM_ALREADY_PUBLISHED") {
        setSuccess("This claim has already been published to News.");
        setPublishDialog(null); setPublishPreview(null);
      } else if (e.response?.data?.code === "CLAIM_NEWS_NOTIFICATION_FAILED") {
        setError(e.response?.data?.message || "The News article was published, but the publication notification could not be confirmed.");
        setPublishDialog(null); setPublishPreview(null);
        await load();
      } else {
        setError(e.response?.data?.message || e.message || "The claim could not be published to News. No incomplete publication was reported.");
      }
    } finally {
      setBusy("");
    }
  };

  const publishCommunity = async (c) => {
    try {
      setBusy(`publish-community-${c._id}`);
      setError("");
      const { data } = await API.post(`/claims/community/${c._id}/publish-news`);
      if (!data?.success) throw new Error(data?.message || "Unable to publish.");
      setSuccess("Community support request published to News.");
      await load();
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Unable to publish community request.");
    } finally {
      setBusy("");
    }
  };

  const openCommunityDeleteDialog = (campaign) => {
    setCommunityDeleteConfirmation("");
    setCommunityDeleteDialog(campaign);
  };

  const deleteCommunity = async () => {
    if (!communityDeleteDialog || communityDeleteConfirmation !== "DELETE") return;
    const campaign = communityDeleteDialog;
    try {
      setBusy(`delete-community-${campaign._id}`);
      setError("");
      setSuccess("");
      const { data } = await API.delete(`/payments/community-assistance/${campaign._id}`);
      if (!data?.success) throw new Error(data?.message || "Unable to permanently delete community assistance request.");
      setCommunityDeleteDialog(null);
      setCommunityDeleteConfirmation("");
      setSuccess(data.message || "Community M-PESA request permanently deleted.");
      await load();
    } catch (e) {
      setError(e.response?.data?.message || e.message || "The community M-PESA request could not be permanently deleted. No unsafe partial deletion was reported.");
    } finally {
      setBusy("");
    }
  };

  const payoutCommunity = async (campaign) => {
    if (!isSuperAdmin) return;
    if (!await confirmAction(`Disburse ${money(campaign.raisedAmount)} raised for this community case to the recipient's registered M-PESA number? This sends a real B2C payout when the production credentials are configured.`)) return;
    try {
      setBusy(`payout-${campaign._id}`);
      setError("");
      const { data } = await API.post(`/payments/community-assistance/${campaign._id}/payout`);
      if (!data?.success) throw new Error(data?.message || "Unable to submit payout.");
      setSuccess("Community payout submitted to M-PESA for processing.");
      await load();
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Unable to submit community payout.");
    } finally {
      setBusy("");
    }
  };

  const closeCommunity = async (campaign) => {
    if (!isSuperAdmin) return;
    if (!await confirmAction(`Close ${campaign.title}? Members will no longer be able to contribute through the community M-PESA request.`)) return;
    try {
      setBusy(`close-${campaign._id}`);
      setError("");
      const { data } = await API.post(`/payments/community-assistance/${campaign._id}/close`);
      if (!data?.success) throw new Error(data?.message || "Unable to close community request.");
      setSuccess("Community M-PESA collection request closed.");
      await load();
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Unable to close community request.");
    } finally {
      setBusy("");
    }
  };

  const hideClaim = async (c) => {
    if (!await confirmAction("Hide this claim from the member?\n\nThe claim will remain stored and available to authorized staff, but it will no longer appear on the member's Claims page.\n\nThis does not permanently delete the claim.", { title: "Hide claim from member", confirmText: "Hide Claim", danger: false })) return;
    try {
      setBusy(`hide-${c._id}`); setError(""); setSuccess("");
      const { data } = await API.post(`/claims/${c.sourceType}/${c._id}/hide`);
      if (!data?.success) throw new Error(data?.message || "The claim could not be hidden.");
      setSuccess(data.message || "Claim hidden from the member view. The claim remains available to authorized staff.");
      setClaims((prev) => prev.map((item) => String(item._id) === String(c._id) && item.sourceType === c.sourceType ? { ...item, memberVisible: false, hiddenAt: new Date().toISOString() } : item));
    } catch (e) {
      if (e.response?.data?.code === "CLAIM_ALREADY_HIDDEN") setSuccess("This claim is already hidden from the member view.");
      else setError(e.response?.data?.message || e.message || "The claim could not be hidden. No changes were made.");
    } finally { setBusy(""); }
  };

  const openDeleteDialog = (c) => {
    setDeleteConfirmation("");
    setDeleteDialog(c);
  };

  const deleteClaim = async () => {
    if (!deleteDialog || deleteConfirmation !== "DELETE") return;
    const c = deleteDialog;
    try {
      setBusy(`delete-${c._id}`); setError(""); setSuccess("");
      const { data } = await API.delete(`/claims/${c.sourceType}/${c._id}/permanent`);
      if (!data?.success) throw new Error(data?.message || "Unable to permanently delete claim.");
      setDeleteDialog(null);
      setDeleteConfirmation("");
      setSuccess("Claim permanently deleted successfully.");
      await load();
    } catch (e) {
      setError(e.response?.data?.message || e.message || "The claim could not be permanently deleted. No unsafe partial deletion was reported.");
    } finally {
      setBusy("");
    }
  };

  return (
    <DashboardLayout>
      <div className="portal-module">
        <header className="portal-module-header">
          <div>
            <span>PROFESSIONAL CLAIM REVIEW</span>
            <h1>Claims & Support</h1>
            <p>Review claims, publish safe public updates, and create voluntary community M-PESA assistance for declined cases.</p>
          </div>
          <button className="portal-btn" onClick={load} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
        </header>

        {error && <div className="portal-alert">{error}</div>}
        {success && <div className="portal-alert success" role="status">{success}</div>}

        <section className="portal-panel claim-filter-panel">
          <div className="portal-form-grid">
            <div className="portal-field portal-field-wide"><label htmlFor="admin-claims-search">Search</label><input id="admin-claims-search" value={filters.search} onChange={(e) => setFilters((x) => ({ ...x, search: e.target.value }))} placeholder="Member, employee number, hospital, school, request ID…" /></div>
            <div className="portal-field"><label htmlFor="admin-claims-status">Status</label><select id="admin-claims-status" value={filters.status} onChange={(e) => setFilters((x) => ({ ...x, status: e.target.value }))}><option value="">All statuses</option>{STAGES.map((item) => <option key={item}>{item}</option>)}</select></div>
            <div className="portal-field"><label htmlFor="admin-claims-type">Type</label><select id="admin-claims-type" value={filters.type} onChange={(e) => setFilters((x) => ({ ...x, type: e.target.value }))}><option value="">All types</option><option value="medical">Medical</option><option value="funeral">Funeral</option><option value="education">Education</option><option value="support">General support</option></select></div>
            <div className="portal-field"><label htmlFor="admin-claims-sort">Sort</label><select id="admin-claims-sort" value={filters.sort} onChange={(e) => setFilters((x) => ({ ...x, sort: e.target.value }))}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></div>
          </div>
        </section>
        <div className="portal-list-summary"><span>{loading ? "Loading…" : `${total} authorized claim${total === 1 ? "" : "s"} match the current filters.`}</span><span>Page {page} of {pages}</span></div>

        {loading ? <div className="portal-empty">Loading claims…</div> : claims.length === 0 ? (
          <div className="portal-empty"><h3>No claims available</h3><p>Member applications will appear here automatically.</p></div>
        ) : (
          <section className="portal-grid two">
            {claims.map((c) => {
              const existingCommunity = community.find((item) => String(item.referenceId) === String(c._id));
              const alreadyCommunity = Boolean(existingCommunity);
              const appealPending = ["community_appeal_pending_review", "community_appeal_requested"].includes(String(existingCommunity?.workflowStatus || ""));
              return (
                <article className="portal-panel claim-admin-card" key={`${c.sourceType}-${c._id}`}>
                  <div className="claim-card-head">
                    <div>
                      <span className="portal-badge">{typeLabel(c.supportType)}</span>
                      <h2>{c.description || c.purpose || c.caseDescription || "Support application"}</h2>
                      <p>{c.member?.fullName || c.member?.memberNumber || "Member"} • {formatDate(c.createdAt || c.applicationDate)}</p>
                    </div>
                    <span className={`portal-badge ${c.status === "Rejected" ? "rejected" : ["Approved", "Paid", "Completed"].includes(c.status) ? "approved" : ""}`}>{c.status || "Pending"}</span>
                  </div>
                  <div className="portal-stat-grid compact">
                    <div className="portal-stat"><span>Requested</span><strong>{money(c.requestedAmount)}</strong></div>
                    <div className="portal-stat"><span>Approved</span><strong>{money(c.approvedAmount)}</strong></div>
                  </div>
                  {c.remarks && <p>{c.remarks}</p>}
                  <div className="claim-documents">
                    {(c.documents || []).map((d, i) => {
                      const u = typeof d === "string" ? d : d?.fileUrl || d?.url;
                      return u ? <button key={i} className="portal-btn secondary" onClick={() => openDocument(c, u)}>Document {i + 1}</button> : null;
                    })}
                  </div>
                  <div className="portal-actions">
                    <button className="portal-btn" onClick={() => open(c)} aria-label={`Open ${typeLabel(c.supportType)} claim details`}><Eye size={15} /> View Details</button><button className="portal-btn secondary" onClick={() => { setSelected(c); open(c); }}>Review / update</button>
                    {c.status === "Rejected" && !alreadyCommunity && (
                      <button className="portal-btn primary" onClick={() => openCommunity(c)}>
                        <HeartHandshake size={15} /> Enable community M-PESA
                      </button>
                    )}
                    {appealPending && <span className="portal-badge">Community appeal pending review</span>}
                    {alreadyCommunity && !appealPending && <span className="portal-badge approved">Community support enabled</span>}
                    {["Approved", "Paid", "Completed"].includes(c.status) && !c.publishedToNews && !c.publishedNewsId && <button className="portal-btn secondary" onClick={() => preparePublishClaim(c)} disabled={busy === `preview-${c._id}`}><Megaphone size={15} />{busy === `preview-${c._id}` ? "Preparing…" : "Publish to News"}</button>}
                    {c.publishedToNews && <span className="portal-badge approved">Published to News</span>}
                    {isSuperAdmin && ["Closed", "Rejected", "Cancelled"].includes(String(c.status)) && <button className="portal-btn secondary" onClick={() => reopenClaim(c)} disabled={busy === `reopen-${c._id}`}><RefreshCw size={15} />{busy === `reopen-${c._id}` ? "Reopening…" : "Reopen case"}</button>}
                    {isSuperAdmin && c.memberVisible === false && <span className="portal-badge hidden-claim-badge"><ShieldAlert size={13} /> Hidden from member</span>}
                    {isSuperAdmin && c.memberVisible !== false && <button className="portal-btn secondary" onClick={() => hideClaim(c)} disabled={busy === `hide-${c._id}`}><ShieldAlert size={15} />{busy === `hide-${c._id}` ? "Hiding…" : "Hide"}</button>}
                    {isSuperAdmin && c.status === "Closed" && <button className="portal-btn danger" onClick={() => openDeleteDialog(c)} disabled={busy === `delete-${c._id}`}><Trash2 size={15} />Delete permanently</button>}
                  </div>
                  {Array.isArray(c.timeline) && c.timeline.length > 0 && <div className="claim-latest"><strong>Latest review</strong><p>{c.timeline[c.timeline.length - 1]?.status}: {c.timeline[c.timeline.length - 1]?.remarks || "—"}</p></div>}
                </article>
              );
            })}
          </section>
        )}

        <section className="portal-panel community-admin-section">
          <div className="portal-module-header compact-header">
            <div>
              <span>COMMUNITY M-PESA</span>
              <h2>Appeals & active assistance</h2>
              <p>Community appeals require an authorised review before any M-PESA campaign opens. Members and eligible Admin / leader accounts may contribute only after approval; SuperAdmin remains a governance/payment-control role.</p>
            </div>
          </div>
          {community.filter((c) => ["community_appeal_pending_review", "community_appeal_requested"].includes(String(c.workflowStatus || ""))).length > 0 && (
            <section className="portal-panel" style={{ marginBottom: 16, background: "#fff7ed" }}>
              <div className="claim-card-head"><div><span className="portal-badge">PENDING REVIEW</span><h3>Community appeals awaiting decision</h3></div><HeartHandshake size={22}/></div>
              <div className="portal-grid two">
                {community.filter((c) => ["community_appeal_pending_review", "community_appeal_requested"].includes(String(c.workflowStatus || ""))).map((c) => (
                  <article className="portal-panel" key={`appeal-${c._id}`} style={{ margin: 0 }}>
                    <div className="claim-card-head"><div><span className="portal-badge">{c.referenceModel}</span><h3>{c.title}</h3><p>{c.recipientMember?.fullName || "Member"}</p></div><span className="portal-badge">{c.workflowStatus || "Pending review"}</span></div>
                    <p>{c.description}</p>
                    <div className="portal-stat-grid compact"><div className="portal-stat"><span>Requested target</span><strong>{money(c.targetAmount)}</strong></div><div className="portal-stat"><span>Raised</span><strong>{money(c.raisedAmount)}</strong></div></div>
                    <div className="portal-actions"><button className="portal-btn primary" onClick={() => { setAppealReview(c); setAppealReason(""); }}><CheckCircle2 size={15}/> Review appeal</button>{isSuperAdmin && <button className="portal-btn danger" onClick={() => openCommunityDeleteDialog(c)} disabled={busy === `delete-community-${c._id}`}><Trash2 size={15} />{busy === `delete-community-${c._id}` ? "Deleting…" : "Delete permanently"}</button>}</div>
                  </article>
                ))}
              </div>
            </section>
          )}
          {community.filter((c) => !["community_appeal_pending_review", "community_appeal_requested", "community_appeal_rejected"].includes(String(c.workflowStatus || ""))).length === 0 ? <div className="portal-empty">No approved/open community assistance cases.</div> : (
            <div className="portal-grid two">
              {community.filter((c) => !["community_appeal_pending_review", "community_appeal_requested", "community_appeal_rejected"].includes(String(c.workflowStatus || ""))).map((c) => (
                <article className="portal-panel" key={c._id}>
                  <div className="claim-card-head"><div><span className="portal-badge">{c.referenceModel}</span><h3>{c.title}</h3></div><span className="portal-badge approved">{c.workflowStatus === "completed" ? "Completed" : c.status}</span></div>
                  <p>{c.description}</p>
                  <div className="portal-stat-grid compact"><div className="portal-stat"><span>Target</span><strong>{money(c.targetAmount)}</strong></div><div className="portal-stat"><span>Raised</span><strong>{money(c.raisedAmount)}</strong></div></div>
                  <div className="portal-actions">
                    {String(c.workflowStatus || "") === "community_campaign_open" && Number(c.raisedAmount || 0) < Number(c.targetAmount || 0) && !isSuperAdmin && c.canContribute && <MpesaPaymentButton purpose="community_assistance" referenceId={c._id} label="Contribute via M-PESA" maxAmount={Math.max(0, Number(c.targetAmount || 0) - Number(c.raisedAmount || 0))} onSuccess={load} />}
                    {String(c.workflowStatus || "") === "community_campaign_open" && !isSuperAdmin && !c.canContribute && <span className="portal-badge">Contribution unavailable for this account/case</span>}
                    {!["closed", "paid"].includes(c.status) && <button className="portal-btn secondary" onClick={() => publishCommunity(c)} disabled={busy === `publish-community-${c._id}`}><Megaphone size={15} />{busy === `publish-community-${c._id}` ? "Publishing…" : "Publish to News"}</button>}
                    {isSuperAdmin && Number(c.raisedAmount) > 0 && ["open", "target_reached"].includes(c.status) && <button className="portal-btn primary" onClick={() => payoutCommunity(c)} disabled={busy === `payout-${c._id}`}><WalletCards size={15} />{busy === `payout-${c._id}` ? "Submitting…" : "Disburse raised funds"}</button>}
                    {isSuperAdmin && ["open", "target_reached"].includes(c.status) && <button className="portal-btn danger" onClick={() => closeCommunity(c)} disabled={busy === `close-${c._id}`}><LockKeyhole size={15} />{busy === `close-${c._id}` ? "Closing…" : "Close collection"}</button>}
                    {isSuperAdmin && <button className="portal-btn danger" onClick={() => openCommunityDeleteDialog(c)} disabled={busy === `delete-community-${c._id}`}><Trash2 size={15} />{busy === `delete-community-${c._id}` ? "Deleting…" : "Delete permanently"}</button>}
                    {!isSuperAdmin && <span className="portal-badge">SuperAdmin controls required for payout / close</span>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {appealReview && <div className="portal-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="community-appeal-review-title">
          <section className="portal-modal-card">
            <div className="portal-modal-head"><div><span>COMMUNITY APPEAL REVIEW</span><h2 id="community-appeal-review-title">Review community assistance request</h2><p>{appealReview.recipientMember?.fullName || "Member"} • {appealReview.referenceModel}</p></div><button className="portal-btn secondary" onClick={() => setAppealReview(null)}>Close</button></div>
            <p>This review only controls the community campaign. It does not change the original rejected claim decision.</p>
            <div className="portal-field"><label htmlFor="community-appeal-reason">Decision notes / rejection reason</label><textarea id="community-appeal-reason" rows="5" value={appealReason} onChange={(e) => setAppealReason(e.target.value)} placeholder="Record the governance/review reason. A rejection must include a reason." /></div>
            <div className="portal-actions"><button className="portal-btn primary" onClick={() => reviewAppeal("approve")} disabled={busy === `appeal-${appealReview._id}`}><CheckCircle2 size={15}/> Approve & open campaign</button><button className="portal-btn danger" onClick={() => reviewAppeal("reject")} disabled={busy === `appeal-${appealReview._id}`}><XCircle size={15}/> Reject appeal</button></div>
          </section>
        </div>}

        {communityDraft && <div className="portal-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="community-assistance-title">
          <section className="portal-modal-card">
            <div className="portal-modal-head"><div><span>DECLINED CASE</span><h2 id="community-assistance-title">Enable community M-PESA support</h2><p>{communityDraft.member?.fullName || "Member"} • {typeLabel(communityDraft.supportType)}</p></div><button className="portal-btn secondary" onClick={() => setCommunityDraft(null)}>Close</button></div>
            <div className="portal-form-grid">
              <div className="portal-field"><label htmlFor="community-target">Target amount (KSh)</label><input id="community-target" type="number" min="1" inputMode="decimal" value={communityTarget} onChange={(e) => setCommunityTarget(e.target.value)} /></div>
              <div className="portal-field"><label htmlFor="community-title">Public title</label><input id="community-title" maxLength={180} value={communityTitle} onChange={(e) => setCommunityTitle(e.target.value)} /></div>
              <div className="portal-field portal-field-wide"><label htmlFor="community-description">Public description</label><textarea id="community-description" rows="5" maxLength={2000} value={communityDescription} onChange={(e) => setCommunityDescription(e.target.value)} /></div>
            </div>
            <div className="portal-alert" style={{ marginTop: 14 }}><strong>Privacy:</strong> Keep the public description free of medical details, identity numbers, phone numbers and private documents.</div>
            <div className="portal-actions"><button className="portal-btn primary" onClick={createCommunity} disabled={busy === `community-${communityDraft._id}`}><Smartphone size={16} />{busy === `community-${communityDraft._id}` ? "Enabling…" : "Enable M-PESA support"}</button><button className="portal-btn secondary" onClick={() => setCommunityDraft(null)}>Cancel</button></div>
          </section>
        </div>}

        {publishDialog && publishPreview && <div className="portal-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="claim-news-publish-title">
          <section className="portal-modal-card claim-news-preview-dialog">
            <div className="portal-modal-head"><div><span>PUBLIC NEWS REVIEW</span><h2 id="claim-news-publish-title">Publish this claim as News?</h2><p>Only the public-safe article below will be published. Private member information and evidence are excluded.</p></div><button className="portal-btn secondary" onClick={() => { setPublishDialog(null); setPublishPreview(null); }}>Close</button></div>
            <div className="claim-news-preview-card"><span className="portal-badge">{publishPreview.category}</span><h3>{publishPreview.title}</h3><p className="claim-news-summary">{publishPreview.summary}</p><div className="claim-news-content">{publishPreview.content}</div></div>
            <div className="portal-alert" style={{ marginTop: 14 }}><strong>Privacy check:</strong> The preview contains no member name, member number, phone/email, private financial amount, internal review note, or evidence attachment.</div>
            <div className="portal-actions"><button className="portal-btn primary" onClick={publishClaim} disabled={busy === `publish-${publishDialog._id}`}><Megaphone size={16} />{busy === `publish-${publishDialog._id}` ? "Publishing…" : "Publish to News"}</button><button className="portal-btn secondary" onClick={() => { setPublishDialog(null); setPublishPreview(null); }}>Cancel</button></div>
          </section>
        </div>}

        {communityDeleteDialog && <div className="portal-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="community-delete-title">
          <section className="portal-modal-card claim-delete-dialog">
            <div className="portal-modal-head"><div><span>DESTRUCTIVE ACTION</span><h2 id="community-delete-title">Permanently delete this community request?</h2><p>This permanently removes the community assistance request and its application-side related records, including M-PESA transaction records and payout records.</p></div><button className="portal-btn secondary" onClick={() => { setCommunityDeleteDialog(null); setCommunityDeleteConfirmation(""); }}>Close</button></div>
            <div className="portal-alert" style={{ marginTop: 8 }}><strong>Request:</strong> {communityDeleteDialog.title || "Community assistance"} • {communityDeleteDialog._id}</div>
            <div className="portal-alert" style={{ marginTop: 10 }}><strong>Testing / destructive cleanup:</strong> If this was test data, Delete will remove the request and its related application-side M-PESA, payout, finance, notification and News records. This does not reverse money already moved through the real Safaricom M-PESA system.</div>
            <div className="portal-field" style={{ marginTop: 14 }}><label htmlFor="community-delete-confirmation">Type DELETE to confirm</label><input id="community-delete-confirmation" value={communityDeleteConfirmation} onChange={(event) => setCommunityDeleteConfirmation(event.target.value)} autoComplete="off" spellCheck="false" placeholder="DELETE" /></div>
            <div className="portal-actions"><button className="portal-btn danger" onClick={deleteCommunity} disabled={communityDeleteConfirmation !== "DELETE" || busy === `delete-community-${communityDeleteDialog._id}`}><Trash2 size={16} />{busy === `delete-community-${communityDeleteDialog._id}` ? "Deleting…" : "Permanently Delete"}</button><button className="portal-btn secondary" onClick={() => { setCommunityDeleteDialog(null); setCommunityDeleteConfirmation(""); }}>Cancel</button></div>
          </section>
        </div>}

        {deleteDialog && <div className="portal-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="claim-delete-title">
          <section className="portal-modal-card claim-delete-dialog">
            <div className="portal-modal-head"><div><span>DESTRUCTIVE ACTION</span><h2 id="claim-delete-title">Permanently delete this claim?</h2><p>This action cannot be undone. The claim record will be permanently removed from the database. Accounting and audit evidence will be protected where required.</p></div><button className="portal-btn secondary" onClick={() => { setDeleteDialog(null); setDeleteConfirmation(""); }}>Close</button></div>
            <div className="portal-alert" style={{ marginTop: 8 }}><strong>Claim:</strong> {typeLabel(deleteDialog.supportType)} • {deleteDialog.member?.fullName || "Member"} • {deleteDialog._id}</div>
            <div className="portal-field" style={{ marginTop: 14 }}><label htmlFor="claim-delete-confirmation">Type DELETE to confirm</label><input id="claim-delete-confirmation" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} autoComplete="off" spellCheck="false" placeholder="DELETE" /></div>
            <div className="portal-actions"><button className="portal-btn danger" onClick={deleteClaim} disabled={deleteConfirmation !== "DELETE" || busy === `delete-${deleteDialog._id}`}><Trash2 size={16} />{busy === `delete-${deleteDialog._id}` ? "Deleting…" : "Permanently Delete"}</button><button className="portal-btn secondary" onClick={() => { setDeleteDialog(null); setDeleteConfirmation(""); }}>Cancel</button></div>
          </section>
        </div>}

        {selected && <div className="portal-modal-backdrop claim-review-backdrop" role="dialog" aria-modal="true" aria-labelledby="claim-review-title">
          <section className="portal-modal-card claim-review-dialog">
            <div className="portal-modal-head claim-review-header"><div><span>PROFESSIONAL REVIEW</span><h2 id="claim-review-title">Review {typeLabel(selected.supportType)} claim</h2><p><strong>{selected.member?.fullName || "Member"}</strong> • {money(selected.requestedAmount)} requested</p></div><button className="portal-btn secondary" onClick={() => setSelected(null)}>Close</button></div>
            <div className="claim-review-body">
            <section className="claim-detail-section" aria-labelledby="claim-submitted-details">
              <div className="claim-detail-section-head"><div><span>SUBMITTED CLAIM</span><h3 id="claim-submitted-details">Complete authorized claim details</h3><p>The information below is loaded from the selected claim record. Nothing is fabricated in the interface.</p></div></div>
              <div className="claim-detail-grid">
                <div><span>Claim reference</span><strong>{selected._id || "—"}</strong></div>
                <div><span>Claim type</span><strong>{typeLabel(selected.supportType)}</strong></div>
                <div><span>Status</span><strong>{selected.status || "—"}</strong></div>
                <div><span>Submitted</span><strong>{formatDate(selected.createdAt || selected.applicationDate)}</strong></div>
                <div><span>Last updated</span><strong>{formatDate(selected.updatedAt)}</strong></div>
                <div><span>Requested amount</span><strong>{money(selected.requestedAmount)}</strong></div>
                <div><span>Approved amount</span><strong>{money(selected.approvedAmount)}</strong></div>
                <div><span>Payment reference</span><strong>{selected.paymentReference || "—"}</strong></div>
              </div>
              <div className="claim-detail-grid claim-member-grid">
                <div><span>Member name</span><strong>{selected.member?.fullName || "—"}</strong></div>
                <div><span>Employee / member number</span><strong>{selected.member?.memberNumber || selected.memberNumber || "—"}</strong></div>
                <div><span>Email</span><strong>{selected.member?.email || "—"}</strong></div>
                <div><span>Phone</span><strong>{selected.member?.phone || "—"}</strong></div>
                <div><span>Position</span><strong>{selected.member?.position || "—"}</strong></div>
                <div><span>Employer</span><strong>{selected.member?.employer || "—"}</strong></div>
              </div>
              {(selected.description || selected.purpose || selected.caseDescription || selected.reason || selected.diagnosis || selected.treatment || selected.remarks || selected.rejectionReason) && <div className="claim-detail-texts">
                {[["Description", selected.description], ["Purpose", selected.purpose], ["Case description", selected.caseDescription], ["Reason", selected.reason], ["Diagnosis", selected.diagnosis], ["Treatment", selected.treatment], ["Review notes", selected.reviewNotes || selected.remarks], ["Rejection reason", selected.rejectionReason]].filter(([, value]) => String(value || "").trim()).map(([label, value]) => <div key={label}><span>{label}</span><p>{value}</p></div>)}
              </div>}
              {(selected.dependent || selected.dependentName || selected.relationship) && <div className="claim-detail-subpanel"><strong>Dependent / beneficiary</strong><div className="claim-detail-grid"><div><span>Name</span><strong>{selected.dependent?.fullName || selected.dependentName || "—"}</strong></div><div><span>Relationship</span><strong>{selected.dependent?.relationship || selected.relationship || "—"}</strong></div><div><span>School</span><strong>{selected.dependent?.school || selected.school || "—"}</strong></div><div><span>Education level</span><strong>{selected.dependent?.educationLevel || selected.educationLevel || "—"}</strong></div></div></div>}
              <div className="claim-detail-subpanel"><strong>Evidence & attachments</strong>
                {(selected.documents || []).length === 0 && !(selected.burialPermitChiefLetter || selected.deathCertificate || selected.burialPermit || selected.chiefLetter || selected.feeStructure || selected.admissionLetter || (selected.supportingDocuments || []).length) ? <p className="claim-detail-empty">No evidence files are recorded on this claim.</p> : <div className="claim-documents">
                  {(selected.documents || []).map((doc, index) => { const url = typeof doc === "string" ? doc : doc?.fileUrl || doc?.url; return url ? <button key={`doc-${index}`} type="button" className="portal-btn secondary" onClick={() => openDocument(selected, url)}>{doc?.label || doc?.fileName || `Document ${index + 1}`}</button> : null; })}
                  {[["Burial permit / authority letter", selected.burialPermitChiefLetter], ["Legacy death certificate", selected.deathCertificate], ["Legacy burial permit", selected.burialPermit], ["Legacy chief letter", selected.chiefLetter], ["Fee structure", selected.feeStructure], ["Admission letter", selected.admissionLetter]].map(([label, url]) => url ? <button key={label} type="button" className="portal-btn secondary" onClick={() => openDocument(selected, url)}>{label}</button> : null)}
                  {(selected.supportingDocuments || []).map((url, index) => url ? <button key={`supporting-${index}`} type="button" className="portal-btn secondary" onClick={() => openDocument(selected, url)}>Supporting document {index + 1}</button> : null)}
                </div>}
              </div>
              <div className="claim-detail-subpanel"><strong>Workflow history</strong>
                {(selected.timeline || []).length ? <ol className="claim-detail-timeline">{selected.timeline.map((entry, index) => <li key={`${entry.date || index}-${index}`}><div><strong>{entry.status || "Update"}</strong><time>{formatDate(entry.date)}</time></div><p>{entry.remarks || "—"}</p></li>)}</ol> : <p className="claim-detail-empty">No workflow timeline entries are recorded.</p>}
              </div>
            </section>
            <div className="claim-detail-subpanel claim-additional-fields"><strong>Additional submitted fields</strong><div className="claim-additional-grid">{Object.entries(selected).filter(([key, value]) => !["_id","__v","member","dependent","documents","timeline","supportingDocuments","burialPermitChiefLetter","deathCertificate","burialPermit","chiefLetter","feeStructure","admissionLetter","createdAt","updatedAt","status","requestedAmount","approvedAmount","paymentReference","remarks","reviewNotes","rejectionReason","supportType","sourceType","amount","memberVisible","hiddenAt","hiddenBy","publishedNewsId","publishedToNews","publishedAt"].includes(key) && value !== null && value !== undefined && typeof value !== "object" && String(value).trim() !== "").map(([key, value]) => <div key={key}><span>{key.replace(/([A-Z])/g, " $1").replace(/^./, (ch) => ch.toUpperCase())}</span><strong>{String(value)}</strong></div>)}</div></div>
            <div className="portal-field"><label htmlFor="claim-stage">Stage</label><select id="claim-stage" value={stage} onChange={(e) => setStage(e.target.value)}>{STAGES.map((x) => <option key={x} value={x}>{x}</option>)}</select></div>
            {stage === "Approved" && <div className="portal-field" style={{ marginTop: 12 }}><label htmlFor="approved-amount">Approved amount</label><input id="approved-amount" type="number" min="0" inputMode="decimal" value={approvedAmount} onChange={(e) => setApprovedAmount(e.target.value)} /></div>}
            {(stage === "Paid" || stage === "Completed") && <div className="portal-field" style={{ marginTop: 12 }}><label htmlFor="payment-reference">Payment transaction/reference</label><input id="payment-reference" type="text" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="M-PESA receipt, bank reference, or reconciled transaction ID" required /><small>Required payment evidence before Paid/Completed can be recorded.</small></div>}
            <div className="portal-field" style={{ marginTop: 12 }}><label htmlFor="review-remarks">Professional review notes</label><textarea id="review-remarks" rows="6" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Record what was checked, what is missing, the eligibility finding, or the approval/rejection reason." /></div>
            {selected.sourceType === "education" && ["Paid", "Defaulted"].includes(stage) && Number(selected.balance || 0) > 0 && (
              <section className="portal-panel" style={{ marginTop: 14, background: "#f8fafc" }}>
                <div className="claim-card-head"><div><span>EDUCATION REPAYMENT</span><h3>Record a verified manual repayment</h3><p>Use this only for a reconciled payment that is not being applied automatically from the member M-PESA flow.</p></div></div>
                <div className="portal-form-grid">
                  <div className="portal-field"><label htmlFor="education-repayment-amount">Repayment amount</label><input id="education-repayment-amount" type="number" min="1" max={Number(selected.balance || 0)} value={repaymentAmount} onChange={(e) => setRepaymentAmount(e.target.value)} /></div>
                  <div className="portal-field"><label htmlFor="education-repayment-reference">Payment reference</label><input id="education-repayment-reference" type="text" value={repaymentReference} onChange={(e) => setRepaymentReference(e.target.value)} placeholder="M-PESA receipt / bank reference" /></div>
                </div>
                <button className="portal-btn primary" type="button" onClick={recordEducationRepayment} disabled={busy === `repay-${selected._id}`}>{busy === `repay-${selected._id}` ? "Recording…" : "Record repayment"}</button>
              </section>
            )}
            </div>
            <footer className="claim-review-footer"><button className="portal-btn primary" onClick={saveStage} disabled={busy === selected._id}>{busy === selected._id ? "Saving…" : "Save stage"}</button><button className="portal-btn secondary" onClick={() => { setSelected(null); navigate(location.pathname, { replace: true }); }}>Cancel</button></footer>
          </section>
        </div>}
      </div>
    </DashboardLayout>
  );
}
