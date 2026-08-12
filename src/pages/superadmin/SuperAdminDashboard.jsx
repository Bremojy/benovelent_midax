import { useEffect, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  DatabaseZap,
  Gauge,
  HandHeart,
  MessageCircle,
  Newspaper,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  UserCog,
  UserPlus,
  Wallet,
} from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../services/api";
import { getSuperAdminAdminStatistics, getSuperAdmins, getSuperAdminPortalOverview } from "../../services/superAdminService";
import "./SuperAdminDashboard.css";

const money = (value) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(Number(value || 0));

export default function SuperAdminDashboard() {
  const [statistics, setStatistics] = useState({ total: 0, active: 0, inactive: 0, suspended: 0 });
  const [recentAdmins, setRecentAdmins] = useState([]);
  const [systemOnline, setSystemOnline] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");
      const [statisticsResponse, adminsResponse, systemResponse, overviewResponse] = await Promise.all([
        getSuperAdminAdminStatistics(),
        getSuperAdmins({ page: 1, limit: 5 }),
        API.get("/superadmin/system/status").catch(() => null),
        getSuperAdminPortalOverview().catch(() => null),
      ]);
      setSystemOnline(Boolean(systemResponse?.data?.success));
      setOverview(overviewResponse?.overview || null);
      if (statisticsResponse?.success) setStatistics(statisticsResponse.statistics || {});
      if (adminsResponse?.success) setRecentAdmins(Array.isArray(adminsResponse.admins) ? adminsResponse.admins : []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDashboard(); }, []);

  return (
    <DashboardLayout>
      <div className="superadmin-dashboard v7-portal">
        <section className="portal-hero superadmin-hero">
          <div className="portal-hero-copy">
            <span className="portal-kicker"><Sparkles size={14} /> GOVERNANCE · INTELLIGENCE · CONTROL</span>
            <h1>The Benovelent MIDAX control room.</h1>
            <p>See the whole platform at a glance, protect the data, and move quickly when something needs your attention.</p>
            <div className="portal-hero-actions">
              <a className="portal-primary-btn super-primary" href="/superadmin/data-integrity"><DatabaseZap size={17} /> Data integrity</a>
              <a className="portal-secondary-btn" href="/superadmin/admins"><UserPlus size={17} /> Add administrator</a>
              <button className="portal-ghost-btn" onClick={loadDashboard} disabled={loading}><RefreshCw size={16} /> {loading ? "Refreshing…" : "Refresh"}</button>
            </div>
          </div>
          <div className="control-room-orbit" aria-hidden="true">
            <div className="control-orbit-core"><Gauge size={29} /><span>CONTROL</span><strong>{statistics.total}</strong><small>administrators</small></div>
            <div className="control-float one"><ShieldCheck size={15} /> Protected</div>
            <div className="control-float two"><Activity size={15} /> Live</div>
          </div>
        </section>

        {error && <div className="portal-alert"><ShieldAlert size={18} /> {error}</div>}

        <section className="portal-metric-grid six">
          <Metric label="Members" value={overview?.members?.total ?? 0} caption={`${overview?.members?.online ?? 0} online`} icon={<Users />} />
          <Metric label="Support cases" value={overview?.support?.pending ?? 0} caption="pending" icon={<HandHeart />} tone="green" />
          <Metric label="Administrators" value={overview?.leadership?.administrators ?? statistics.total} caption={`${overview?.leadership?.activeAdministrators ?? statistics.active} active`} icon={<UserCog />} tone="violet" />
          <Metric label="Messages" value={overview?.communication?.messages ?? 0} caption={`${overview?.communication?.conversations ?? 0} conversations`} icon={<MessageCircle />} tone="blue" />
          <Metric label="Published news" value={overview?.content?.publishedNews ?? 0} caption="live content" icon={<Newspaper />} tone="rose" />
          <Metric label="Book balance" value={money(overview?.finance?.bookBalance)} caption="live finance snapshot" icon={<Wallet />} tone="amber" />
        </section>

        <section className="portal-panel control-strip-v7">
          <div className="panel-heading"><div><span className="panel-kicker">CONTROL CENTRE</span><h2>Everything important, one layer away.</h2><p>Use these direct tools without hunting through menus.</p></div></div>
          <div className="control-tool-grid">
            <Tool href="/superadmin/data-integrity" icon={<DatabaseZap />} title="Database integrity" text="Scan, review, clean and backup live data." />
            <Tool href="/superadmin/admins" icon={<UserCog />} title="Administrators" text="Manage roles, accounts and access." />
            <Tool href="/superadmin/members" icon={<Users />} title="Members" text="Inspect member identity and activity." />
            <Tool href="/superadmin/accounts" icon={<Wallet />} title="Accounts & finance" text="View system-wide financial activity." />
            <Tool href="/superadmin/audit" icon={<ShieldCheck />} title="Audit logs" text="Trace important system actions." />
            <Tool href="/superadmin/settings" icon={<Gauge />} title="System settings" text="Control portal-wide configuration." />
          </div>
        </section>

        <section className="portal-grid two super-main-grid">
          <article className="portal-panel modern-panel">
            <div className="panel-heading"><div><span className="panel-kicker">LIVE PLATFORM HEALTH</span><h2>Signals across the system.</h2><p>Current operational indicators from the live portal API.</p></div></div>
            <div className="health-list">
              <HealthRow label="System connection" value={systemOnline === null ? "Checking" : systemOnline ? "Operational" : "Needs attention"} good={systemOnline !== false} />
              <HealthRow label="Active administrators" value={statistics.active} good={true} />
              <HealthRow label="Suspended administrators" value={statistics.suspended} good={statistics.suspended === 0} />
              <HealthRow label="Pending support" value={overview?.support?.pending ?? 0} good={(overview?.support?.pending ?? 0) < 10} />
            </div>
          </article>

          <article className="portal-panel modern-panel">
            <div className="panel-heading"><div><span className="panel-kicker">PWA · V6 FOUNDATION</span><h2>Benovelent MIDAX app status.</h2><p>Keep the installation experience visible and healthy.</p></div><button className="panel-link button-link" onClick={() => window.dispatchEvent(new Event("benovelent:open-install"))}>Install / Help <ArrowUpRight size={16} /></button></div>
            <div className="pwa-status-modern">
              <div><span>Display mode</span><strong>{window.matchMedia?.("(display-mode: standalone)")?.matches ? "Installed" : "Browser"}</strong></div>
              <div><span>Service worker</span><strong>{"serviceWorker" in navigator ? "Supported" : "Unavailable"}</strong></div>
              <div><span>Manifest</span><strong>Configured</strong></div>
              <div><span>App name</span><strong>Benovelent MIDAX</strong></div>
            </div>
          </article>
        </section>

        <section className="portal-grid two">
          <article className="portal-panel modern-panel">
            <div className="panel-heading"><div><span className="panel-kicker">ADMINISTRATION</span><h2>Recent administrators</h2></div><a className="panel-link" href="/superadmin/admins">View all <ArrowUpRight size={16} /></a></div>
            <div className="activity-list">
              {recentAdmins.map((admin, index) => <div className="activity-row" key={admin._id || index}><div className="activity-avatar violet">{getInitials(admin.fullName || admin.name)}</div><div className="activity-copy"><strong>{admin.fullName || admin.name || "Administrator"}</strong><span>{admin.email || "No email"}</span></div><span className="status-pill">{capitalize(admin.status || "active")}</span></div>)}
              {!recentAdmins.length && <div className="portal-empty">No administrators returned.</div>}
            </div>
          </article>

          <article className="portal-panel modern-panel">
            <div className="panel-heading"><div><span className="panel-kicker">RECENT CONTEXT</span><h2>What deserves a look.</h2></div></div>
            <div className="context-card-grid">
              <ContextCard label="Cross-collection collisions" value={overview?.integrity?.crossCollectionCollisions ?? 0} tone="rose" />
              <ContextCard label="Duplicate members" value={overview?.integrity?.duplicateMemberGroups ?? 0} tone="amber" />
              <ContextCard label="Self-conversations" value={overview?.integrity?.selfConversations ?? 0} tone="violet" />
              <ContextCard label="Duplicate carousels" value={overview?.integrity?.duplicateCarouselGroups ?? 0} tone="blue" />
            </div>
          </article>
        </section>
      </div>
    </DashboardLayout>
  );
}

function Metric({ icon, label, value, caption, tone = "orange" }) { return <div className={`portal-metric tone-${tone}`}><div className="metric-icon">{icon}</div><div className="metric-copy"><span>{label}</span><strong>{value}</strong><small>{caption}</small></div></div>; }
function Tool({ href, icon, title, text }) { return <a className="control-tool" href={href}><div className="control-tool-icon">{icon}</div><div><strong>{title}</strong><span>{text}</span></div><ArrowUpRight size={16} /></a>; }
function HealthRow({ label, value, good }) { return <div className="health-row"><span>{label}</span><div><span className={`health-dot ${good ? "good" : "bad"}`} /> <strong>{value}</strong></div></div>; }
function ContextCard({ label, value, tone }) { return <div className={`context-card ${tone}`}><span>{label}</span><strong>{value}</strong><small>Integrity signal</small></div>; }
function getInitials(name) { return (name || "A").split(" ").filter(Boolean).slice(0,2).map(x => x[0]?.toUpperCase()).join(""); }
function capitalize(value) { const s = String(value); return s.charAt(0).toUpperCase() + s.slice(1); }
