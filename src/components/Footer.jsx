import { Link } from "react-router-dom";
import {
  Mail,
  Phone,
  MapPin,
  MessageCircle,
  ArrowUp
} from "lucide-react";

function Footer() {
  return (
    <footer className="footer">

      <div className="footer-top">

        {/* LEFT */}

        <div className="footer-brand">

          <h2>
            Benevolent <span>Midax</span>
          </h2>

          <p>
            Standing together. Supporting one another through
            compassion, unity and financial assistance during
            life's most difficult moments.
          </p>

          <div className="footer-socials">

            <a
              href="https://chat.whatsapp.com/KmSFuwMsGze3A5FmZ9QP7I"
              target="_blank"
              rel="noopener noreferrer"
              title="Join WhatsApp"
            >
              <MessageCircle size={22} />
            </a>

 <div className="footer-contact">
  <MapPin size={18} />
  <a
    href="https://maps.google.com/?q=Nairobi,Kenya"
    target="_blank"
    rel="noopener noreferrer"
  >
    Nairobi, Kenya
  </a>
</div>

            

          </div>

        </div>


        {/* QUICK LINKS */}

        <div>

          <h3>Quick Links</h3>

          <Link to="/">Home</Link>

          <Link to="/about">
            About Us
          </Link>

          <Link to="/services">
            Services
          </Link>

          <Link to="/contact">
            Contact
          </Link>

        </div>


        {/* LEGAL */}

        <div>

          <h3>Legal</h3>

          <a href="#">
            Privacy Policy
          </a>

          <a href="#">
            Terms & Conditions
          </a>

          <a href="#">
            Disclaimer
          </a>

        </div>


        {/* CONTACT */}

        <div>

          <h3>Contact</h3>

          <div className="footer-contact">

            <Phone size={18} />
            <span>+254 7XX XXX XXX</span>

          </div>

          <div className="footer-contact">

            <Mail size={18} />
            <span>info@benevolentmidax.com</span>

          </div>

          <div className="footer-contact">

            <MapPin size={18} />
            <span>Nairobi, Kenya</span>

          </div>

        </div>

      </div>


      {/* BOTTOM */}

      <div className="footer-bottom">

        <p>
          © {new Date().getFullYear()} Benevolent Midax.
          All Rights Reserved.
        </p>

        <div className="footer-bottom-links">

          <Link to="/login">
            Admin Login
          </Link>

          <button
            className="scroll-top"
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              })
            }
          >
            <ArrowUp size={18} />
          </button>

        </div>

      </div>

    </footer>
  );
}

export default Footer;