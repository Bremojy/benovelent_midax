import { Link } from "react-router-dom";
import { ArrowUp, FileText, Instagram, Mail, MapPin, Newspaper, Phone } from "lucide-react";
import { usePublicSettings } from "../hooks/usePublicSettings";
import { usePublicWebsiteSection } from "../hooks/usePublicWebsiteSection";
import "./Footer.css";

const OFFICIAL_WHATSAPP = "https://wa.me/254729353487";
const OFFICIAL_INSTAGRAM = "https://instagram.com/midaxpetroleum";

function normalizeUrl(value) {
  const raw = String(value || "").trim();
  return /^https?:\/\//i.test(raw) ? raw : "";
}

export default function Footer() {
  const { settings } = usePublicSettings();
  const { section: footerSection } = usePublicWebsiteSection("footer");
  const org = settings?.organization || {};
  const social = org.socialChannels || {};
  const configuredInstagram = normalizeUrl(social.instagram);
  const configuredWhatsapp = normalizeUrl(social.whatsapp);
  const instagramUrl = configuredInstagram === OFFICIAL_INSTAGRAM ? configuredInstagram : OFFICIAL_INSTAGRAM;
  const whatsappUrl = configuredWhatsapp === OFFICIAL_WHATSAPP ? configuredWhatsapp : OFFICIAL_WHATSAPP;

  return (
    <footer className="footer" aria-label="Site footer">
      <div className="footer-glow footer-glow-one" aria-hidden="true" />
      <div className="footer-glow footer-glow-two" aria-hidden="true" />
      <div className="footer-top">
        <section className="footer-brand" aria-labelledby="footer-brand-title">
          <span className="footer-kicker">Benevolent MIDAX</span>
          <h2 id="footer-brand-title">{footerSection?.title || org.name || "Benevolent Midax"}</h2>
          <p>{footerSection?.subtitle || footerSection?.description || footerSection?.content?.body || settings?.website?.footer || settings?.website?.subtitle || "Official Benevolent MIDAX website."}</p>
          <div className="footer-socials" aria-label="Official social channels">
            <a className="footer-social footer-social-whatsapp" href={whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp MIDAX Chairman" title="WhatsApp MIDAX Chairman">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
                <path fill="currentColor" d="M12 2.25a9.75 9.75 0 0 0-8.4 14.7L2.5 21.5l4.7-1.08A9.75 9.75 0 1 0 12 2.25Zm0 17.75a7.96 7.96 0 0 1-4.06-1.1l-.29-.18-2.8.65.68-2.73-.19-.3A7.98 7.98 0 1 1 12 20Zm4.36-5.98c-.24-.12-1.43-.7-1.65-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.42-1.34-1.66-.14-.24-.01-.37.1-.49.1-.1.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.41-.54-.42h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.1.16 1.52.1.47-.07 1.43-.58 1.63-1.15.2-.57.2-1.05.14-1.15-.06-.1-.22-.16-.46-.28Z" />
              </svg>
              <span>WhatsApp</span>
            </a>
            <a className="footer-social footer-social-instagram" href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram midaxpetroleum" title="Instagram midaxpetroleum">
              <Instagram size={20} aria-hidden="true" />
              <span>Instagram</span>
            </a>
            <Link className="footer-social footer-social-news" to="/news" aria-label="News and updates">
              <Newspaper size={20} aria-hidden="true" />
              <span>News</span>
            </Link>
          </div>
          {(org.address || org.location) ? (
            <div className="footer-contact"><MapPin size={17} aria-hidden="true" /><span>{org.address || org.location}</span></div>
          ) : null}
        </section>

        <nav aria-label="Quick links" className="footer-column">
          <h3>Quick Links</h3>
          <Link to="/">Home</Link>
          <Link to="/about">About Us</Link>
          <Link to="/services">Services</Link>
          <Link to="/news">News</Link>
          <Link to="/contact">Contact</Link>
        </nav>

        <nav aria-label="Resources" className="footer-column">
          <h3>Resources</h3>
          <Link to="/constitution">Constitution</Link>
          <Link to="/gallery">Gallery</Link>
          <Link to="/leaders">Leaders</Link>
          <Link to="/privacy-policy">Privacy Policy</Link>
          <Link to="/terms-conditions">Terms &amp; Conditions</Link>
          <Link to="/disclaimer">Disclaimer</Link>
        </nav>

        <section className="footer-column" aria-labelledby="footer-support-title">
          <h3 id="footer-support-title">Support</h3>
          <div className="footer-support-card">
            {org.phone ? <div className="footer-contact"><Phone size={17} aria-hidden="true" /><a href={`tel:${org.phone}`}>{org.phone}</a></div> : null}
            {org.email ? <div className="footer-contact"><Mail size={17} aria-hidden="true" /><a href={`mailto:${org.email}`}>{org.email}</a></div> : null}
            <div className="footer-contact"><FileText size={17} aria-hidden="true" /><span>Official constitution and published scheme information</span></div>
          </div>
        </section>
      </div>

      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} {org.name || "Benevolent Midax"}. All Rights Reserved.</p>
        <div className="footer-bottom-links">
          <Link to="/privacy-policy">Privacy</Link>
          <Link to="/terms-conditions">Terms</Link>
          <button type="button" className="scroll-top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top" title="Back to top">
            <ArrowUp size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </footer>
  );
}
