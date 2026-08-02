import { useState } from "react";
import { Phone, Mail, MessageCircle, MapPin, Send, CheckCircle2, Loader2 } from "lucide-react";
import API from "../services/api";

function Contact() {
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", subject: "", message: "" });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [sending, setSending] = useState(false);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: "", message: "" });
    setSending(true);
    try {
      const { data } = await API.post("/contact", form);
      setStatus({ type: "success", message: data.message || "Message sent successfully." });
      setForm({ fullName: "", email: "", phone: "", subject: "", message: "" });
    } catch (error) {
      setStatus({ type: "error", message: error.response?.data?.message || "Unable to send your message. Please try again." });
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="contact-page">
      <section className="contact-hero">
        <div className="hero-overlay" />
        <div className="section-container">
          <p className="section-label">CONTACT US</p>
          <h1>We'd Love<br />To Hear From You</h1>
          <p className="hero-description">Whether you have questions, suggestions, or need assistance, our team is always ready to help. Reach out and we'll respond as soon as possible.</p>
        </div>
      </section>

      <section className="section">
        <div className="section-container">
          <div className="contact-wrapper">
            <div className="contact-info">
              <p className="section-label">GET IN TOUCH</p>
              <h2>Let's Start A Conversation</h2>
              <p className="contact-intro">Benevolent Midax exists to serve and support our members. Feel free to contact us through any of the channels below.</p>
              {[
                [Phone, "Phone", "+254 700 000 000"],
                [Mail, "Email", "info@benevolentmidax.com"],
                [MessageCircle, "WhatsApp", "+254 700 000 000"],
                [MapPin, "Location", "Nairobi, Kenya"],
              ].map(([Icon, title, value]) => (
                <div className="contact-card" key={title}>
                  <div className="contact-icon"><Icon size={22} /></div>
                  <div><h4>{title}</h4><p>{value}</p></div>
                </div>
              ))}
            </div>

            <div className="contact-form-card">
              <h2>Send Us A Message</h2>
              <p>Fill in the form below and our administrators will be notified immediately.</p>
              {status.message && <div className={`contact-form-status ${status.type}`} role="alert">{status.type === "success" && <CheckCircle2 size={18} />}{status.message}</div>}
              <form className="contact-form" onSubmit={handleSubmit}>
                <div className="input-grid">
                  <input type="text" placeholder="Full Name" value={form.fullName} onChange={update("fullName")} required />
                  <input type="email" placeholder="Email Address" value={form.email} onChange={update("email")} required />
                </div>
                <input type="tel" placeholder="Phone Number" value={form.phone} onChange={update("phone")} />
                <input type="text" placeholder="Subject" value={form.subject} onChange={update("subject")} required />
                <textarea rows="7" placeholder="Write your message here..." value={form.message} onChange={update("message")} required />
                <button type="submit" disabled={sending}>{sending ? <><Loader2 size={18} className="login-spinner" /> Sending...</> : <><Send size={18} /> Send Message</>}</button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Contact;
