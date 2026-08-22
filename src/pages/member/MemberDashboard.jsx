import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Bell,
  CheckCircle2,
  HandHeart,
  MessageCircle,
  RefreshCw,
  Sparkles,
  Users,
  WalletCards,
  UserRound,
} from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { getMemberDashboard } from "../../services/memberService";
import API from "../../services/api";
import "./MemberDashboard.css";

const money = (value) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export default function MemberDashboard() {
  const [d, setD] = useState(null);
  const [c, setC] = useState(null);
  const [accounts, setAccounts] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError("");

    let dashboardResponse = null;
    let dashboardError = null;

    // The dashboard should not fail just because one secondary card is slow
    // during a refresh. Retry the primary member payload once, then render
    // whatever non-critical data is available.
    for (let attempt = 0; attempt < 2 && !dashboardResponse; attempt += 1) {
      try {
        dashboardResponse = await getMemberDashboard();
        if (!dashboardResponse?.dashboard) {
          throw new Error(dashboardResponse?.message || "Member dashboard data is unavailable.");
        }
      } catch (error) {
        dashboardError = error;
        if (attempt === 0) {
          await new Promise((resolve) => window.setTimeout(resolve, 900));
        }
      }
    }

    if (!dashboardResponse?.dashboard) {
      setError(dashboardError?.response?.data?.message || dashboardError?.message || "Unable to load your dashboard. Please try again.");
      setLoading(false);
      return;
    }

    setD(dashboardResponse.dashboard || {});

    const [communityResult, accountsResult] = await Promise.allSettled([
      API.get("/member/community-stats"),
      API.get(`/member/accounts?year=${new Date().getFullYear()}`),
    ]);

    if (communityResult.status === "fulfilled") {
      setC(communityResult.value?.data?.stats || {});
    }

    if (accountsResult.status === "fulfilled") {
      setAccounts(accountsResult.value?.data || null);
    }

    if (communityResult.status === "rejected" || accountsResult.status === "rejected") {
      // Secondary widgets are intentionally non-blocking. Keep the dashboard
      // visible even when one endpoint is temporarily unavailable.
      console.warn("Some dashboard widgets could not refresh.");
    }

    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const member = d?.member || {};
  const profile = d?.profileCompletion || {};
  const pct = profile.percentage || member.profileCompletion || 0;
  const firstName = (member.fullName || "Member").split(" ")[0];

  const memberSignals = useMemo(() => [
    { label: "Dependants", value: d?.statistics?.totalDependents || 0, icon: Users },
    { label: "Unread messages", value: d?.statistics?.unreadMessages || 0, icon: MessageCircle },
    { label: "Notifications", value: d?.statistics?.unreadNotifications || 0, icon: Bell },
    { label: "Pending support", value: d?.statistics?.pendingSupport?.total || 0, icon: HandHeart },
  ], [d]);

  if (loading) return <DashboardLayout><div className="portal-loading-card"><RefreshCw className="spinning" size={20} /> Preparing your member space…</div></DashboardLayout>;
  if (error) return <DashboardLayout><div className="portal-alert">{error}</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="member-dashboard v7-portal">
        <section className="member-welcome v7-member-hero">
          <div className="member-hero-main">
            <div className="member-identity-chip"><div className="member-avatar"><UserRound size={21} /></div><span>MEMBER PORTAL</span></div>
            <span className="portal-kicker"><Sparkles size={14} /> COMMUNITY · COMPASSION · SUPPORT</span>
            <h1>Welcome home, {firstName}.</h1>
            <p>Your Benovelent MIDAX space for contributions, support, family information and community communication.</p>
            <div className="portal-hero-actions">
              <Link className="portal-primary-btn member-primary" to="/member/accounts"><WalletCards size={17} /> Open my accounts</Link>
              <Link className="portal-secondary-btn" to="/member/messages"><MessageCircle size={17} /> Messages</Link>
              <button className="portal-ghost-btn" onClick={load}><RefreshCw size={16} /> Refresh</button>
            </div>
          </div>
          <div className="member-hero-status"><span>ACCOUNT STATUS</span><strong>{member.status || "Active"}</strong><small>Member Number · {member.memberNumber || "Not assigned"}</small></div>
        </section>

        {pct < 100 ? (
          <section className="profile-completion-card v7-completion">
            <div><div className="completion-head"><span>PROFILE COMPLETION</span><strong>{pct}%</strong></div><h2>Finish your profile to unlock the full member experience.</h2><p>{(profile.missingFields || []).join(", ") || "Add the remaining required information."}</p><div className="completion-track"><div className="completion-progress" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} /></div></div><Link className="portal-primary-btn member-primary" to="/member/profile">Complete profile <ArrowUpRight size={16} /></Link>
          </section>
        ) : (
          member.verified ? (
            <section className="profile-unlocked-card v7-unlocked"><div className="unlocked-icon"><CheckCircle2 size={22} /></div><div><span>PROFILE COMPLETE & VERIFIED</span><h2>You are all set.</h2><p>Your member tools are ready. You can add dependents and submit support requests.</p></div><Link className="portal-secondary-btn" to="/member/profile">View profile <ArrowUpRight size={16} /></Link></section>
          ) : (
            <section className="profile-unlocked-card v7-unlocked"><div className="unlocked-icon"><Bell size={22} /></div><div><span>VERIFICATION PENDING</span><h2>Your profile is complete and awaiting verification.</h2><p>An Admin or Super Admin will review your membership. Dependents and support requests will unlock after verification.</p></div><Link className="portal-secondary-btn" to="/member/notifications">Open notifications <ArrowUpRight size={16} /></Link></section>
          )
        )}

        <section className="portal-panel community-pulse-panel">
          <div className="panel-heading"><div><span className="panel-kicker">COMMUNITY PULSE</span><h2>One family, one live view.</h2><p>A simple snapshot of the wider scheme.</p></div></div>
          <div className="community-metrics">
            <CommunityMetric value={c?.totalMembers || 0} label="Members" tone="violet" />
            <CommunityMetric value={c?.totalLeaders || 0} label="Leaders" tone="blue" />
            <CommunityMetric value={c?.activeMembers || 0} label="Active" tone="green" />
            <CommunityMetric value={c?.approvedClaims || 0} label="Approved support" tone="orange" />
            <CommunityMetric value={money(c?.bookBalance)} label="Book balance" tone="amber" />
          </div>
        </section>

        <section className="portal-grid two">
          <article className="portal-panel member-personal-panel">
            <div className="panel-heading"><div><span className="panel-kicker">YOUR SPACE</span><h2>Your live activity</h2><p>Personal information only. Monthly income is not collected.</p></div></div>
            <div className="personal-signal-grid">{memberSignals.map(({label,value,icon:Icon}) => <div className="personal-signal" key={label}><div className="personal-icon"><Icon size={17} /></div><div><strong>{value}</strong><span>{label}</span></div></div>)}</div>
            <div className="personal-total"><span>Standard monthly payroll deduction</span><strong>{money(accounts?.standardMonthlyDeduction)}</strong><small>Scheme-wide amount currently scheduled for payroll deduction.</small></div>
          </article>

          <article className="portal-panel member-quick-panel">
            <div className="panel-heading"><div><span className="panel-kicker">QUICK LINKS</span><h2>What would you like to do?</h2></div></div>
            <div className="member-quick-grid">
              <Quick to="/member/profile" title="Profile" text="Update your required information." icon={<UserRound />} />
              <Quick to="/member/dependents" title="Dependants" text="Manage your family records." icon={<Users />} />
              <Quick to="/member/accounts" title="Accounts" text="See the same scheme-wide accounts view shared by all members." icon={<WalletCards />} />
              <Quick to="/member/support" title="Support" text="Submit or follow a support request." icon={<HandHeart />} />
              <Quick to="/member/messages" title="Chat" text="Message members and leaders." icon={<MessageCircle />} />
              <Quick to="/member/notifications" title="Notifications" text="See your latest updates." icon={<Bell />} />
            </div>
          </article>
        </section>

        <section className="portal-panel announcements-panel">
          <div className="panel-heading"><div><span className="panel-kicker">COMMUNITY NEWS</span><h2>Recent announcements</h2></div><Link to="/news" className="panel-link">View all <ArrowUpRight size={16} /></Link></div>
          <div className="announcement-list">
            {(d.announcements || []).slice(0, 4).map((n, i) => <div className="announcement-row" key={n._id || i}><div className="announcement-dot" /><div><strong>{n.title || "Announcement"}</strong><p>{n.excerpt || n.content || n.message || ""}</p></div></div>)}
            {(d.announcements || []).length === 0 && <div className="portal-empty">No announcements are available right now.</div>}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

function CommunityMetric({ value, label, tone }) { return <div className={`community-metric ${tone}`}><strong>{value}</strong><span>{label}</span></div>; }
function Quick({ to, icon, title, text }) { return <Link className="member-quick-item" to={to}><div className="member-quick-icon">{icon}</div><div><strong>{title}</strong><span>{text}</span></div><ArrowUpRight size={16} /></Link>; }
