import { Link, useLocation } from "react-router-dom";
import { Menu, X, ShieldCheck } from "lucide-react";
import { useState } from "react";

function Navbar({ variant = "default" }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const closeMenu = () => setMenuOpen(false);
  const isActive = (path) => location.pathname === path;

  return (
    <header className={`navbar ${variant === "login" ? "navbar-login" : ""}`}>
      <div className="navbar-container">
        <Link to="/" className="logo" onClick={closeMenu}>
          <span className="logo-icon">B</span>
          <span className="logo-text">
            <span className="logo-main">Benevolent</span>
            <span className="logo-sub">MIDAX</span>
          </span>
        </Link>

        <nav className={menuOpen ? "nav-links open" : "nav-links"}>
          <Link to="/" className={isActive("/") ? "nav-link active" : "nav-link"} onClick={closeMenu}>Home</Link>
          <Link to="/about" className={isActive("/about") ? "nav-link active" : "nav-link"} onClick={closeMenu}>About</Link>
          <Link to="/services" className={isActive("/services") ? "nav-link active" : "nav-link"} onClick={closeMenu}>Services</Link>
          <Link to="/constitution" className={isActive("/constitution") ? "nav-link active" : "nav-link"} onClick={closeMenu}>Constitution</Link>
          <Link to="/gallery" className={isActive("/gallery") ? "nav-link active" : "nav-link"} onClick={closeMenu}>Gallery</Link>
          <Link to="/leaders" className={isActive("/leaders") ? "nav-link active" : "nav-link"} onClick={closeMenu}>Leadership</Link>
          <Link to="/news" className={isActive("/news") ? "nav-link active" : "nav-link"} onClick={closeMenu}>News</Link>
          <Link to="/contact" className={isActive("/contact") ? "nav-link active" : "nav-link"} onClick={closeMenu}>Contact</Link>
          <Link to="/login" className="admin-link" onClick={closeMenu}>
            <ShieldCheck size={16} style={{ marginRight: 6 }} />
            Portal
          </Link>
        </nav>

        <button
          type="button"
          className="menu-button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>
    </header>
  );
}

export default Navbar;
