import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../services/api";
import "../../styles/portalModule.css";

export default function SuperAdminAudit() {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({});
  const [coverage, setCoverage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const [s, l, c] = await Promise.all([
        API.get("/audit-logs/summary"),
        API.get("/audit-logs", { params: { page: 1, limit: 100 } }),
        API.get("/audit-logs/coverage"),
      ]);
      setSummary(s.data?.summary || s.data || {});
      setLogs(Array.isArray(l.data?.logs) ? l.data.logs : []);
      setCoverage(c.data || null);
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Unable to load audit records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredCoverage = useMemo(() => {
    const items = Array.isArray(coverage?.coverage) ? coverage.coverage : [];
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesRole = role === "all" || item.role === role;
      const matchesQuery = !q || [item.name, item.email, item.memberNumber, item.role].join(" ").toLowerCase().includes(q);
      return matchesRole && matchesQuery;
    });
  }, [coverage, query, role]);

  const deleteLog = async (id) => {
    if (!window.confirm("Delete this audit record?")) return;
    try {
      await API.delete(`/audit-logs/${id}`);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Unable to delete audit record.");
    }
  };

  return (
    <DashboardLayout>
      <div className="portal-module audit-page">
        <header className="portal-module-header">
          <div>
            <span>SYSTEM GOVERNANCE</span>
            <h1>Audit</h1>
            <p>Review important actions and confirm every member/leader account is represented.</p>
          </div>
          <button className="portal-btn" onClick={load}>{loading ? "Refreshing..." : "Refresh"}</button>
        </header>

        {error && <div className="portal-alert">{error}</div>}

        <div className="portal-stat-grid">
          <Stat label="Total Logs" value={summary.total || logs.length} />
          <Stat label="Today" value={summary.today ?? summary.todayLogs ?? 0} />
          <Stat label="Successful" value={summary.successful ?? 0} />
          <Stat label="Failed" value={summary.failed ?? 0} />
        </div>

        <section className="portal-panel audit-constitution-panel">
          <div className="audit-section-head">
            <div>
              <span>CONSTITUTION COVERAGE</span>
              <h2>Leadership represented in the constitution</h2>
              <p>{coverage?.constitution?.memberNote || "Loading constitution coverage..."}</p>
            </div>
            <div className="audit-counts">
              <span>{coverage?.counts?.members || 0} members</span>
              <span>{coverage?.counts?.admins || 0} leaders/admins</span>
            </div>
          </div>
          <div className="audit-leadership-grid">
            {(coverage?.constitution?.leadership || []).map((leader) => (
              <article className="audit-leader-card" key={`${leader.position}-${leader.name}`}>
                <span>{leader.position}</span>
                <strong>{leader.name}</strong>
                <small className={leader.matchedAccountId ? "matched" : "unmatched"}>
                  {leader.matchedAccountId ? `Matched account: ${leader.matchedAccountName}` : "No matching admin account found yet"}
                </small>
                <em>{leader.auditCount || 0} audit records</em>
              </article>
            ))}
          </div>
        </section>

        <section className="portal-panel">
          <div className="audit-section-head audit-directory-head">
            <div>
              <span>ACCOUNT COVERAGE</span>
              <h2>Every registered member and administrator</h2>
              <p>An account remains visible even when it has zero audit records, so missing activity is not mistaken for a missing person.</p>
            </div>
            <div className="audit-filters">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email or member no." aria-label="Search audit coverage" />
              <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filter audit coverage by role">
                <option value="all">All roles</option>
                <option value="member">Members</option>
                <option value="admin">Leaders/Admins</option>
                <option value="superadmin">SuperAdmins</option>
              </select>
            </div>
          </div>

          {loading ? <div className="portal-empty">Loading account coverage...</div> : filteredCoverage.length === 0 ? (
            <div className="portal-empty">No matching accounts found.</div>
          ) : (
            <div className="portal-table-wrap audit-coverage-table-wrap">
              <table className="portal-table audit-coverage-table">
                <thead><tr><th>Person</th><th>Role</th><th>Status</th><th>Audit records</th><th>Last action</th></tr></thead>
                <tbody>
                  {filteredCoverage.map((item) => (
                    <tr key={`${item.role}-${item.id}`}>
                      <td data-label="Person"><strong>{item.name}</strong><small>{item.email}{item.memberNumber ? ` · ${item.memberNumber}` : ""}</small></td>
                      <td data-label="Role"><span className="portal-badge">{labelRole(item.role)}</span></td>
                      <td data-label="Status">{item.status || "active"}</td>
                      <td data-label="Audit records"><strong>{item.audit.total}</strong><small>{item.audit.failed ? `${item.audit.failed} failed` : "No failed events"}</small></td>
                      <td data-label="Last action">{item.audit.last ? `${item.audit.last.action || "Activity"} · ${date(item.audit.last.createdAt)}` : "No audit activity yet"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="portal-panel">
          <div className="audit-section-head">
            <div><span>ACTIVITY LOG</span><h2>Recent audit events</h2><p>Action-level history generated by the backend audit system.</p></div>
          </div>
          {loading ? <div className="portal-empty">Loading audit logs...</div> : logs.length === 0 ? <div className="portal-empty">No audit records found.</div> : (
            <div className="portal-table-wrap">
              <table className="portal-table audit-log-table">
                <thead><tr><th>Time</th><th>User</th><th>Role</th><th>Action</th><th>Module</th><th>Description</th><th /></tr></thead>
                <tbody>{logs.slice(0, 100).map((x, i) => (
                  <tr key={x._id || i}>
                    <td data-label="Time">{date(x.createdAt)}</td>
                    <td data-label="User">{x.user?.fullName || x.user?.email || "System"}</td>
                    <td data-label="Role">{x.userRole || "—"}</td>
                    <td data-label="Action"><span className="portal-badge">{x.action || "—"}</span></td>
                    <td data-label="Module">{x.module || "—"}</td>
                    <td data-label="Description">{x.description || "—"}</td>
                    <td data-label="Actions">{x._id && <button className="portal-btn danger" onClick={() => deleteLog(x._id)}>Delete</button>}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}

function Stat({ label, value }) { return <div className="portal-stat"><span>{label}</span><strong>{value}</strong></div>; }
function labelRole(role) { return role === "superadmin" ? "SuperAdmin" : role === "admin" ? "Leader/Admin" : "Member"; }
const date = (value) => value ? new Date(value).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" }) : "—";
