import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../services/api";
import "../../styles/portalModule.css";

const COUNT_ITEMS = [
  ["members", "Members"],
  ["admins", "Administrators"],
  ["conversations", "Conversations"],
  ["messages", "Messages"],
  ["carousels", "Carousel slides"],
  ["duplicateMemberGroups", "Duplicate member groups"],
  ["duplicateAdminGroups", "Duplicate admin groups"],
  ["duplicateConversationGroups", "Duplicate conversation groups"],
  ["orphanConversations", "Orphan conversations"],
  ["orphanMessages", "Orphan messages"],
  ["duplicateCarouselGroups", "Duplicate carousel groups"],
  ["crossCollectionIdentityCollisions", "Cross-collection identity collisions"],
];

export default function SuperAdminDataIntegrity() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await API.get("/superadmin/data-integrity", {
        params: { _ts: Date.now() },
        headers: { "Cache-Control": "no-cache" },
      });
      setReport(data?.report || null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to inspect database.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const deleteDuplicateMember = async (memberId, memberName) => {
    const confirmed = window.confirm(`Permanently delete duplicate member "${memberName || memberId}"? This is only allowed for a non-canonical duplicate with no linked records.`);
    if (!confirmed) return;
    try {
      setDeletingId(memberId);
      setError("");
      setMessage("");
      const { data } = await API.delete(`/superadmin/data-integrity/members/${memberId}`);
      setReport(data?.report || null);
      setMessage(data?.message || "Duplicate member deleted.");
    } catch (err) {
      const refs = err.response?.data?.references;
      const responseReport = err.response?.data?.report;
      const detail = Array.isArray(refs) && refs.length
        ? ` Linked records: ${refs.map((x) => `${x.label} (${x.count})`).join(", ")}.`
        : "";

      // A report can become stale while the page is open. Prefer the server's
      // refreshed report and surface a clear message rather than a raw 404.
      if (responseReport) setReport(responseReport);
      if (err.response?.status === 409 && err.response?.data?.code === "STALE_INTEGRITY_REPORT") {
        setMessage(err.response.data.message || "The integrity report changed. It has been refreshed.");
        setError("");
      } else {
        setError((err.response?.data?.message || err.message || "Unable to delete duplicate member.") + detail);
      }
    } finally {
      setDeletingId("");
    }
  };

  const runCleanup = async () => {
    const confirmed = window.confirm(
      "Run SAFE cleanup? Duplicate accounts will be archived, duplicate conversations will be merged, orphaned chat data will be removed, and duplicate carousel slides will be removed. Financial and support records are preserved."
    );
    if (!confirmed) return;

    try {
      setCleaning(true);
      setError("");
      setMessage("");
      const { data } = await API.post("/superadmin/data-integrity/cleanup", { scope: "safe" });
      setReport(data?.report || null);
      setMessage(data?.message || "Safe cleanup completed.");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Cleanup failed.");
    } finally {
      setCleaning(false);
    }
  };

  const health = useMemo(() => {
    if (!report) return "checking";
    const c = report.counts || {};
    return (
      c.duplicateMemberGroups ||
      c.duplicateAdminGroups ||
      c.duplicateConversationGroups ||
      c.orphanConversations ||
      c.orphanMessages ||
      c.duplicateCarouselGroups
    ) ? "attention" : "clean";
  }, [report]);

  return (
    <DashboardLayout>
      <div className="portal-module integrity-page">
        <header className="portal-module-header">
          <div>
            <span>SUPERADMIN · DATA GOVERNANCE</span>
            <h1>Database Integrity & Cleanup</h1>
            <p>
              Inspect stale accounts, duplicate chats, orphaned records and duplicate carousel content before making any changes.
            </p>
          </div>
          <div className="integrity-actions">
            <button className="portal-btn" onClick={load} disabled={loading || cleaning}>
              <RefreshCw size={16} className={loading ? "spin" : ""} />
              {loading ? "Scanning..." : "Scan Again"}
            </button>
            <button className="portal-btn primary" onClick={runCleanup} disabled={loading || cleaning || health === "clean"}>
              <Sparkles size={16} />
              {cleaning ? "Cleaning..." : "Run Safe Cleanup"}
            </button>
          </div>
        </header>

        {message && <div className="portal-alert success"><CheckCircle2 size={18} />{message}</div>}
        {error && <div className="portal-alert"><AlertTriangle size={18} />{error}</div>}

        <section className={`integrity-health ${health}`}>
          <div className="integrity-health-icon">
            {health === "clean" ? <CheckCircle2 size={25} /> : health === "attention" ? <AlertTriangle size={25} /> : <Database size={25} />}
          </div>
          <div>
            <strong>
              {health === "clean" ? "Database integrity looks clean" : health === "attention" ? "Integrity issues need review" : "Scanning your database"}
            </strong>
            <p>
              This tool shows your live member count, separates duplicate identities from real members, and protects records linked to finance, support, audit or chat data. Non-linked duplicates can be permanently removed by a SuperAdmin.
            </p>
          </div>
        </section>

        <section className="portal-panel">
          <div className="audit-section-head">
            <div>
              <span>LIVE SNAPSHOT</span>
              <h2>Current database footprint</h2>
              <p>{report?.generatedAt ? `Last scan: ${new Date(report.generatedAt).toLocaleString("en-KE")}` : "Waiting for scan..."}</p>
            </div>
          </div>

          <div className="integrity-count-grid">
            {COUNT_ITEMS.map(([key, label]) => (
              <div className="integrity-count" key={key}>
                <span>{label}</span>
                <strong>{report?.counts?.[key] ?? "—"}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="portal-panel">
          <div className="audit-section-head">
            <div>
              <span>WHAT WILL BE CLEANED</span>
              <h2>Safe cleanup policy</h2>
            </div>
          </div>
          <div className="integrity-policy-grid">
            <Policy icon={<ShieldCheck size={20} />} title="Duplicate accounts" text="Keep the strongest active record and archive weaker duplicates so existing financial, support and audit references are not broken." />
            <Policy icon={<Database size={20} />} title="Duplicate conversations" text="Move messages into the newest conversation and remove the redundant conversation shell." />
            <Policy icon={<Trash2 size={20} />} title="Orphaned chat data" text="Remove conversations whose participants no longer exist, plus messages pointing to missing conversations." />
            <Policy icon={<Sparkles size={20} />} title="Carousel duplicates" text="Keep the newest identical slide and remove exact duplicate content, preventing old slides from competing with current ones." />
          </div>
          {(report?.crossCollectionIdentityCollisions || []).length > 0 && (
            <div className="portal-alert warning">
              <AlertTriangle size={18} />
              Cross-collection identity collisions are only reported, not automatically deleted. A person may legitimately have both a member and leadership account.
            </div>
          )}
        </section>

        <DuplicatePreview title="Duplicate member groups" groups={report?.duplicateMembers} deletingId={deletingId} onDeleteMember={deleteDuplicateMember} />
        <DuplicatePreview title="Duplicate administrator groups" groups={report?.duplicateAdmins} />
        <DuplicatePreview title="Duplicate conversations" groups={report?.duplicateConversations?.map((x) => ({
          keep: x.keep,
          records: [{ id: x.keep, name: `Keep conversation`, status: "canonical" }, ...x.remove.map((id) => ({ id, name: "Remove/merge duplicate conversation", status: "duplicate" }))],
        }))} />
        <DuplicatePreview title="Duplicate carousel groups" groups={report?.duplicateCarousels?.map((x) => ({
          keep: x.keep,
          records: [{ id: x.keep, name: x.title || "Carousel slide", status: "keep" }, ...x.remove.map((id) => ({ id, name: x.title || "Duplicate slide", status: "remove" }))],
        }))} />
      </div>
    </DashboardLayout>
  );
}

function Policy({ icon, title, text }) {
  return (
    <article className="integrity-policy">
      <div>{icon}</div>
      <section><strong>{title}</strong><p>{text}</p></section>
    </article>
  );
}

function DuplicatePreview({ title, groups, deletingId, onDeleteMember }) {
  if (!groups?.length) return null;
  return (
    <section className="portal-panel">
      <div className="audit-section-head">
        <div><span>REVIEW</span><h2>{title}</h2><p>Preview only. The Safe Cleanup action applies the conservative policy described above.</p></div>
      </div>
      <div className="integrity-duplicate-list">
        {groups.slice(0, 20).map((group, index) => (
          <div className="integrity-duplicate-group" key={`${group.keep}-${index}`}>
            <div className="integrity-duplicate-head">
              <div><strong>Keep: {group.keep}</strong><span>{group.records?.length || 0} records</span></div>
              {onDeleteMember && <small>Delete only the records marked duplicate below.</small>}
            </div>
            {(group.records || []).map((record) => (
              <div className="integrity-record" key={record.id}>
                <span>{record.name || "Unnamed"}</span>
                <small>{record.email || record.id} · {record.status || "—"} {record.id === group.keep ? "· CANONICAL" : "· DUPLICATE"}</small>
                {onDeleteMember && record.id !== group.keep && <button type="button" className="portal-btn danger" disabled={deletingId === record.id} onClick={() => onDeleteMember(record.id, record.name)}><Trash2 size={14} />{deletingId === record.id ? "Deleting…" : "Delete duplicate"}</button>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
