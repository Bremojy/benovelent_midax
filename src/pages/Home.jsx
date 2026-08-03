import { Heart, Stethoscope, GraduationCap, MessageCircleMore } from "lucide-react";
import Hero from "../components/Hero";
import "../styles/public-modern.css";

export default function Home() {
  return (
    <>
      <Hero />

      <main className="public-modern-page">
        <section className="modern-section">
          <div className="modern-section-head">
            <span className="eyebrow">How we help</span>
            <h2>Support that reflects care, accountability and confidentiality.</h2>
            <p>
              The public website now keeps the focus on the constitution, member support and a secure communication culture.
            </p>
          </div>

          <div className="modern-card-grid">
            <div className="modern-card">
              <div className="icon"><Heart size={24} /></div>
              <h3>Funeral Support</h3>
              <p>Compassionate support for eligible families when the community needs to step in quickly and respectfully.</p>
            </div>

            <div className="modern-card">
              <div className="icon"><Stethoscope size={24} /></div>
              <h3>Medical Support</h3>
              <p>Clear and dependable assistance that helps members handle qualified medical challenges with dignity.</p>
            </div>

            <div className="modern-card">
              <div className="icon"><GraduationCap size={24} /></div>
              <h3>Education Support</h3>
              <p>Responsible support for learning goals with strong accountability and a transparent repayment structure.</p>
            </div>
          </div>
        </section>

        <section className="modern-section">
          <div className="modern-split">
            <div>
              <span className="eyebrow">Why members trust us</span>
              <h2 style={{ marginTop: 14 }}>Communication, privacy and service quality in one place.</h2>
              <p style={{ marginTop: 14, color: "#5f6670", lineHeight: 1.85 }}>
                Members can message each other in a private space, administrators can respond faster, and the public website now feels polished on phones, tablets and desktops.
              </p>

              <div className="modern-trust-band" style={{ marginTop: 22 }}>
                <div className="trust-chip">
                  <strong>Secure</strong>
                  <span>Confidential member portals</span>
                </div>
                <div className="trust-chip">
                  <strong>Modern</strong>
                  <span>Fresh UI and layout</span>
                </div>
                <div className="trust-chip">
                  <strong>Clear</strong>
                  <span>Easy to understand content</span>
                </div>
                <div className="trust-chip">
                  <strong>Connected</strong>
                  <span>Message centre integrated</span>
                </div>
              </div>
            </div>

            <div className="modern-image-card">
              <img
                src="/hero.jpg"
                alt="Benevolent Midax community"
                onError={(e) => {
                  e.currentTarget.src = "/about-welcome.svg";
                }}
              />
              <div className="modern-glass">
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <MessageCircleMore size={18} />
                  <strong>Connected message centre</strong>
                </div>
                <p style={{ margin: 0, color: "rgba(255,255,255,.84)" }}>
                  Members and administrators use the same secure messaging experience.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
