import { useEffect, useMemo, useState } from "react";
import { HeartHandshake, Megaphone, Trash2, Smartphone, WalletCards, LockKeyhole } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import DashboardLayout from "../../layouts/DashboardLayout";
import API, { resolveApiUrl } from "../../services/api";
import "../../styles/portalModule.css";

const STAGES = ["Pending", "Under Review", "Documents Required", "Eligibility Review", "Approval Review", "Approved", "Disbursement Pending", "Paid", "Completed", "Rejected", "Cancelled", "Closed"];
const money = (v) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(Number(v || 0));
const formatDate = (v) => v ? new Date(v).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const typeLabel = (v) => String(v || "support").replace(/^./, (c) => c.toUpperCase());

export default function AdminClaims() {
  const { role } = useAuth();
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
  const [communityTarget, setCommunityTarget] = useState("");
  const [communityTitle, setCommunityTitle] = useState("");
  const [communityDescription, setCommunityDescription] = useState("");
  const [communityDraft, setCommunityDraft] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const [claimsRes, communityRes] = await Promise.all([
        API.get("/claims"),
        API.get("/payments/community-assistance/admin"),
      ]);
      setClaims(Array.isArray(claimsRes.data?.claims) ? claimsRes.data.claims : []);
      setCommunity(Array.isArray(communityRes.data?.campaigns) ? communityRes.data.campaigns : []);
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Unable to load claims.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => claims.reduce((a, c) => {
    const key = c.status || "Pending";
    (a[key] ??= []).push(c);
    return a;
  }, {}), [claims]);

  const open = (claim) => {
    setSelected(claim);
    setStage(claim.status || "Pending");
    setRemarks("");
    setApprovedAmount(String(claim.approvedAmount || claim.requestedAmount || ""));
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
      const payload = { status: stage, remarks };
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
      setSuccess("Community M-PESA assistance is now open for this declined case.");
      await load();
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Unable to enable community support.");
    } finally {
      setBusy("");
    }
  };

  const publishClaim = async (c) => {
    try {
      setBusy(`publish-${c._id}`);
      setError("");
      const { data } = await API.post(`/claims/${c.sourceType}/${c._id}/publish-news`);
      if (!data?.success) throw new Error(data?.message || "Unable to publish.");
      setSuccess("Public approval update published to News without exposing private claim details.");
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Unable to publish to News.");
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
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Unable to publish community request.");
    } finally {
      setBusy("");
    }
  };

  const payoutCommunity = async (campaign) => {
    if (!isSuperAdmin) return;
    if (!window.confirm(`Disburse ${money(campaign.raisedAmount)} raised for this community case to the recipient's registered M-PESA number? This sends a real B2C payout when the production credentials are configured.`)) return;
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
    if (!window.confirm(`Close ${campaign.title}? Members will no longer be able to contribute through the community M-PESA request.`)) return;
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

  const deleteClaim = async (c) => {
    if (!isSuperAdmin || !window.confirm("Delete this claim permanently? This cannot be undone.")) return;
    try {
      setBusy(`delete-${c._id}`);
      await API.delete(`/claims/${c.sourceType}/${c._id}`);
      setSuccess("Claim deleted.");
      await load();
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Unable to delete claim.");
    } finally {
      setBusy("");
    }
  };

  const openDocument = async (claim, url) => {
    if (!url) return;
    window.open(url.startsWith("http") ? url : resolveApiUrl(url), "_blank", "noopener,noreferrer");
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

        <section className="portal-stat-grid">
          {["Pending", "Under Review", "Documents Required", "Eligibility Review", "Approval Review", "Approved", "Disbursement Pending", "Paid", "Completed", "Rejected"].map((s) => (
            <div className="portal-stat" key={s}><span>{s}</span><strong>{grouped[s]?.length || 0}</strong></div>
          ))}
        </section>

        {loading ? <div className="portal-empty">Loading claims…</div> : claims.length === 0 ? (
          <div className="portal-empty"><h3>No claims available</h3><p>Member applications will appear here automatically.</p></div>
        ) : (
          <section className="portal-grid two">
            {claims.map((c) => {
              const alreadyCommunity = community.some((item) => String(item.referenceId) === String(c._id));
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
                    <button className="portal-btn" onClick={() => open(c)}>Review / update</button>
                    {c.status === "Rejected" && !alreadyCommunity && (
                      <button className="portal-btn primary" onClick={() => openCommunity(c)}>
                        <HeartHandshake size={15} /> Enable community M-PESA
                      </button>
                    )}
                    {alreadyCommunity && <span className="portal-badge approved">Community support enabled</span>}
                    {["Approved", "Paid", "Completed"].includes(c.status) && <button className="portal-btn secondary" onClick={() => publishClaim(c)} disabled={busy === `publish-${c._id}`}><Megaphone size={15} />{busy === `publish-${c._id}` ? "Publishing…" : "Publish approval"}</button>}
                    {isSuperAdmin && <button className="portal-btn danger" onClick={() => deleteClaim(c)} disabled={busy === `delete-${c._id}`}><Trash2 size={15} />{busy === `delete-${c._id}` ? "Deleting…" : "Delete claim"}</button>}
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
              <h2>Active assistance cases</h2>
              <p>Administrators can monitor verified requests. Only SuperAdmin can disburse collected funds or close an M-PESA collection request.</p>
            </div>
          </div>
          {community.length === 0 ? <div className="portal-empty">No active community assistance cases.</div> : (
            <div className="portal-grid two">
              {community.map((c) => (
                <article className="portal-panel" key={c._id}>
                  <div className="claim-card-head"><div><span className="portal-badge">{c.referenceModel}</span><h3>{c.title}</h3></div><span className="portal-badge approved">{c.status}</span></div>
                  <p>{c.description}</p>
                  <div className="portal-stat-grid compact"><div className="portal-stat"><span>Target</span><strong>{money(c.targetAmount)}</strong></div><div className="portal-stat"><span>Raised</span><strong>{money(c.raisedAmount)}</strong></div></div>
                  <div className="portal-actions">
                    {!["closed", "paid"].includes(c.status) && <button className="portal-btn secondary" onClick={() => publishCommunity(c)} disabled={busy === `publish-community-${c._id}`}><Megaphone size={15} />{busy === `publish-community-${c._id}` ? "Publishing…" : "Publish to News"}</button>}
                    {isSuperAdmin && Number(c.raisedAmount) > 0 && ["open", "target_reached"].includes(c.status) && <button className="portal-btn primary" onClick={() => payoutCommunity(c)} disabled={busy === `payout-${c._id}`}><WalletCards size={15} />{busy === `payout-${c._id}` ? "Submitting…" : "Disburse raised funds"}</button>}
                    {isSuperAdmin && ["open", "target_reached"].includes(c.status) && <button className="portal-btn danger" onClick={() => closeCommunity(c)} disabled={busy === `close-${c._id}`}><LockKeyhole size={15} />{busy === `close-${c._id}` ? "Closing…" : "Close collection"}</button>}
                    {!isSuperAdmin && <span className="portal-badge">SuperAdmin controls required for payout / close</span>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

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

        {selected && <div className="portal-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="claim-review-title">
          <section className="portal-modal-card">
            <div className="portal-modal-head"><div><span>PROFESSIONAL REVIEW</span><h2 id="claim-review-title">Review {typeLabel(selected.supportType)} claim</h2><p><strong>{selected.member?.fullName || "Member"}</strong> • {money(selected.requestedAmount)} requested</p></div><button className="portal-btn secondary" onClick={() => setSelected(null)}>Close</button></div>
            <div className="portal-field"><label htmlFor="claim-stage">Stage</label><select id="claim-stage" value={stage} onChange={(e) => setStage(e.target.value)}>{STAGES.map((x) => <option key={x} value={x}>{x}</option>)}</select></div>
            {stage === "Approved" && <div className="portal-field" style={{ marginTop: 12 }}><label htmlFor="approved-amount">Approved amount</label><input id="approved-amount" type="number" min="0" inputMode="decimal" value={approvedAmount} onChange={(e) => setApprovedAmount(e.target.value)} /></div>}
            <div className="portal-field" style={{ marginTop: 12 }}><label htmlFor="review-remarks">Professional review notes</label><textarea id="review-remarks" rows="6" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Record what was checked, what is missing, the eligibility finding, or the approval/rejection reason." /></div>
            <div className="portal-actions"><button className="portal-btn primary" onClick={saveStage} disabled={busy === selected._id}>{busy === selected._id ? "Saving…" : "Save stage"}</button><button className="portal-btn secondary" onClick={() => setSelected(null)}>Cancel</button></div>
          </section>
        </div>}
      </div>
    </DashboardLayout>
  );
}
