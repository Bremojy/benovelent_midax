import { useEffect, useState } from "react";
import API from "../services/api";

import { Link } from "react-router-dom";
import { Heart, Stethoscope, BookOpen, ArrowRight, BadgeCheck, ShieldCheck, MessageCircle } from "lucide-react";
import "../styles/public-modern.css";

const heroVideo = "/videos/benevolent-community-loop.mp4";

export default function Services() {
  const [policies, setPolicies] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => { API.get("/policies/public").then(({ data }) => setPolicies(data?.policies || [])).catch((err) => setError(err.response?.data?.message || "Unable to load current policies.")); }, []);
  return (
    <main className="public-modern-page">
      <section className="modern-hero modern-video-hero">
        <video className="modern-hero-video" autoPlay={!shouldSkipBackgroundVideo} muted loop playsInline preload={shouldSkipBackgroundVideo ? "none" : "metadata"} poster="/hero.jpg">
          <source src={heroVideo} type="video/mp4" />
        </video>
        <div className="modern-hero-overlay" />
        <div className="modern-hero-content">
          <div>
            <span className="modern-kicker"><BookOpen size={14} /> SERVICES & CONSTITUTION</span>
            <h1>Support that feels modern, warm and family-centred.</h1>
            <p>
              The Benevolent Constitution guides funeral and medical support, governance, accountability and member communication.
            </p>
            <div className="modern-hero-actions">
              <Link to="/constitution" className="modern-btn">View our Constitution <ArrowRight size={17} /></Link>
              <Link to="/contact" className="modern-btn-secondary">Ask a question</Link>
            </div>
          </div>
          <div className="modern-hero-panel">
            <div className="modern-panel-grid">
              <Link to="/contact" className="modern-metric"><strong>Member voice</strong><span>Speak to the scheme team</span></Link>
              <Link to="/privacy-policy" className="modern-metric"><strong>Privacy</strong><span>Information stays protected</span></Link>
              <Link to="/constitution" className="modern-metric"><strong>Trust</strong><span>Constitution-led decisions</span></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="modern-section">
        {error && <p role="alert">{error}</p>}
        <div className="modern-card-grid">
          {policies.length ? policies.map((policy) => <Service key={policy._id} icon={iconFor(policy.category)} title={policy.title || policy.name || "Support policy"} text={policyDescription(policy)} />) : <Service icon={BookOpen} title="Support policies" text="No enabled support policy is currently configured." />}
        </div>
      </section>

      <section className="modern-section">
        <div className="modern-trust-band">
          <div className="trust-chip"><BadgeCheck size={19}/><strong>{policies.length}</strong><span>Enabled policies</span></div>
          <div className="trust-chip"><ShieldCheck size={19}/><strong>Live</strong><span>Policy records</span></div>
          <div className="trust-chip"><MessageCircle size={19}/><strong>Dynamic</strong><span>Rules from the server</span></div>
          <div className="trust-chip"><BookOpen size={19}/><strong>Official</strong><span>Constitution-led</span></div>
        </div>
      </section>

    </main>
  );
}

const shouldSkipBackgroundVideo = typeof navigator !== "undefined" && (navigator.connection?.saveData || /2g/.test(navigator.connection?.effectiveType || ""));

function iconFor(category) { const value=String(category||"").toLowerCase(); return value.includes("medical")?Stethoscope:value.includes("funeral")?Heart:value.includes("education")?BookOpen:ShieldCheck; }
function policyDescription(policy) { const parts=[]; if(policy.minAmount!==null&&policy.minAmount!==undefined) parts.push(`Minimum: Ksh ${Number(policy.minAmount).toLocaleString("en-KE")}`); if(policy.maxAmount!==null&&policy.maxAmount!==undefined) parts.push(`Maximum: Ksh ${Number(policy.maxAmount).toLocaleString("en-KE")}`); if(policy.repaymentMonths) parts.push(`Repayment: ${Number(policy.repaymentMonths)} months`); return parts.join(" • ") || policy.description || policy.summary || "Current policy details are maintained by SuperAdmin."; }
function Service({ icon: Icon, title, text }) {
  return (
    <article className="modern-card">
      <Icon size={28} />
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}
