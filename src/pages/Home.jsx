import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import API, { resolveApiUrl } from "../services/api";
import { Heart, Stethoscope, MessageCircle, FileText, Users, Images, ArrowRight, ShieldCheck, Wallet, Bell, Sparkles, ClipboardCheck, Smartphone, Headphones, CheckCircle2 } from "lucide-react";
import Hero from "../components/Hero";
import { usePublicSettings } from "../hooks/usePublicSettings";
import "../styles/public-modern.css";

export default function Home() {
  const [leaders, setLeaders] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [policyError, setPolicyError] = useState("");
  const { settings, loading: settingsLoading, error: settingsError } = usePublicSettings();
  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([API.get("/leaders/current"), API.get("/policies/public")]).then(([leadersResult, policiesResult]) => {
      if (cancelled) return;
      if (leadersResult.status === "fulfilled") setLeaders(Array.isArray(leadersResult.value.data?.leaders) ? leadersResult.value.data.leaders : []);
      if (policiesResult.status === "fulfilled") setPolicies(Array.isArray(policiesResult.value.data?.policies) ? policiesResult.value.data.policies : []);
      else setPolicyError("Unable to load current support policies.");
    });
    return () => { cancelled = true; };
  }, []);

  const scheme = settings?.scheme || {};
  const funeral = policies.find((p) => String(p.category || "").toLowerCase() === "funeral-support");
  const medical = policies.find((p) => String(p.category || "").toLowerCase() === "medical-support");
  const configured = (value, formatter = (v) => `Ksh ${Number(v).toLocaleString("en-KE")}`) => value === null || value === undefined || value === "" ? "Not configured" : formatter(value);

  return (<>
    <Hero />
    <main className="public-modern-page">
      <section className="modern-section">
        <div className="modern-section-head">
          <span className="eyebrow">BENOVELENT FUND SCHEME</span>
          <h2>Better life is better when you stand together.</h2>
          {settingsLoading ? <p aria-live="polite">Loading current scheme configuration…</p> : settingsError ? <p role="alert">{settingsError}</p> : <p>{settings?.website?.subtitle || settings?.organization?.displayName || "Current scheme information is configured by SuperAdmin."}</p>}
          <div className="modern-trust-band" aria-label="Current scheme settings">
            <Chip icon={Wallet} title={configured(scheme.monthlyContribution)} text="Monthly contribution" />
            <Chip icon={ShieldCheck} title={configured(scheme.minimumBookBalance)} text="Minimum book balance" />
            <Chip icon={ClipboardCheck} title={configured(scheme.gracePeriodDays, (v) => `${Number(v)} days`)} text="Grace period" />
          </div>
        </div>
        <div className="modern-card-grid">
          {funeral ? <Card icon={Heart} title={funeral.title} text={policyText(funeral)} /> : <Card icon={Heart} title="Funeral support" text="Not configured" />}
          {medical ? <Card icon={Stethoscope} title={medical.title} text={policyText(medical)} /> : <Card icon={Stethoscope} title="Medical support" text="Not configured" />}
          <Card icon={ShieldCheck} title="Accountability" text="See the current published policy and Constitution for authoritative scheme rules." />
        </div>
        {policyError && <p role="alert" className="portal-error">{policyError}</p>}
        <Link className="modern-btn" to="/constitution">Read the Constitution <ArrowRight size={17} /></Link>
      </section>
      {/* remaining sections intentionally retain navigational copy only; business values are no longer embedded here. */}
      <section className="modern-section">
        <div className="modern-section-head"><span className="eyebrow">QUICK ACCESS</span><h2>Explore the scheme</h2><p>Use the published portal pages for current scheme information and member services.</p></div>
        <div className="modern-card-grid">
          <Quick icon={Users} title="See our leaders" text="Meet the leadership representatives." to="/leaders" />
          <Quick icon={Images} title="Benovelent gallery" text="View community collections." to="/gallery" />
          <Quick icon={FileText} title="Constitution" text="Read the official scheme rules." to="/constitution" />
          <Quick icon={MessageCircle} title="Contact us" text="Send a question or request." to="/contact" />
          <Quick icon={Smartphone} title="Verify membership" text="Confirm a member record from the public verification page." to="/verify-membership" />
          <Quick icon={ShieldCheck} title="Member portal" text="Sign in for secure accounts, support, chat and updates." to="/login" />
        </div>
      </section>
      <section className="modern-section"><div className="modern-section-head"><span className="eyebrow">MEMBER EXPERIENCE</span><h2>What members can do in the portal</h2><p>Members can complete profiles, manage dependants, view accounts, request support, follow claims, chat, receive notifications and participate in published polls.</p></div><div className="modern-trust-band"><Chip icon={Wallet} title="Accounts" text="Live ledger and contribution records" /><Chip icon={Heart} title="Support" text="Live assistance requests" /><Chip icon={Bell} title="Updates" text="Persisted portal notifications" /><Chip icon={MessageCircle} title="Chat" text="Private member communication" /></div></section>
      <section className="modern-section v3-experience-section"><div className="modern-section-head"><span className="eyebrow">DIGITAL EXPERIENCE</span><h2>Everything important, in one member space.</h2><p>Use the authenticated portal for current member actions and records.</p></div><div className="modern-card-grid four-v3"><Card icon={ClipboardCheck} title="Track support" text="Follow submitted support requests from your authenticated portal." /><Card icon={Smartphone} title="Mobile-ready" text="Use the responsive web app and installed PWA experience where supported." /><Card icon={Headphones} title="Guided help" text="Use the Benevolent Assistant for currently published information." /><Card icon={CheckCircle2} title="Clear accountability" text="Use the Constitution and published updates as official sources." /></div></section>
      <section className="modern-section"><div className="modern-section-head"><span className="eyebrow">LEADERSHIP</span><h2>Meet the current scheme leadership</h2><p>Leadership records below are loaded from live administration data.</p></div><div className="modern-card-grid four-v3">{leaders.length ? leaders.map((leader) => <article className="modern-card leader-card" key={String(leader._id)}><div className="leader-avatar-wrap">{leader.profileImage ? <img src={resolveApiUrl(leader.profileImage)} alt={leader.name || "Leader"} className="leader-avatar" /> : <div className="leader-avatar-fallback">{String(leader.name || "B").charAt(0).toUpperCase()}</div>}</div><h3>{leader.name}</h3><p><strong>{leader.roleLabel}</strong></p>{leader.phone && <p><a href={`tel:${leader.phone}`}>{leader.phone}</a></p>}{leader.email && <p><a href={`mailto:${leader.email}`}>{leader.email}</a></p>}</article>) : <article className="modern-card"><h3>Leadership directory</h3><p>Current records are unavailable.</p></article>}</div><Link className="modern-btn-secondary" to="/leaders">Open leadership directory</Link></section>
      <section className="modern-section v3-portal-cta"><div className="portal-cta-copy"><span className="eyebrow">MEMBER PORTAL</span><h2>Need a faster way to your member tools?</h2><p>Sign in for private messaging, contributions, support, dependants and notifications.</p><Link className="modern-btn" to="/login"><ShieldCheck size={17} /> Open the portal <ArrowRight size={17} /></Link></div><div className="portal-cta-grid"><div><MessageCircle size={21}/><strong>Chat</strong><span>Members & leaders</span></div><div><Bell size={21}/><strong>Notifications</strong><span>Stay up to date</span></div><div><Wallet size={21}/><strong>Accounts</strong><span>Contribution records</span></div><div><HelpIcon/><strong>Assistant</strong><span>Current published guidance</span></div></div></section>
      <div className="quick-pop modern-quick-pop"><span><Sparkles size={14} /> Quick link</span><Link to="/leaders">See our leaders</Link><Link to="/gallery">See our Benovelent gallery collections</Link></div>
    </main>
  </>);
}
function policyText(policy) { const parts=[]; if (policy.minAmount !== null && policy.minAmount !== undefined) parts.push(`Minimum: Ksh ${Number(policy.minAmount).toLocaleString("en-KE")}`); if (policy.maxAmount !== null && policy.maxAmount !== undefined) parts.push(`Maximum: Ksh ${Number(policy.maxAmount).toLocaleString("en-KE")}`); return parts.length ? parts.join(" • ") : (policy.description || policy.summary || "Current policy details are published in the Support area."); }
function Card({ icon: Icon, title, text }) { return <article className="modern-card">{Icon && <Icon size={25} />}<h3>{title}</h3><p>{text}</p></article>; }
function Quick({ icon: Icon, title, text, to }) { return <Link to={to} className="modern-card quick-link-card"><Icon size={25} /><h3>{title}</h3><p>{text}</p><ArrowRight size={18} /></Link>; }
function Chip({ icon: Icon, title, text }) { return <div className="trust-chip"><Icon size={19} /><strong>{title}</strong><span>{text}</span></div>; }
function HelpIcon() { return <MessageCircle size={21} />; }
