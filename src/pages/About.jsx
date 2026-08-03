import { useEffect, useState } from "react";
import { ArrowRight, Eye, HeartHandshake, ShieldCheck, Sparkles, Target, LockKeyhole } from "lucide-react";
import { Link } from "react-router-dom";
import "../styles/public-modern.css";

const aboutVideos = ["/videos/benevolent-community-loop.mp4"];
export default function About() {
  const [videoError, setVideoError] = useState(false);
  const [videoIndex, setVideoIndex] = useState(0);

  useEffect(() => {
    if (videoError || aboutVideos.length < 2) return;

    const timer = window.setInterval(() => {
      setVideoIndex((current) => (current + 1) % aboutVideos.length);
    }, 10000);

    return () => window.clearInterval(timer);
  }, [videoError]);

  return (
    <main className="public-modern-page">
      <section className="modern-hero">
        {!videoError && (
          <video
            className="modern-hero-video"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/hero.jpg"
            onError={() => setVideoError(true)}
            aria-hidden="true"
          >
            <source key={aboutVideos[videoIndex]} src={aboutVideos[videoIndex]} type="video/mp4" />
          </video>
        )}
        <div className="modern-hero-overlay" />

        <div className="modern-hero-content">
          <div>
            <span className="modern-kicker">
              <Sparkles size={14} /> About Benevolent Midax
            </span>

            <h1>A trusted community built for care and confidentiality.</h1>

            <p>
              Benevolent Midax combines support, communication and a modern digital experience that works beautifully on every device.
            </p>

            <div className="modern-hero-actions">
              <Link to="/contact" className="modern-btn">
                Join the community <ArrowRight size={18} />
              </Link>
              <Link to="/services" className="modern-btn-secondary">
                View services
              </Link>
            </div>
          </div>

          <div className="modern-hero-panel">
            <div className="modern-panel-grid">
              <div className="modern-metric">
                <strong>Trust</strong>
                <span>Open and accountable</span>
              </div>
              <div className="modern-metric">
                <strong>Privacy</strong>
                <span>Confidential communication</span>
              </div>
              <div className="modern-metric">
                <strong>Support</strong>
                <span>For the whole community</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="modern-section">
        <div className="modern-section-head">
          <span className="eyebrow">Who we are</span>
          <h2>We help members stand together with confidence.</h2>
          <p>
            The organization combines a benevolent constitution, transparent support services and a secure portal that encourages positive communication.
          </p>
        </div>

        <div className="modern-split">
          <div className="modern-image-card">
            <img
              src="/about-welcome.svg"
              alt="Benevolent Midax community welcome"
              onError={(e) => {
                e.currentTarget.src = "/hero.jpg";
              }}
            />
            <div className="modern-glass">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <LockKeyhole size={18} />
                <strong>Confidential by design</strong>
              </div>
              <p style={{ margin: 0, color: "rgba(255,255,255,.84)" }}>
                Sensitive member information stays inside the secure portals.
              </p>
            </div>
          </div>

          <div>
            <h2 style={{ marginTop: 0 }}>A modern support scheme with human values.</h2>
            <p style={{ marginTop: 14, color: "#5f6670", lineHeight: 1.85 }}>
              The public website, member dashboard and admin tools now share a cleaner visual identity to increase trust and make the experience feel professional on all screen sizes.
            </p>

            <div className="modern-card-grid" style={{ marginTop: 22, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
              <div className="modern-card">
                <div className="icon"><Target size={24} /></div>
                <h3>Mission</h3>
                <p>Deliver dependable support when members face emergencies, loss or educational needs.</p>
              </div>

              <div className="modern-card">
                <div className="icon"><Eye size={24} /></div>
                <h3>Vision</h3>
                <p>Create a resilient and trustworthy community that protects every member’s dignity.</p>
              </div>

              <div className="modern-card">
                <div className="icon"><HeartHandshake size={24} /></div>
                <h3>Values</h3>
                <p>Compassion, integrity and accountability guide every decision in the scheme.</p>
              </div>

              <div className="modern-card">
                <div className="icon"><ShieldCheck size={24} /></div>
                <h3>Trust</h3>
                <p>Privacy, clear messaging and strong administration keep the portal dependable.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="modern-section">
        <div className="modern-section-head">
          <span className="eyebrow">Why it works</span>
          <h2>Everything is focused on communication and confidence.</h2>
        </div>

        <div className="modern-trust-band">
          <div className="trust-chip">
            <strong>Members</strong>
            <span>Private conversations and support access</span>
          </div>
          <div className="trust-chip">
            <strong>Admins</strong>
            <span>Fast responses and member coordination</span>
          </div>
          <div className="trust-chip">
            <strong>Superadmin</strong>
            <span>Edit content and manage the website</span>
          </div>
          <div className="trust-chip">
            <strong>Modern UI</strong>
            <span>Responsive, clean and easy to use</span>
          </div>
        </div>
      </section>
    </main>
  );
}
