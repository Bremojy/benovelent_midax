import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { getMemberClaims } from "../../services/memberService";
import "./Support.css";

export default function Claims() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const response = await getMemberClaims();
      if (!response?.success) throw new Error(response?.message || "Unable to load claims.");
      setClaims(Array.isArray(response.claims) ? response.claims : []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to load claims.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <DashboardLayout>
      <div className="member-support-page">
        <section className="member-page-header">
          <span>MEMBER CLAIMS</span>
          <h1>Claims & Applications</h1>
          <p>View the status and history of your assistance applications.</p>
        </section>

        {error && <div className="support-alert error">{error}</div>}

        <section className="support-history-card">
          <div className="support-section-heading">
            <span>CLAIM HISTORY</span>
            <h2>All Applications</h2>
          </div>

          {loading ? <div className="support-loading">Loading claims...</div> :
            claims.length === 0 ? <div className="support-empty"><h3>No claims found</h3><p>When you apply for assistance, your application will appear here.</p></div> :
            <div className="support-list">
              {claims.map((claim) => (
                <article className="support-item" key={`${claim.supportType}-${claim._id}`}>
                  <div>
                    <strong>{String(claim.supportType || "support").toUpperCase()} SUPPORT</strong>
                    <span>{formatDate(claim.createdAt || claim.applicationDate)}</span>
                    {claim.remarks && <small>{claim.remarks}</small>}
                    {Array.isArray(claim.documents) && claim.documents.length > 0 && (
                      <div className="claim-documents">
                        <strong>Documents:</strong>
                        {claim.documents.map((doc, index) => {
                          const url = typeof doc === "string" ? doc : doc?.fileUrl;
                          if (!url) return null;
                          const fullUrl = url.startsWith("http")
                            ? url
                            : `${import.meta.env.VITE_API_URL || "https://benovelent-midax.onrender.com"}${url.startsWith("/") ? "" : "/"}${url}`;
                          return <a href={fullUrl} target="_blank" rel="noreferrer" key={`${url}-${index}`}>View document {index + 1}</a>;
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
            </div>}
        </section>
      </div>
    </DashboardLayout>
  );
}
const money = (v) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(Number(v || 0));
const formatDate = (v) => v ? new Date(v).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" }) : "—";
