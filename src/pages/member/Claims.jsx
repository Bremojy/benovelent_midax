import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { getMemberClaims } from "../../services/memberService";
import API, { resolveApiUrl } from "../../services/api";
import MpesaPaymentButton from "../../components/payments/MpesaPaymentButton";
import { useAuth } from "../../context/AuthContext";
import "./Support.css";

export default function Claims() {
  const { user } = useAuth();
  const [communityCases, setCommunityCases] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const [response, communityResponse] = await Promise.all([getMemberClaims(), API.get("/payments/community-assistance")]);
      if (!response?.success) throw new Error(response?.message || "Unable to load claims.");
      setClaims(Array.isArray(response.claims) ? response.claims : []);
      setCommunityCases(Array.isArray(communityResponse.data?.campaigns) ? communityResponse.data.campaigns : []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to load claims.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <DashboardLayout>
      <div className="member-support-page">
        <section className="member-page-header">
          <span>MEMBER CLAIMS</span>
          <h1>Claims & Applications</h1>
          <p>View the status, notes and uploaded documents for every support request you submit.</p>
        </section>

        {error && <div className="support-alert error">{error}</div>}

        <section className="support-history-card">
          <div className="support-section-heading">
            <span>CLAIM HISTORY</span>
            <h2>All Applications</h2>
          </div>

          {loading ? (
            <div className="support-loading">Loading claims...</div>
          ) : claims.length === 0 ? (
            <div className="support-empty">
              <h3>No claims found</h3>
              <p>When you apply for assistance, your application will appear here.</p>
            </div>
          ) : (
            <div className="support-list">
              {claims.map((claim) => (
                <article className="support-item" key={`${claim.supportType}-${claim._id}`}>
                  <div className="support-item-main">
                    <strong>{String(claim.supportType || "support").toUpperCase()} SUPPORT</strong>
                    <span>{formatDate(claim.createdAt || claim.applicationDate)}</span>
                    {claim.remarks && <small>{claim.remarks}</small>}
                    {claim.description && <p>{claim.description}</p>}
                    {Array.isArray(claim.timeline) && claim.timeline.length > 0 && (
                      <div className="claim-timeline-mini">
                        {claim.timeline.slice(-6).map((event, index) => (
                          <div key={index}>
                            <strong>{event.status}</strong>
                            <span>{event.remarks || "Status updated"}</span>
                            <small>{event.date ? new Date(event.date).toLocaleString("en-KE") : ""}</small>
                          </div>
                        ))}
                      </div>
                    )}
                    {claim.rejectionReason && <small>Rejection reason: {claim.rejectionReason}</small>}
                    {claim.approvedAmount > 0 && <small>Approved amount: {money(claim.approvedAmount)}</small>}
                    {Array.isArray(claim.documents) && claim.documents.length > 0 && (
                      <div className="claim-documents">
                        <strong>Documents</strong>
                        {claim.documents.map((doc, index) => {
                          const url = typeof doc === "string" ? doc : doc?.fileUrl;
                          if (!url) return null;
                          const fullUrl = url.startsWith("http") ? url : resolveApiUrl(url);
                          const category = typeof doc === "string" ? "General" : doc?.category || "General";
                          const label = typeof doc === "string" ? `Document ${index + 1}` : doc?.label || doc?.fileName || `Document ${index + 1}`;
                          return (
                            <a href={fullUrl} target="_blank" rel="noreferrer" key={`${url}-${index}`}>
                              <strong>{category}</strong>
                              <span>{label}</span>
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="support-item-right">
                    <strong>{money(claim.amount)}</strong>
                    <span className={`claim-status ${String(claim.status || "pending").toLowerCase().replace(/\s+/g, "-")}`}>
                      {claim.status || "Pending"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>


        <section className="support-history-card" style={{ marginTop: 18 }}>
          <div className="support-section-heading"><span>COMMUNITY ASSISTANCE</span><h2>Help a member</h2><p>These voluntary cases were declined by the scheme and enabled for community help by an administrator.</p></div>
          {communityCases.length === 0 ? <div className="support-empty"><h3>No community cases are open</h3><p>There are currently no verified declined cases open for voluntary assistance.</p></div> : <div className="support-list">{communityCases.map((campaign) => { const recipientId = campaign.recipientMember?._id || campaign.recipientMember; const remaining = Math.max(0, Number(campaign.targetAmount || 0) - Number(campaign.raisedAmount || 0)); return <article className="support-item" key={campaign._id}><div className="support-item-main"><strong>{campaign.title}</strong><span>{campaign.recipientMember?.memberNumber || "Member"}</span><p>{campaign.description}</p><div className="claim-timeline-mini"><div><strong>{money(campaign.raisedAmount)} raised</strong><span>of {money(campaign.targetAmount)} target</span></div></div></div><div className="support-item-right">{String(recipientId) === String(user?._id) ? <span className="claim-status">Your case</span> : remaining > 0 ? <MpesaPaymentButton purpose="community_assistance" referenceId={campaign._id} defaultAmount={Math.min(500, remaining)} maxAmount={remaining} label="Help with M-PESA" /> : <span className="claim-status approved">Target reached</span>}</div></article>; })}</div>}
        </section>
      </div>
    </DashboardLayout>
  );
}

const money = (v) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(Number(v || 0));
const formatDate = (v) =>
  v ? new Date(v).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" }) : "—";
