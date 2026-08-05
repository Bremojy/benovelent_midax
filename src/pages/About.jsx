import { Link } from "react-router-dom";
import { MessageCircle, ShieldCheck, HeartHandshake, Sparkles, Phone } from "lucide-react";
import "../styles/public-modern.css";

const aboutVideo = "/videos/benevolent-community-loop.mp4";

export default function About() {
  return (
    <main className="public-modern-page">
      <section className="modern-hero">
        <video className="modern-hero-video" autoPlay muted loop playsInline preload="metadata" poster="/hero.jpg">
          <source src={aboutVideo} type="video/mp4" />
        </video>
        <div className="modern-hero-overlay" />
        <div className="modern-hero-content">
          <div>
            <span className="modern-kicker"><Sparkles size={14} /> ABOUT MIDAX & BENEVOLENT</span>
            <h1>Midax Petroleum Marketing and the Benevolent scheme were built around people, service and family support.</h1>
            <p>
              The letterhead shows Midax Petroleum Marketing as a service-focused company offering fuels, lubricants, LPG gas, service and carwash.
              Benevolent Midax carries that same care into a support scheme for members and their families.
            </p>
            <div className="modern-hero-actions">
              <Link to="/contact" className="modern-btn">Your member voice is needed <MessageCircle size={17} /></Link>
              <Link to="/services" className="modern-btn-secondary">View support services</Link>
            </div>
          </div>
          <div className="modern-hero-panel">
            <div className="modern-panel-grid">
              <Link to="/contact" className="modern-metric"><strong>Member voice</strong><span>Every member has right to speak</span></Link>
              <Link to="/privacy-policy" className="modern-metric"><strong>Privacy</strong><span>Information can only be accessed by superAdmin; your information is protected</span></Link>
              <Link to="/services" className="modern-metric"><strong>Support</strong><span>Detailed information about the Benevolent Midax Constitution services</span></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="modern-section">
        <div className="modern-section-head">
          <span className="eyebrow">HISTORY</span>
          <h2>About the Midax family and why Benevolent Midax exists</h2>
        </div>
        <div className="modern-split">
          <div className="modern-card">
            <h3>About Midax company</h3>
            <p>
              Midax is presented in the supplied letterhead as a petroleum marketing business serving Nairobi with fuels, lubricants, LPG gas, service and carwash.
              This website keeps that family-and-service feel while focusing on the Benevolent fund scheme.
            </p>
          </div>
          <div className="modern-card">
            <h3>Why Benevolent Midax came up</h3>
            <p>
              The scheme was formed so members can stand together during medical and funeral needs. According to the supplied brief, the Benevolent constitution started in May 2023 with contributions of Ksh 300, then moved to Ksh 500 in January 2025.
            </p>
          </div>
        </div>
      </section>

      <section className="modern-section">
        <div className="modern-card-grid">
          <div className="modern-card"><HeartHandshake size={24} /><h3>Representatives</h3><p>Each station provides five to seven representatives for operations, meetings, amendments and oversight.</p></div>
          <div className="modern-card"><ShieldCheck size={24} /><h3>Accountability</h3><p>The Treasurer is responsible for accounting and ensuring accountability, integrity and transparency.</p></div>
          <div className="modern-card"><Phone size={24} /><h3>Communication</h3><p>Communication should be done on time so members know how their requests and contributions are being handled.</p></div>
        </div>
      </section>
    </main>
  );
}
