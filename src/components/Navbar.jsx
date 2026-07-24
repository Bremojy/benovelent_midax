import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <header className="navbar">

      <div className="navbar-container">

        {/* =========================
            LOGO
        ========================== */}

        <Link
          to="/"
          className="logo"
          onClick={closeMenu}
        >

          <span className="logo-icon">
            B
          </span>

          <span className="logo-text">

            <span className="logo-main">
              Benevolent
            </span>

            <span className="logo-sub">
              MIDAX
            </span>

          </span>

        </Link>


        {/* =========================
            DESKTOP NAVIGATION
        ========================== */}

        <nav
          className={
            menuOpen
              ? "nav-links open"
              : "nav-links"
          }
        >

          <Link
            to="/"
            className={
              isActive("/")
                ? "nav-link active"
                : "nav-link"
            }
            onClick={closeMenu}
          >
            Home
          </Link>


          <Link
            to="/about"
            className={
              isActive("/about")
                ? "nav-link active"
                : "nav-link"
            }
            onClick={closeMenu}
          >
            About Us
          </Link>


          <Link
            to="/services"
            className={
              isActive("/services")
                ? "nav-link active"
                : "nav-link"
            }
            onClick={closeMenu}
          >
            Services
          </Link>
<Link to="/members" onClick={() => setMenuOpen(false)}>
  Members
</Link>

          <Link
            to="/contact"
            className={
              isActive("/contact")
                ? "nav-link active"
                : "nav-link"
            }
            onClick={closeMenu}
          >
            Contact
          </Link>


          {/* ADMIN LOGIN */}

          <Link
            to="/login"
            className="admin-link"
            onClick={closeMenu}
          >
            Admin Login
          </Link>

        </nav>


        {/* =========================
            MOBILE MENU BUTTON
        ========================== */}

        <button
          type="button"
          className="menu-button"
          onClick={() =>
            setMenuOpen(!menuOpen)
          }
          aria-label={
            menuOpen
              ? "Close menu"
              : "Open menu"
          }
        >

          {menuOpen ? (
            <X size={26} />
          ) : (
            <Menu size={26} />
          )}

        </button>

      </div>

    </header>
  );
}

export default Navbar;