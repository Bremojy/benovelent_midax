import { Link } from "react-router-dom";
import { Heart, Stethoscope, GraduationCap, MessageCircleMore, FileText, ShieldCheck, PhoneCall, Newspaper } from "lucide-react";
import Hero from "../components/Hero";
import "../styles/public-modern.css";

const quickLinks = [
  { icon: FileText, title: "Constitution", text: "Read the scheme rules and support guidelines.", href: "/constitution" },
  { icon: Newspaper, title: "News & Polls", text: "See updates, announcements and live polls.", href: "/news" },
  { icon: PhoneCall, title: "Contact Us", text: "Reach the team for support or a callback.", href: "/contact" },
  { icon: ShieldCheck, title: "Member Portal", text: "Sign in to see messages, claims and statements.", href: "/login" },
];

export default function Home() {
  return (
    <>
      <Hero />

      <main className="public-modern-page">
        <section className="modern-section">
          <div className="modern-section-head">
            <span className="eyebrow">How we help</span>
            <h2>Support, communication and member care in one modern portal.</h2>
            <p>
              Benevolent Midax is built around fast member support, private communication and a clean experience on phones, tablets and desktops.
            </p>
          </div>

          <div className="modern-card-grid">
            <div className="modern-card">
              <div className="icon"><Heart size={24} /></div>
              <h3>Funeral Support</h3>
              <p>Compassionate help for eligible families when a member needs urgent support.</p>
            </div>

            <div className="modern-card">
              <div className="icon"><Stethoscope size={24} /></div>
              <h3>Medical Support</h3>
              <p>Dependable assistance for approved medical needs and hospital bills.</p>
            </div>

            <div className="modern-card">
              <div className="icon"><GraduationCap size={24} /></div>
              <h3>Education Support</h3>
              <p>Clear, accountable support for eligible education-related needs.</p>
            </div>
          </div>
        </section>

        <section className="modern-section">
          <div className="modern-split">
            <div>
              <span className="eyebrow">Member experience</span>
              <h2 style={{ marginTop: 14 }}>Everything important is easy to reach.</h2>
              <p style={{ marginTop: 14, color: "#5f6670", lineHeight: 1.85 }}>
                Members can log in to message privately, view notifications, open support requests and track applications. Administrators can publish news and send broadcast updates directly to members.
              </p>

              <div className="modern-trust-band" style={{ marginTop: 22 }}>
                <div className="trust-chip">
                  <strong>Secure</strong>
                  <span>Private portals and messages</span>
                </div>
                <div className="trust-chip">
                  <strong>Fast</strong>
                  <span>Lightweight pages and local media</span>
                </div>
                <div className="trust-chip">
                  <strong>Mobile</strong>
                  <span>Works well on all devices</span>
                </div>
                <div className="trust-chip">
                  <strong>Clear</strong>
                  <span>Simple content and actions</span>
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
                  <strong>Communication centre</strong>
                </div>
                <p style={{ margin: 0, color: "rgba(255,255,255,.84)" }}>
                  News, member chat, support updates and alerts all stay inside the portal.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="modern-section">
          <div className="modern-section-head">
            <span className="eyebrow">Quick access</span>
            <h2>Find the pages members use most.</h2>
          </div>

          <div className="modern-card-grid" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
            {quickLinks.map(({ icon: Icon, title, text, href }) => (
              <Link key={title} to={href} className="modern-card" style={{ textDecoration: "none", color: "inherit" }}>
                <div className="icon"><Icon size={24} /></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
