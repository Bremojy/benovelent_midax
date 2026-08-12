import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  Printer,
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
  ["selfConversations", "Self-conversations"],
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
  const [cleaningCarousels, setCleaningCarousels] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await API.get("/superadmin/data-integrity", {
        params: { _ts: Date.now() },
      });
      setReport(data?.report || null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to inspect database.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const downloadBackup = async () => {
    try {
      setError("");
      setMessage("");
      const { data, headers } = await API.get("/superadmin/data-integrity/backup", {
        params: { _ts: Date.now() },
        responseType: "blob",
        timeout: 120000,
      });
      const blob = new Blob([data], { type: headers["content-type"] || "application/json" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const disposition = headers["content-disposition"] || "";
      const match = disposition.match(/filename="?([^";]+)"?/i);
      anchor.href = url;
      anchor.download = match?.[1] || `benevolent-midax-database-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      setMessage("Database backup downloaded successfully. Credential and token fields were redacted for security.");
    } catch (err) {
      // Axios returns a Blob for errors when responseType is blob.
      let serverMessage = "Unable to create the database backup.";
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          serverMessage = parsed?.message || serverMessage;
        } catch (_) {
          // Keep the friendly fallback.
        }
      } else {
        serverMessage = err.response?.data?.message || err.message || serverMessage;
      }
      setError(serverMessage);
    }
  };

  const printReport = () => {
    if (!report) {
      setError("Run a database scan before printing the report.");
      return;
    }
    const popup = window.open("", "benevolentIntegrityPrint", "width=1200,height=850");
    if (!popup) {
      setError("Your browser blocked the print window. Allow pop-ups for this site and try again.");
      return;
    }

    const safe = (value) => String(value ?? "").replace(/[&<>\"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
    }[character]));
    const countRows = COUNT_ITEMS.map(([key, label]) => `<tr><th>${safe(label)}</th><td>${safe(report.counts?.[key] ?? 0)}</td></tr>`).join("");
    const renderGroups = (title, groups = []) => groups?.length
      ? `<h2>${safe(title)}</h2><table><thead><tr><th>Group</th><th>Record</th><th>Email / ID</th><th>Status</th></tr></thead><tbody>${groups.slice(0, 500).flatMap((group) => (group.records || []).map((record) => `<tr><td>${safe(group.keep)}</td><td>${safe(record.name || "Unnamed")}</td><td>${safe(record.email || record.id)}</td><td>${safe(record.status || "—")}${record.id === group.keep ? " · CANONICAL" : " · DUPLICATE"}</td></tr>`)).join("")}</tbody></table>`
      : `<h2>${safe(title)}</h2><p>None found.</p>`;

    popup.document.write(`<!doctype html><html><head><title>Benevolent Midax — Database Integrity Report</title><style>@page{size:A4;margin:14mm}body{font-family:Arial,sans-serif;color:#202124;margin:0}header{border-bottom:3px solid #ef7d00;padding-bottom:14px;margin-bottom:18px}h1{margin:0 0 4px;font-size:24px}h2{margin:24px 0 8px;font-size:16px}p{line-height:1.5;color:#50555c}.meta{font-size:12px;color:#6b7280}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border-bottom:1px solid #ddd;padding:7px;text-align:left;vertical-align:top;font-size:11px}th{background:#f5f5f5;text-transform:uppercase;letter-spacing:.04em}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}section{break-inside:avoid}.warning{padding:10px;border:1px solid #f0c36d;background:#fff8e8;border-radius:8px}</style></head><body><header><h1>Benovelent Midax — Database Integrity & Governance</h1><div class="meta">Generated: ${safe(new Date(report.generatedAt || Date.now()).toLocaleString("en-KE"))}</div><div class="meta">Database: ${safe(report.database?.name || "Connected application database")}</div></header><p>This is a printable integrity snapshot. The downloadable database backup is available separately from the SuperAdmin page.</p><section><h2>Live database footprint</h2><table>${countRows}</table></section>${renderGroups("Duplicate member groups", report.duplicateMembers)}${renderGroups("Duplicate administrator groups", report.duplicateAdmins)}${renderGroups("Duplicate conversations", report.duplicateConversations?.map((x) => ({keep:x.keep,records:[{id:x.keep,name:"Canonical conversation",status:"keep"},...x.remove.map(id=>({id,name:"Duplicate conversation",status:"remove"}))]})))}${renderGroups("Duplicate carousel groups", report.duplicateCarousels?.map((x) => ({keep:x.keep,records:[{id:x.keep,name:x.title || "Carousel slide",status:"keep"},...x.remove.map(id=>({id,name:x.title || "Duplicate slide",status:"remove"}))]})))}<section><h2>Additional findings</h2><div class="warning">Self-conversations: ${safe(report.selfConversations?.length || 0)} · Orphan conversations: ${safe(report.orphanConversations?.length || 0)} · Orphan messages: ${safe(report.orphanMessages?.length || 0)} · Cross-collection identity collisions: ${safe(report.identityCollisions?.length || 0)}</div></section><script>window.onload=()=>{window.print()};</script></body></html>`);
    popup.document.close();
    popup.focus();
  };

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
        await load();
        setMessage("The database changed before deletion. The live integrity report has been refreshed; use the current action shown now.");
        setError("");
      } else {
        setError((err.response?.data?.message || err.message || "Unable to delete duplicate member.") + detail);
      }
    } finally {
      setDeletingId("");
    }
  };

  const cleanCarouselDuplicates = async () => {
    const confirmed = window.confirm(
      "Remove only duplicate carousel slides? The newest matching slide will be kept. Other member, finance and chat records will not be changed."
    );
    if (!confirmed) return;

    try {
      setCleaningCarousels(true);
      setError("");
      setMessage("");
      const { data } = await API.post("/superadmin/data-integrity/cleanup/carousels");
      setReport(data?.report || null);
      setMessage(data?.message || "Carousel cleanup completed.");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Carousel cleanup failed.");
    } finally {
      setCleaningCarousels(false);
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
      c.selfConversations ||
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
              Inspect stale accounts, duplicate chats, self-conversations, orphaned records and duplicate carousel content before making any changes.
            </p>
          </div>
          <div className="integrity-actions">
            <button className="portal-btn" onClick={load} disabled={loading || cleaning}>
              <RefreshCw size={16} className={loading ? "spin" : ""} />
              {loading ? "Scanning..." : "Scan Again"}
            </button>
            <button className="portal-btn light" onClick={cleanCarouselDuplicates} disabled={loading || cleaning || cleaningCarousels || !(report?.counts?.duplicateCarouselGroups)}>
              <Trash2 size={16} />
              {cleaningCarousels ? "Cleaning carousel..." : "Clean carousel duplicates"}
            </button>
            <button className="portal-btn primary" onClick={runCleanup} disabled={loading || cleaning || cleaningCarousels || health === "clean"}>
              <Sparkles size={16} />
              {cleaning ? "Cleaning..." : "Run Safe Cleanup"}
            </button>
            <button className="portal-btn light" onClick={downloadBackup} disabled={loading || cleaning || cleaningCarousels}>
              <Download size={16} />
              Backup database
            </button>
            <button className="portal-btn light" onClick={printReport} disabled={!report || loading || cleaning || cleaningCarousels}>
              <Printer size={16} />
              Print report
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

        <section className="portal-panel integrity-database-panel">
          <div className="audit-section-head">
            <div>
              <span>DATABASE CONNECTION</span>
              <h2>{report?.database?.connected ? "Live database connected" : "Database connection unavailable"}</h2>
              <p>{report?.database?.name ? `Database: ${report.database.name}` : "The page reads the same MongoDB connection used by the running backend."}</p>
            </div>
          </div>
          <div className="integrity-permission-grid">
            <Permission title="Inspect" text="View live integrity counts and problem records directly from MongoDB." />
            <Permission title="Clean" text="Run protected cleanup operations without touching finance/support references." />
            <Permission title="Backup" text="Download an application-data snapshot with credential/token fields redacted." />
            <Permission title="Print" text="Print the live integrity report for governance and filing." />
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
        <DuplicatePreview title="Self-conversations" groups={report?.selfConversations?.map((x) => ({
          keep: "REMOVE",
          records: [{ id: x.id, name: "Self-conversation", status: "invalid" }],
        }))} />
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

function Permission({ title, text }) {
  return (
    <article className="integrity-permission">
      <strong>{title}</strong>
      <p>{text}</p>
    </article>
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
