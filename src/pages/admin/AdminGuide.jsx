import { ArrowRight, BarChart3, BookOpen, HandHeart, Landmark, MessageCircle, ShieldCheck, Users, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";

const sections = [
  ["Dashboard", "Use the dashboard as the starting point for authoritative workload, membership and finance indicators. Treat loading and error states as unavailable data rather than zero values.", BarChart3, "/admin"],
  ["Member verification", "Open Members to review profile completion and verification status. Only verify a record when the backend accepts the current profile and role rules.", ShieldCheck, "/admin/members"],
  ["Support and claims", "Review support requests and claims through their dedicated workflows. Successful stage updates are authoritative; a later refresh problem should never be treated as a failed primary mutation.", HandHeart, "/admin/claims"],
  ["Finance responsibilities", "Use Accounts and Contributions for the organisational records your role is authorised to manage. Protect personal Constitution/payroll information according to the server-side role rules and use M-PESA records only for real transaction data.", Wallet, "/admin/accounts"],
  ["Communications", "Use Messages, Announcements, Notifications, Polls and Feedback for the communication functions available to your role. Do not use workarounds to bypass role restrictions.", MessageCircle, "/admin/communications"],
  ["Reports and escalation", "Use Reports for member, finance, support and claim reporting. Escalate governance, system-integrity and SuperAdmin-only matters to the SuperAdmin rather than changing protected settings through alternate routes.", Landmark, "/admin/reports"],
];

export default function AdminGuide() {
  return (
    <DashboardLayout>
      <div className="portal-module portal-guide">
        <header className="portal-module-header"><div><span>ADMIN GUIDE</span><h1>Leadership operations guide</h1><p>Practical guidance for authorised administrators using the current Benevolent MIDAX workflows.</p></div></header>
        <div className="portal-guide-grid">
          {sections.map(([title, text, Icon, path]) => <article className="portal-panel portal-guide-card" key={title}><div className="portal-guide-icon"><Icon size={20} /></div><div><h2>{title}</h2><p>{text}</p><Link className="portal-text-link" to={path}>Open {title}</Link></div></article>)}
        </div>
        <section className="portal-panel portal-guide-note"><BookOpen size={21}/><div><h2>Security reminder</h2><p>Admin access is role-scoped. Keep credentials private, review member and financial data only for legitimate duties, and escalate SuperAdmin-only governance or technical actions rather than attempting alternate access paths.</p></div></section>
        <Link className="portal-btn" to="/admin"><ArrowRight size={16}/> Back to dashboard</Link>
      </div>
    </DashboardLayout>
  );
}
