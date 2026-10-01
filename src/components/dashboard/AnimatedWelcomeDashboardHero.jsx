import { Activity, HeartPulse, ShieldCheck } from "lucide-react";
import "./AnimatedWelcomeDashboardHero.css";

const ROLE_META = {
  member: {
    label: "MEMBER PORTAL",
    defaultSubtitle: "Your Benevolent MIDAX member space is ready for you.",
    icon: HeartPulse,
  },
  admin: {
    label: "ADMIN OPERATIONS",
    defaultSubtitle: "Here’s your Benevolent MIDAX operations overview.",
    icon: Activity,
  },
  superadmin: {
    label: "SUPERADMIN CONTROL",
    defaultSubtitle: "Your Benevolent MIDAX management center is ready.",
    icon: ShieldCheck,
  },
};

function firstNameOf(value, role) {
  const clean = String(value || "").trim();
  if (!clean) return role === "superadmin" ? "SuperAdmin" : role === "admin" ? "Admin" : "Member";
  return clean.split(/\s+/)[0];
}

export default function AnimatedWelcomeDashboardHero({
  role = "member",
  displayName = "",
  subtitle = "",
  summary = null,
  actions = null,
}) {
  const normalizedRole = String(role || "member").toLowerCase();
  const meta = ROLE_META[normalizedRole] || ROLE_META.member;
  const Icon = meta.icon;
  const firstName = firstNameOf(displayName, normalizedRole);

  return (
    <section className={`animated-dashboard-hero animated-dashboard-hero--${normalizedRole}`} aria-labelledby="dashboard-welcome-title">
      <div className="animated-dashboard-hero__copy">
        <div className="animated-dashboard-hero__role"><span className="animated-dashboard-hero__role-icon"><Icon size={15} aria-hidden="true" /></span><span>{meta.label}</span></div>
        <h1 id="dashboard-welcome-title">Welcome back, {firstName} 👋</h1>
        <p>{subtitle || meta.defaultSubtitle}</p>
        {actions ? <div className="animated-dashboard-hero__actions">{actions}</div> : null}
      </div>
      <div className="animated-dashboard-hero__visual" aria-hidden="true">
        <div className="hero-visual-glow" />
        <div className="hero-wave hero-wave--one" />
        <div className="hero-wave hero-wave--two" />
        <div className="hero-wave hero-wave--three" />
        <div className="hero-pulse-line"><span /><span /><span /><span /><span /></div>
        <div className="hero-core"><Icon size={26} /><span>{normalizedRole === "member" ? "SUPPORT" : normalizedRole === "admin" ? "LIVE OPS" : "CONTROL"}</span></div>
        {summary ? <div className="animated-dashboard-hero__summary">{summary}</div> : null}
      </div>
    </section>
  );
}
