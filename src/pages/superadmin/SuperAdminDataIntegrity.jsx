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
  ["members", "Live scheme members"],
  ["rawMemberCollectionDocuments", "Raw Member collection documents"],
  ["archivedMemberRecords", "Archived member records"],
  ["legacyPortalProfiles", "Legacy admin chat profiles"],
  ["invalidMemberNumbers", "Invalid/legacy member numbers"],
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
  const [reconciliation, setReconciliation] = useState(null);
  const [reconLoading, setReconLoading] = useState(false);

  const liveMembers = Array.isArray(reconciliation?.liveMembers) ? reconciliation.liveMembers : [];
  const archivedMembers = Array.isArray(reconciliation?.archivedMembers) ? reconciliation.archivedMembers : [];
  const portalChatProfiles = Array.isArray(reconciliation?.portalChatProfiles) ? reconciliation.portalChatProfiles : [];

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

  const loadReconciliation = async () => {
    try {
      setReconLoading(true);
      setError("");
      const { data } = await API.get("/superadmin/data-integrity/members-reconciliation", {
        params: { _ts: Date.now() },
      });
      setReconciliation(data || null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to reconcile live member records.");
    } finally {
      setReconLoading(false);
    }
  };

  const downloadHumanBackup = async () => {
    try {
      setError("");
      setMessage("");
      const { data, headers } = await API.get("/superadmin/data-integrity/backup/human", {
        params: { _ts: Date.now() },
        responseType: "blob",
        timeout: 120000,
      });
      const blob = new Blob([data], { type: headers["content-type"] || "text/html" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const disposition = headers["content-disposition"] || "";
      const match = disposition.match(/filename="?([^";]+)"?/i);
      anchor.href = url;
      anchor.download = match?.[1] || `benevolent-midax-human-backup-${new Date().toISOString().slice(0, 10)}.html`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      setMessage("Human-readable backup downloaded. It can be opened, printed or stored offline.");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to create human-readable backup.");
    }
  };

  const printHumanBackup = async () => {
    try {
      setError("");
      const { data } = await API.get("/superadmin/data-integrity/backup/human/print", {
        responseType: "text",
        timeout: 120000,
        params: { _ts: Date.now() },
      });
      const popup = window.open("", "benevolentHumanBackupPrint", "width=1200,height=900");
      if (!popup) {
        setError("Your browser blocked the print window. Allow pop-ups for this site and try again.");
        return;
      }
      popup.document.open();
      popup.document.write(data);
      popup.document.close();
      popup.focus();
      setMessage("Human-readable backup opened for printing.");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to open printable backup.");
    }
  };

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

  const printDatabaseDetails = async () => {
    try {
      setError("");
      const { data } = await API.get("/superadmin/data-integrity/print-database", { responseType: "text", timeout: 120000, params: { _ts: Date.now() } });
      const popup = window.open("", "benevolentDatabasePrint", "width=1400,height=900");
      if (!popup) { setError("Your browser blocked the print window. Allow pop-ups for this site and try again."); return; }
      popup.document.open(); popup.document.write(data); popup.document.close(); popup.focus();
      setMessage("Full live database print view opened. Sensitive credential/token fields are redacted.");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to print the live database.");
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

    popup.document.write(`<!doctype html><html><head><title>Benovelent MIDAX — Database Integrity Report</title><style>@page{size:A4;margin:14mm}body{font-family:Arial,sans-serif;color:#202124;margin:0}header{border-bottom:3px solid #ef7d00;padding-bottom:14px;margin-bottom:18px}h1{margin:0 0 4px;font-size:24px}h2{margin:24px 0 8px;font-size:16px}p{line-height:1.5;color:#50555c}.meta{font-size:12px;color:#6b7280}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border-bottom:1px solid #ddd;padding:7px;text-align:left;vertical-align:top;font-size:11px}th{background:#f5f5f5;text-transform:uppercase;letter-spacing:.04em}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}section{break-inside:avoid}.warning{padding:10px;border:1px solid #f0c36d;background:#fff8e8;border-radius:8px}</style></head><body><header><h1>Benovelent Midax — Database Integrity & Governance</h1><div class="meta">Generated: ${safe(new Date(report.generatedAt || Date.now()).toLocaleString("en-KE"))}</div><div class="meta">Database: ${safe(report.database?.name || "Connected application database")}</div></header><p>This is a printable integrity snapshot. The downloadable database backup is available separately from the SuperAdmin page.</p><section><h2>Live database footprint</h2><table>${countRows}</table></section>${renderGroups("Duplicate member groups", report.duplicateMembers)}${renderGroups("Duplicate administrator groups", report.duplicateAdmins)}${renderGroups("Duplicate conversations", report.duplicateConversations?.map((x) => ({keep:x.keep,records:[{id:x.keep,name:"Canonical conversation",status:"keep"},...x.remove.map(id=>({id,name:"Duplicate conversation",status:"remove"}))]})))}${renderGroups("Duplicate carousel groups", report.duplicateCarousels?.map((x) => ({keep:x.keep,records:[{id:x.keep,name:x.title || "Carousel slide",status:"keep"},...x.remove.map(id=>({id,name:x.title || "Duplicate slide",status:"remove"}))]})))}<section><h2>Additional findings</h2><div class="warning">Self-conversations: ${safe(report.selfConversations?.length || 0)} · Orphan conversations: ${safe(report.orphanConversations?.length || 0)} · Orphan messages: ${safe(report.orphanMessages?.length || 0)} · Cross-collection identity collisions: ${safe(report.identityCollisions?.length || 0)}</div></section><script>window.onload=()=>{window.print()};</script></body></html>`);
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

  const deepScanCarousels = async () => {
    if (!window.confirm("Run a deep carousel scan? The backend will inspect Cloudinary/public image URLs, refresh SHA-256 hashes, then remove only confirmed duplicate slides while keeping the newest copy.")) return;
    try {
      setCleaningCarousels(true); setError(""); setMessage("");
      const { data } = await API.post("/superadmin/data-integrity/cleanup/carousels/deep");
      setReport(data?.report || null);
      setMessage(data?.message || "Deep carousel scan completed.");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Deep carousel scan failed.");
    } finally { setCleaningCarousels(false); }
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

  const runDirectAction = async (path, confirmText, successFallback) => {
    if (!window.confirm(confirmText)) return;
    try {
      setCleaning(true); setError(""); setMessage("");
      const { data } = await API.post(path);
      setReport(data?.report || null);
      setMessage(data?.message || successFallback);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Database action failed.");
    } finally { setCleaning(false); }
  };

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
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
      c.duplicateCarouselGroups ||
      c.invalidMemberNumbers
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
              Inspect stale accounts, duplicate chats, self-conversations, orphaned records and duplicate carousel content before making any changes. Database endpoints are SuperAdmin-only and require the active portal session; use the controls below rather than opening API URLs directly.
            </p>
          </div>
          <div className="integrity-actions">
            <button className="portal-btn" onClick={load} disabled={loading || cleaning}>
              <RefreshCw size={16} className={loading ? "spin" : ""} />
              {loading ? "Scanning..." : "Scan Again"}
            </button>
            <button className="portal-btn light" onClick={cleanCarouselDuplicates} disabled={loading || cleaning || cleaningCarousels}>
              <Trash2 size={16} />
              {cleaningCarousels ? "Cleaning carousel..." : "Clean carousel duplicates"}
            </button>
            <button className="portal-btn light" onClick={deepScanCarousels} disabled={loading || cleaning || cleaningCarousels}>
              <Database size={16} />
              Deep scan carousel
            </button>
            <button className="portal-btn primary" onClick={runCleanup} disabled={loading || cleaning || cleaningCarousels}>
              <Sparkles size={16} />
              {cleaning ? "Cleaning..." : "Run Safe Cleanup"}
            </button>
            <button className="portal-btn light" onClick={downloadHumanBackup} disabled={loading || cleaning || cleaningCarousels}>
              <Download size={16} />
              Human backup
            </button>
            <button className="portal-btn light" onClick={printHumanBackup} disabled={loading || cleaning || cleaningCarousels}>
              <Printer size={16} />
              Print backup
            </button>
            <button className="portal-btn light" onClick={downloadBackup} disabled={loading || cleaning || cleaningCarousels}>
              <Database size={16} />
              Technical JSON
            </button>
            <button className="portal-btn light" onClick={printReport} disabled={!report || loading || cleaning || cleaningCarousels}>
              <Printer size={16} />
              Print report
            </button>
            <button className="portal-btn light" onClick={printDatabaseDetails} disabled={loading || cleaning || cleaningCarousels}>
              <Database size={16} />
              Print all database details
            </button>
            <button className="portal-btn light" onClick={() => scrollToSection("integrity-actions-panel")}>
              <ShieldCheck size={16} />
              All controls
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

        <section id="integrity-database" className="portal-panel integrity-database-panel">
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
              <span>MEMBER DATABASE RECONCILIATION</span>
              <h2>What actually exists in MongoDB?</h2>
              <p>This separates real scheme members from archived records and legacy administrator chat profiles stored in the Member collection.</p>
            </div>
            <button className="portal-btn primary" type="button" onClick={loadReconciliation} disabled={reconLoading}>
              <Database size={16} /> {reconLoading ? "Reading database..." : "Reconcile now"}
            </button>
          </div>
          {reconciliation?.summary && (
            <div className="integrity-count-grid">
              {Object.entries({
                "Raw Member documents": reconciliation.summary.rawMemberCollectionDocuments,
                "Live scheme members": reconciliation.summary.liveMembers,
                "Archived members": reconciliation.summary.archivedMembers,
                "Portal chat profiles": reconciliation.summary.portalChatProfiles,
              }).map(([label, value]) => (
                <div className="integrity-count" key={label}>
                  <span>{label}</span><strong>{value}</strong>
                </div>
              ))}
            </div>
          )}
          {reconciliation?.summary && (
            <div className="portal-panel" style={{ marginTop: 16 }}>
              <div className="audit-section-head">
                <div>
                  <span>LIVE MEMBER RECORDS</span>
                  <h3>{liveMembers.length} current scheme member{liveMembers.length === 1 ? "" : "s"}</h3>
                  <p>Read directly from MongoDB after reconciliation. Administrator/chat profiles are intentionally excluded.</p>
                </div>
              </div>
              {liveMembers.length ? (
                <div className="integrity-record-list">
                  {liveMembers.slice(0, 100).map((member) => (
                    <div className="integrity-record" key={member._id || member.id}>
                      <span>{member.fullName || "Unnamed member"}</span>
                      <small>
                        {member.memberNumber || "NO BM NUMBER"} · {member.email || "no email"} · {member.status || "active"}
                        {member.verified ? " · VERIFIED" : " · NOT VERIFIED"}
                      </small>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="portal-alert success">No live scheme member records currently exist in the Member collection.</div>
              )}
            </div>
          )}

          {reconciliation && (
            <div className="portal-alert success" style={{ marginTop: 16 }}>
              <CheckCircle2 size={18} />
              <span>{report?.databaseReconciliation?.conclusion || "Live member reconciliation completed."}</span>
            </div>
          )}
          {portalChatProfiles.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3>Legacy portal/chat profiles (not members)</h3>
              <div className="integrity-duplicate-list">
                {portalChatProfiles.map((profile) => (
                  <div className="integrity-record" key={profile.id}>
                    <span>{profile.name}</span>
                    <small>{profile.email || profile.id} · role: {profile.role} {profile.portalOwnerRole ? `· owner role: ${profile.portalOwnerRole}` : ""}</small>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(report?.databaseReconciliation?.invalidMemberNumbers || []).length > 0 && (
            <div className="portal-alert warning" style={{ marginTop: 16 }}>
              <AlertTriangle size={18} />
              <span>Legacy member identifiers remain on {report.databaseReconciliation.invalidMemberNumbers.length} live member record(s). Verification will replace these with a generated BM### number, and the next member creation will continue from the highest valid BM sequence.</span>
            </div>
          )}
        </section>

        <section id="integrity-snapshot" className="portal-panel integrity-snapshot-panel">
          <div className="audit-section-head">
            <div>
              <span>LIVE SNAPSHOT · CLICK TO CONTROL</span>
              <h2>Every finding is actionable</h2>
              <p>Select an issue below to jump directly to its safe control.</p>
            </div>
          </div>
          <div className="integrity-action-grid">
            <button type="button" onClick={() => scrollToSection("integrity-duplicates")}><strong>{report?.counts?.duplicateCarouselGroups ?? 0}</strong><span>Carousel duplicates</span></button>
            <button type="button" onClick={() => scrollToSection("integrity-duplicates")}><strong>{report?.counts?.selfConversations ?? 0}</strong><span>Self-conversations</span></button>
            <button type="button" onClick={() => scrollToSection("integrity-duplicates")}><strong>{report?.counts?.orphanConversations ?? 0}</strong><span>Orphan conversations</span></button>
            <button type="button" onClick={() => scrollToSection("integrity-duplicates")}><strong>{report?.counts?.duplicateMemberGroups ?? 0}</strong><span>Duplicate members</span></button>
            <button type="button" onClick={() => scrollToSection("integrity-actions-panel")}><strong>Backup</strong><span>Download database snapshot</span></button>
            <button type="button" onClick={() => scrollToSection("integrity-actions-panel")}><strong>Print</strong><span>Print complete report</span></button>
          </div>
        </section>

        <section id="integrity-actions-panel" className="portal-panel integrity-actions-panel">
          <div className="audit-section-head"><div><span>SUPERADMIN CONTROL ROOM</span><h2>All database controls</h2><p>These actions operate on the live MongoDB database through the protected SuperAdmin API.</p></div></div>
          <div className="integrity-control-grid">
            <button onClick={load} disabled={loading}><RefreshCw size={18}/><span><strong>Refresh live data</strong><small>Re-scan MongoDB now</small></span></button>
            <button onClick={cleanCarouselDuplicates} disabled={cleaningCarousels}><Trash2 size={18}/><span><strong>Clean duplicate carousels</strong><small>Keep newest matching slide</small></span></button>
            <button onClick={deepScanCarousels} disabled={cleaningCarousels}><Database size={18}/><span><strong>Deep scan carousel images</strong><small>Hash Cloudinary/public images before dedupe</small></span></button>
            <button onClick={() => runDirectAction("/superadmin/data-integrity/cleanup/self-conversations", "Remove all self-conversations and their messages?", "Self-conversation cleanup completed.")}><Trash2 size={18}/><span><strong>Remove self-conversations</strong><small>Delete invalid self-chat shells and messages</small></span></button>
            <button onClick={() => runDirectAction("/superadmin/data-integrity/cleanup/orphans", "Remove orphan conversations and messages that no longer have valid owners?", "Orphan cleanup completed.")}><Trash2 size={18}/><span><strong>Clean orphaned chat data</strong><small>Remove records pointing to missing accounts</small></span></button>
            <button onClick={() => runDirectAction("/superadmin/data-integrity/cleanup/member-income", "Remove legacy personal monthly-income fields from member documents?", "Legacy monthly-income fields removed.")}><ShieldCheck size={18}/><span><strong>Remove legacy income field</strong><small>Does not touch finance ledger income</small></span></button>
            <button onClick={downloadBackup} disabled={loading || cleaning}><Download size={18}/><span><strong>Backup entire database</strong><small>All collections, security fields redacted</small></span></button>
            <button onClick={printReport} disabled={!report}><Printer size={18}/><span><strong>Print full report</strong><small>Governance-ready printable snapshot</small></span></button>
            <button onClick={printDatabaseDetails} disabled={loading || cleaning}><Database size={18}/><span><strong>Print all database details</strong><small>Live records with sensitive fields redacted</small></span></button>
            <button onClick={() => scrollToSection("integrity-duplicates")}><Database size={18}/><span><strong>Review all findings</strong><small>Open every detected issue</small></span></button>
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

        <div id="integrity-duplicates"></div><DuplicatePreview title="Duplicate member groups" groups={report?.duplicateMembers} deletingId={deletingId} onDeleteMember={deleteDuplicateMember} />
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
