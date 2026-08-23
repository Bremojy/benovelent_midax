import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API, { resolveApiUrl } from "../../services/api";
import "../../styles/portalModule.css";

const SOURCES = [
  { type: "Medical", get: "/medical/admin/applications", approve: "/medical/admin/approve/", reject: "/medical/admin/reject/", remove: "/medical/admin/delete/", actionable: true },
  { type: "Funeral", get: "/funeral/", approve: "/funeral/approve/", reject: "/funeral/reject/", remove: "/funeral/", actionable: true },
  { type: "Education", get: "/education/", approve: "/education/", reject: "/education/", remove: "/education/", actionable: true },
  {
    type: "Support Request",
    get: "/member/support-requests",
    approve: "/member/support-requests/",
    reject: "/member/support-requests/",
    actionable: true,
  },
];

export default function AdminClaims() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const results = await Promise.allSettled(SOURCES.map((source) => API.get(source.get)));
      const merged = [];

      results.forEach((result, index) => {
        if (result.status !== "fulfilled") return;
        const source = SOURCES[index];
        const data = result.value.data;
        const arr = data?.applications || data?.claims || data?.requests || data?.records || [];
        if (Array.isArray(arr)) {
          arr.forEach((item) => merged.push({ ...item, supportType: source.type, source }));
        }
      });

      merged.sort((a, b) => new Date(b.createdAt || b.applicationDate) - new Date(a.createdAt || a.applicationDate));
      setItems(merged);

      if (!merged.length && results.every((result) => result.status === "rejected")) {
        throw results[0].reason;
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to load claims.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const action = async (item, kind) => {
    if (!item?._id || !item.source?.actionable) return;
    const key = `${kind}-${item._id}`;
    try {
      setBusy(key);
      const endpoint = kind === "approve" ? item.source.approve : item.source.reject;
      const path = `${endpoint}${item._id}`;
      let payload = {};

      if (item.supportType === "Support Request") {
        payload = kind === "approve"
          ? {
              status: "Approved",
              approvedAmount: Number(item.approvedAmount || item.requestedAmount || 0),
              remarks: "Support request approved by administrator.",
            }
          : {
              status: "Rejected",
              rejectionReason: "Reviewed and rejected by administrator.",
              remarks: "Support request rejected by administrator.",
            };
      } else if (kind === "reject") {
        payload = { rejectionReason: "Reviewed and rejected by administrator." };
      }

      const { data } = await API.put(path, payload);
      if (!data?.success) throw new Error(data?.message || "Action failed.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to update claim.");
    } finally {
      setBusy("");
    }
  };

  const deleteClaim = async (item) => {
    if (!item?._id || !item.source?.actionable) return;
    if (!window.confirm("Delete this claim permanently?")) return;
    try {
      setBusy(`delete-${item._id}`);
      const path =
        item.supportType === "Medical"
          ? `/medical/admin/delete/${item._id}`
          : item.supportType === "Funeral"
            ? `/funeral/${item._id}`
            : `/education/${item._id}`;
      await API.delete(path);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to delete claim.");
    } finally {
      setBusy("");
    }
  };

  const openDocument = async (type, id, url) => {
    try {
      if (type !== "Support Request" && type !== "General") {
        await API.post(`/admin/claims/${String(type).toLowerCase()}/${id}/open`);
      }
    } catch {}
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <DashboardLayout>
      <div className="portal-module">
        <header className="portal-module-header">
          <div>
            <span>ASSISTANCE PROCESSING</span>
            <h1>Claims</h1>
            <p>Review and process medical, funeral, education and support-request uploads.</p>
          </div>
          <button className="portal-btn" onClick={load}>Refresh</button>
        </header>

        {error && <div className="portal-alert">{error}</div>}

        <section className="portal-panel">
          {loading ? (
            <div className="portal-empty">Loading claims...</div>
          ) : items.length === 0 ? (
            <div className="portal-empty">
              <h3>No claims available</h3>
              <p>Applications submitted by members will show up here.</p>
            </div>
          ) : (
            <div className="claim-feed">
              {items.map((item) => (
                <article className="claim-feed-card" key={`${item.supportType}-${item._id}`}>
                  <div className="claim-feed-main">
                    <div className="claim-feed-top">
                      <div>
                        <span className="portal-badge">{item.supportType}</span>
                        <h2>{item.description || item.purpose || item.caseDescription || "Support application"}</h2>
                        <p>{item.member?.fullName || item.member?.memberNumber || "Member"}</p>
                      </div>
                      <div className={`portal-badge ${String(item.status || "pending").toLowerCase().replace(/\s+/g, "-")}`}>
                        {item.status || "Pending"}
                      </div>
                    </div>

                    <p className="claim-feed-description">
                      {item.remarks || item.rejectionReason || "No remarks yet."}
                    </p>

                    {Array.isArray(item.documents) && item.documents.length > 0 && (
                      <div className="claim-feed-documents">
                        {item.documents.map((doc, index) => {
                          const url = typeof doc === "string" ? doc : doc?.fileUrl || doc?.url;
                          if (!url) return null;
                          const fullUrl = url.startsWith("http") ? url : resolveApiUrl(url);
                          const category = typeof doc === "string" ? "General" : doc?.category || "General";
                          const label = typeof doc === "string" ? `Document ${index + 1}` : doc?.label || doc?.fileName || `Document ${index + 1}`;
                          return (
                            <button
                              type="button"
                              className="claim-doc-chip"
                              key={`${url}-${index}`}
                              onClick={() => openDocument(item.supportType, item._id, fullUrl)}
                            >
                              <strong>{category}</strong>
                              <span>{label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="claim-feed-side">
                    <strong>{money(item.amount || item.requestedAmount || 0)}</strong>
                    <small>{formatDate(item.createdAt || item.applicationDate)}</small>

                    {item.source?.actionable && (
                      <div className="portal-actions">
                        {item.supportType === "Support Request" && (
                          <button
                            className="portal-btn secondary"
                            disabled={busy === `review-${item._id}` || ["Approved", "Rejected", "Closed"].includes(item.status)}
                            onClick={async () => {
                              try {
                                setBusy(`review-${item._id}`);
                                await API.put(`/member/support-requests/${item._id}`, {
                                  status: "Under Review",
                                  remarks: "Support request is now under administrative review.",
                                });
                                await load();
                              } catch (err) {
                                setError(err.response?.data?.message || err.message || "Unable to move support request into review.");
                              } finally {
                                setBusy("");
                              }
                            }}
                          >
                            {busy === `review-${item._id}` ? "Updating..." : "Under review"}
                          </button>
                        )}
                        <button className="portal-btn" disabled={busy === `approve-${item._id}`} onClick={() => action(item, "approve")}>
                          Approve
                        </button>
                        <button className="portal-btn secondary" disabled={busy === `reject-${item._id}`} onClick={() => action(item, "reject")}>
                          Reject
                        </button>
                        {item.supportType === "Support Request" && item.status === "Approved" && (
                          <button
                            className="portal-btn secondary"
                            disabled={busy === `close-${item._id}`}
                            onClick={async () => {
                              try {
                                setBusy(`close-${item._id}`);
                                await API.put(`/member/support-requests/${item._id}`, {
                                  status: "Closed",
                                  remarks: "Support request closed after processing.",
                                });
                                await load();
                              } catch (err) {
                                setError(err.response?.data?.message || err.message || "Unable to close support request.");
                              } finally {
                                setBusy("");
                              }
                            }}
                          >
                            {busy === `close-${item._id}` ? "Closing..." : "Close"}
                          </button>
                        )}
                        {item.supportType !== "Support Request" && (
                          <button className="portal-btn danger" disabled={busy === `delete-${item._id}`} onClick={() => deleteClaim(item)}>
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}

const money = (v) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(Number(v || 0));
const formatDate = (v) =>
  v ? new Date(v).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" }) : "—";
