
import { Link } from "react-router-dom";
import { Heart, Stethoscope, GraduationCap, BookOpen, ArrowRight, BadgeCheck, ShieldCheck, MessageCircle } from "lucide-react";
import "../styles/public-modern.css";

const heroVideo = "/videos/benevolent-community-loop.mp4";

export default function Services() {
  return (
    <main className="public-modern-page">
      <section className="modern-hero modern-video-hero">
        <video className="modern-hero-video" autoPlay muted loop playsInline preload="metadata" poster="/hero.jpg">
          <source src={heroVideo} type="video/mp4" />
        </video>
        <div className="modern-hero-overlay" />
        <div className="modern-hero-content">
          <div>
            <span className="modern-kicker"><BookOpen size={14} /> SERVICES & CONSTITUTION</span>
            <h1>Support that feels modern, warm and family-centred.</h1>
            <p>
              The Benovelent Constitution guides funeral and medical support, accountability and member communication.
              Education support is coming soon and remains open for the children of contributors.
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
        <div className="modern-card-grid">
          <Service icon={Heart} title="Funeral Support" text="Ksh 100,000 per eligible funeral claim for parents, husband/wife and children. The constitution also notes qualifying sibling support at Ksh 30,000." />
          <Service icon={Stethoscope} title="Medical Support" text="Inpatient help follows the constitution's amount bands and claim conditions for eligible family members." />
          <Service icon={GraduationCap} title="Education Support — Coming Soon" text="Education support is coming soon. The brief asks for benefits for contributors and their children, so the page explains the promise without inventing amounts not listed in the constitution." />
        </div>
      </section>

      <section className="modern-section">
        <div className="modern-trust-band">
          <div className="trust-chip"><BadgeCheck size={19} /><strong>Ksh 500</strong><span>Member contribution</span></div>
          <div className="trust-chip"><ShieldCheck size={19} /><strong>Ksh 500,000</strong><span>Minimum book balance</span></div>
          <div className="trust-chip"><MessageCircle size={19} /><strong>2 + 2</strong><span>Funeral and medical claim limits</span></div>
          <div className="trust-chip"><BookOpen size={19} /><strong>3 days</strong><span>Chairperson dispatch window</span></div>
        </div>
      </section>
    </main>
  );
}

function Service({ icon: Icon, title, text }) {
  return (
    <article className="modern-card">
      <Icon size={28} />
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}
