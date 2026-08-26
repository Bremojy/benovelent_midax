import { useState } from "react";
import { Phone, Mail, MessageCircle, MapPin, Send, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import API from "../services/api";
import "../styles/public-modern.css";

const shouldSkipBackgroundVideo = typeof navigator !== "undefined" && (navigator.connection?.saveData || /2g/.test(navigator.connection?.effectiveType || ""));

const heroVideo = "/videos/benevolent-contact-loop.mp4";

export default function Contact() {
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", subject: "", message: "" });
  const [status, setStatus] = useState({});
  const [busy, setBusy] = useState(false);

  const onChange = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setStatus({});
    try {
      const { data } = await API.post("/contact", form);
      setStatus({ type: "success", message: data.message || "Message sent successfully." });
      setForm({ fullName: "", email: "", phone: "", subject: "", message: "" });
    } catch (error) {
      setStatus({ type: "error", message: error.response?.data?.message || "Unable to send your message." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="public-modern-page contact-modern-page">
      <section className="modern-hero modern-video-hero">
        <video className="modern-hero-video" autoPlay={!shouldSkipBackgroundVideo} muted loop playsInline preload={shouldSkipBackgroundVideo ? "none" : "metadata"} poster="/hero.jpg">
          <source src={heroVideo} type="video/mp4" />
        </video>
        <div className="modern-hero-overlay" />
        <div className="modern-hero-content">
          <div>
            <span className="modern-kicker">CONTACT US</span>
            <h1>We’d love to hear from you.</h1>
            <p>Send questions, feedback or member-support enquiries through a clean family-friendly contact experience.</p>
            <div className="modern-hero-actions">
              <a className="modern-btn" href="#contact-form">Open message form <ArrowRight size={17} /></a>
              <a className="modern-btn-secondary" href="/privacy-policy">Privacy policy</a>
            </div>
          </div>
          <div className="modern-hero-panel">
            <div className="modern-panel-grid">
              <div className="modern-metric"><strong>Fast reply</strong><span>Messages route to the scheme team</span></div>
              <div className="modern-metric"><strong>Secure</strong><span>Form goes through the API</span></div>
              <div className="modern-metric"><strong>Modern</strong><span>Video-led contact layout</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="contact-form">
        <div className="section-container">
          <div className="contact-wrapper">
            <div className="contact-info">
              <p className="section-label">GET IN TOUCH</p>
              <h2>Let’s start a conversation</h2>
              <p className="contact-intro">Use the official contacts below or send a message directly from the form.</p>
              {[
                [Phone, "Phone", "Use the official contact details provided by the scheme"],
                [Mail, "Email", "Use the official contact details provided by the scheme"],
                [MessageCircle, "WhatsApp", "Member communication channel"],
                [MapPin, "Location", "Nairobi, Kenya"],
              ].map(([Icon, title, text]) => (
                <div className="contact-card" key={title}>
                  <div className="contact-icon"><Icon size={22} /></div>
                  <div><h4>{title}</h4><p>{text}</p></div>
                </div>
              ))}
            </div>

            <div className="contact-form-card">
              <h2>Send us a message</h2>
              {status.message && <div className={`contact-form-status ${status.type}`}>{status.type === "success" && <CheckCircle2 size={18} />} {status.message}</div>}
              <form className="contact-form" onSubmit={submit}>
                <div className="input-grid">
                  <input type="text" placeholder="Full Name" value={form.fullName} onChange={onChange("fullName")} required />
                  <input type="email" placeholder="Email Address" value={form.email} onChange={onChange("email")} required />
                </div>
                <input type="tel" placeholder="Phone Number" value={form.phone} onChange={onChange("phone")} />
                <input type="text" placeholder="Subject" value={form.subject} onChange={onChange("subject")} required />
                <textarea rows="7" placeholder="Write your message here..." value={form.message} onChange={onChange("message")} required />
                <button disabled={busy} type="submit">{busy ? <><Loader2 size={18} /> Sending...</> : <><Send size={18} /> Send Message</>}</button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
