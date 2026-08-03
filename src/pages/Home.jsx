import { ArrowRight, Heart, Sparkles, Stethoscope, GraduationCap, MessageCircleMore } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import "../styles/public-modern.css";

const homeVideos = [
  "/videos/benevolent-community-loop.mp4",
  "/videos/benevolent-news-loop.mp4",
];

export default function Home() {
  const [videoError, setVideoError] = useState(false);
  const [videoIndex, setVideoIndex] = useState(0);

  useEffect(() => {
    if (videoError || homeVideos.length < 2) return;

    const timer = window.setInterval(() => {
      setVideoIndex((current) => (current + 1) % homeVideos.length);
    }, 12000);

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
            preload="auto"
            poster="/hero.jpg"
            onError={() => setVideoError(true)}
            aria-hidden="true"
          >
            <source key={homeVideos[videoIndex]} src={homeVideos[videoIndex]} type="video/mp4" />
          </video>
        )}
        <div className="modern-hero-overlay" />

        <div className="modern-hero-content">
          <div>
            <span className="modern-kicker">
              <Sparkles size={14} /> Benevolent Midax
            </span>

            <h1>Modern support for trusted community care.</h1>

            <p>
              A secure and welcoming Benevolent Midax portal designed to strengthen communication, protect confidential information and help members stand together during life’s important moments.
            </p>

            <div className="modern-hero-actions">
              <Link to="/about" className="modern-btn">
                Discover the community <ArrowRight size={18} />
              </Link>
              <Link to="/login" className="modern-btn-secondary">
                Portal login
              </Link>
            </div>
          </div>

          <div className="modern-hero-panel">
            <div className="modern-panel-grid">
              <div className="modern-metric">
                <strong>Private</strong>
                <span>Member communication</span>
              </div>
              <div className="modern-metric">
                <strong>Responsive</strong>
                <span>Works on all devices</span>
              </div>
              <div className="modern-metric">
                <strong>Modern</strong>
                <span>Built for trust</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="modern-section">
        <div className="modern-section-head">
          <span className="eyebrow">How we help</span>
          <h2>Support that reflects care, accountability and confidentiality.</h2>
          <p>
            The public website now presents the scheme with a cleaner visual language while keeping the member portal focused on secure communication.
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
                Members and administrators now share the same secure messaging experience.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
