import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  ClipboardList,
  HandHeart,
  MessageCircle,
  Newspaper,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  UserCheck,
  UserX,
  Ban,
} from "lucide-react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  getAdminDashboard,
  getRecentMembers,
  getContributionSummary,
} from "../../services/adminService";
import "./AdminDashboard.css";
import "../../styles/portalModule.css";

const money = (value) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export default function AdminDashboard() {
  const [stats, setStats] = useState({});
  const [recent, setRecent] = useState([]);
  const [contrib, setContrib] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const [dashboardResponse, r, c] = await Promise.all([
        getAdminDashboard(),
        getRecentMembers(),
        getContributionSummary(),
      ]);
      const liveDashboard = dashboardResponse?.dashboard || {};
      setStats(liveDashboard);
      setRecent((r?.members || r?.recentMembers || []).map((member) => ({
        ...member,
        profileCompletion: member.profileCompletion ?? 0,
      })));
      setContrib(c?.summary || c || {});
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Unable to load administrator dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const val = (...keys) => {
    for (const key of keys) if (stats?.[key] !== undefined) return stats[key];
    return 0;
  };

  const pulse = useMemo(
    () => [
      { label: "Live members", value: val("onlineMembers"), icon: Users },
      { label: "Pending support", value: stats.pendingSupport?.total || 0, icon: HandHeart },
      { label: "Unread notifications", value: stats.unreadNotifications || 0, icon: Bell },
      { label: "Published news", value: stats.publishedNews || 0, icon: Newspaper },
      { label: "Active feedback", value: stats.activeFeedbackCollections || 0, icon: ClipboardList },
      { label: "Feedback responses", value: stats.feedbackResponses || 0, icon: MessageCircle },
    ],
    [stats]
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="portal-loading-card"><RefreshCw className="spinning" size={20} /> Loading your admin control centre…</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="admin-dashboard v7-portal">
        <section className="portal-hero admin-hero">
          <div className="portal-hero-copy">
            <span className="portal-kicker"><Sparkles size={14} /> OPERATIONS · PEOPLE · ACTION</span>
            <h1>Run Benovelent MIDAX with clarity.</h1>
            <p>One live workspace for members, support, communication and daily administration.</p>
            <div className="portal-hero-actions">
              <Link className="portal-primary-btn" to="/admin/members"><Users size={17} /> Manage members</Link>
              <Link className="portal-secondary-btn" to="/admin/support"><HandHeart size={17} /> Review support</Link>
              <button className="portal-ghost-btn" onClick={load}><RefreshCw size={16} /> Refresh</button>
            </div>
          </div>
          <div className="portal-hero-orbit" aria-hidden="true">
            <div className="orbit-glow" />
            <div className="orbit-card"><Activity size={18} /><span>LIVE PRESENCE</span><strong>{stats.onlineMembers || 0}</strong><small>members currently online</small></div>
            <div className="orbit-mini"><CheckCircle2 size={16} /> System active</div>
          </div>
        </section>

        {error && <div className="portal-alert">{error}</div>}

        {stats.adminProfile && <section className="portal-panel modern-panel admin-role-card" style={{ marginBottom: 18 }}><div className="panel-heading"><div><span className="panel-kicker">CONSTITUTION LEADERSHIP ROLE</span><h2>Registered role</h2><p>This is the role assigned to your administrator account by SuperAdmin.</p></div><ShieldCheck size={22} /></div><div className="admin-role-highlight"><strong>{stats.adminProfile.registeredRole || "Administrator"}</strong><span>{stats.adminProfile.name || "Administrator"} · {String(stats.adminProfile.role || "admin").toUpperCase()}</span></div></section>}

        <section className="portal-metric-grid four">
          <Metric icon={<Users />} label="Total members" value={val("totalMembers", "total", "count")} caption={`${val("activeMembers", "active")} active`} />
          <Metric icon={<Wallet />} label="Book balance" value={money(val("bookBalance"))} caption={`${val("verifiedMembers")} verified members`} tone="violet" />
          <Metric icon={<HandHeart />} label="Support cases" value={val("approvedClaims")} caption={`${stats.pendingSupport?.total || 0} pending`} tone="green" />
          <Metric icon={<MessageCircle />} label="Communication" value={stats.feedbackResponses || 0} caption={`${stats.unreadNotifications || 0} unread notifications`} tone="blue" />
        </section>

        <section className="portal-panel modern-panel" style={{ marginBottom: 18 }}>
          <div className="panel-heading"><div><span className="panel-kicker">OTHER PAGES</span><h2>Supporting administration tools</h2><p>Secondary workspace pages are available here without crowding the primary sidebar.</p></div></div>
          <div className="quick-action-grid">
            <Quick href="/admin/notifications" icon={<Bell />} title="Notifications" text="Review alerts and broadcast history." />
            <Quick href="/admin/announcements" icon={<Newspaper />} title="Announcements" text="Publish public news and picture updates directly to the News page." />
            <Quick href="/admin/polls" icon={<ClipboardList />} title="Polls" text="Manage and review scheme polls." />
            <Quick href="/admin/feedback" icon={<MessageCircle />} title="Feedback" text="Review collections and responses." />
            <Quick href="/admin/settings" icon={<ShieldCheck />} title="Settings" text="Manage preferences and security." />
          </div>
        </section>

        <section className="portal-grid two">
          <article className="portal-panel modern-panel">
            <div className="panel-heading">
              <div><span className="panel-kicker">MEMBERSHIP PULSE</span><h2>Know what needs attention.</h2><p>Current membership health from the live admin API.</p></div>
              <Link to="/admin/members" className="panel-link">Open <ArrowUpRight size={16} /></Link>
            </div>
            <div className="pulse-list">
              <PulseRow icon={<UserCheck />} label="Active members" value={val("activeMembers", "active")} tone="green" />
              <PulseRow icon={<UserX />} label="Incomplete profiles" value={val("incompleteProfiles")} tone="amber" />
              <PulseRow icon={<Ban />} label="Suspended" value={val("suspendedMembers", "suspended")} tone="rose" />
              <PulseRow icon={<ShieldCheck />} label="Approved support cases" value={val("approvedClaims")} tone="violet" />
            </div>
          </article>

          <article className="portal-panel modern-panel admin-live-panel-v7">
            <div className="panel-heading">
              <div><span className="panel-kicker">LIVE CONTROL CENTRE</span><h2>The portal, right now.</h2><p>Quick signals across operations.</p></div>
            </div>
            <div className="live-signal-grid">
              {pulse.map(({ label, value, icon: Icon }) => (
                <div className="live-signal" key={label}><div className="signal-icon"><Icon size={16} /></div><div><strong>{value}</strong><span>{label}</span></div></div>
              ))}
            </div>
          </article>
        </section>

        <section className="portal-panel modern-panel">
          <div className="panel-heading"><div><span className="panel-kicker">WORKSPACE</span><h2>Quick actions</h2><p>Jump straight into the work that matters.</p></div></div>
          <div className="quick-action-grid">
            <Quick href="/admin/members" icon={<Users />} title="Members" text="Create, edit and manage accounts." />
            <Quick href="/admin/finance" icon={<Wallet />} title="Payroll & Accounts" text="Run the shared monthly deduction and review the scheme ledger." />
            <Quick href="/admin/claims" icon={<HandHeart />} title="Claims" text="Review assistance applications." />
            <Quick href="/admin/messages" icon={<MessageCircle />} title="Message centre" text="Continue active conversations." />
            <Quick href="/admin/notifications" icon={<Bell />} title="Notifications" text="Check alerts and broadcasts." />
            <Quick href="/admin/support" icon={<ClipboardList />} title="Support desk" text="Process member support cases." />
          </div>
        </section>

        <section className="portal-grid two">
          <article className="portal-panel modern-panel">
            <div className="panel-heading"><div><span className="panel-kicker">RECENT MEMBERS</span><h2>Latest registrations</h2></div><Link to="/admin/members" className="panel-link">View all <ArrowUpRight size={16} /></Link></div>
            <div className="activity-list">
              {recent.slice(0, 6).map((member, index) => (
                <div className="activity-row" key={member._id || index}>
                  <div className="activity-avatar">{(member.fullName || "M").split(" ").map(x => x[0]).join("").slice(0,2).toUpperCase()}</div>
                  <div className="activity-copy"><strong>{member.fullName || "Member"}</strong><span>{member.memberNumber || "No member number"} · {member.email || "No email"}</span></div>
                  <span className="status-pill">{member.status || "Active"}</span>
                </div>
              ))}
              {recent.length === 0 && <div className="portal-empty">No recent registrations returned.</div>}
            </div>
          </article>
          <article className="portal-panel modern-panel">
            <div className="panel-heading"><div><span className="panel-kicker">FINANCIAL SNAPSHOT</span><h2>Contribution pulse</h2></div><Link to="/admin/finance" className="panel-link">Open finance <ArrowUpRight size={16} /></Link></div>
            <div className="finance-hero"><span>Scheme contributions collected</span><strong>{money(contrib.totalCollected || contrib.totalContributions || contrib.total || 0)}</strong><small>Admin-managed payroll deductions recorded for the scheme.</small></div>
            <div className="finance-mini-grid">
              <div><span>This month</span><strong>{money(contrib.collectedThisMonth || contrib.monthlyContributions || contrib.thisMonth || 0)}</strong></div>
              <div><span>Standard deduction</span><strong>{money(contrib.standardMonthlyDeduction)}</strong></div>
              <div><span>Members charged</span><strong>{contrib.membersChargedThisMonth || 0}</strong></div>
              <div><span>Approved cases</span><strong>{val("approvedClaims")}</strong></div>
            </div>
          </article>
        </section>
      </div>
    </DashboardLayout>
  );
}

function Metric({ icon, label, value, caption, tone = "orange" }) {
  return <div className={`portal-metric tone-${tone}`}><div className="metric-icon">{icon}</div><div className="metric-copy"><span>{label}</span><strong>{value}</strong><small>{caption}</small></div></div>;
}

function PulseRow({ icon, label, value, tone }) {
  return <div className="pulse-row"><div className={`pulse-icon ${tone}`}>{icon}</div><span>{label}</span><strong>{value}</strong></div>;
}

function Quick({ href, icon, title, text }) {
  return <Link className="quick-action-v7" to={href}><div className="quick-icon">{icon}</div><div><strong>{title}</strong><span>{text}</span></div><ArrowUpRight size={17} /></Link>;
}
