import { Link, useLocation } from "react-router-dom";
import { Menu, X, ShieldCheck, Phone, MessageCircle, ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const close = () => setOpen(false);
  const active = (path) => (location.pathname === path ? "nav-link active" : "nav-link");

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 18);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => close(), [location.pathname]);

  return (
    <>
      <div className="public-utility-bar">
        <div className="public-utility-inner">
          <span><Phone size={13} /> Member support: use the Contact page or your portal</span>
          <span className="utility-right"><MessageCircle size={13} /> Private member chat available after sign-in</span>
        </div>
      </div>
      <header className={`navbar ${scrolled ? "navbar-scrolled" : ""}`}>
      <div className="navbar-container">
        <Link to="/" className="logo" onClick={close} aria-label="Benovelent Midax home">
          <span className="logo-icon"><svg viewBox="0 0 64 64" aria-hidden="true"><path d="M12 28c8-18 32-18 40 0-2 16-10 25-20 29C22 53 14 44 12 28Z" fill="none" stroke="currentColor" strokeWidth="4"/><path d="M18 28c7-9 21-9 28 0M22 37c6-5 14-5 20 0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg></span>
          <span className="logo-text"><span className="logo-main">Benovelent</span><span className="logo-sub">MIDAX</span></span>
        </Link>
        <nav className={open ? "nav-links open" : "nav-links"} aria-label="Primary navigation">
          <Link to="/" className={active("/")} onClick={close}>Home</Link>
          <Link to="/about" className={active("/about")} onClick={close}>About</Link>
          <Link to="/services" className={active("/services")} onClick={close}>Services</Link>
          <Link to="/news" className={active("/news")} onClick={close}>News</Link>
          <Link to="/contact" className={active("/contact")} onClick={close}>Contact</Link>
          <Link to="/login" className="admin-link" onClick={close}><ShieldCheck size={17}/> Member Portal <ArrowUpRight size={15}/></Link>
        </nav>
        <button type="button" className="menu-button" onClick={() => setOpen((v) => !v)} aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open}>
          {open ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>
      </header>
    </>
  );
}
