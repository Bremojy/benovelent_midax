import { useEffect, useMemo, useState } from "react";
import DashboardSidebar from "../components/dashboard/DashboardSidebar";
import DashboardTopbar from "../components/dashboard/DashboardTopbar";
import { useAuth } from "../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/dashboard.css";
import "../styles/dashboard-mobile.css";
import "../styles/final-ui-polish.css";

function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(() => (
    typeof window !== "undefined" ? window.innerWidth > 900 : true
  ));
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== "undefined" ? window.innerWidth <= 900 : false
  ));
  const { user, role, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const basePath = useMemo(() => {
    const normalizedRole = String(role || user?.role || "member").toLowerCase();
    if (normalizedRole === "admin") return "/admin";
    if (normalizedRole === "superadmin") return "/superadmin";
    return "/member";
  }, [role, user?.role]);

  const isDashboardHome = location.pathname === basePath || location.pathname === `${basePath}/`;
  const mobileBottomNav = isMobile;

  useEffect(() => {
    const resize = () => {
      const mobile = window.innerWidth <= 900;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true);
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setSidebarOpen(true);
      return;
    }
    setSidebarOpen(false);
  }, [isMobile]);

  // Lock document scrolling only while the mobile drawer is open.
  // Normal portal pages, including every mobile sub-page, always use the
  // document itself as the scroll container.
  useEffect(() => {
    const body = document.body;
    body.classList.add("benevolent-portal-active");

    if (!isMobile || !sidebarOpen) {
      body.style.overflowY = "auto";
      return () => {
        body.classList.remove("benevolent-portal-active");
      };
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };

    const previousOverflowY = body.style.overflowY;
    body.style.overflowY = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      body.style.overflowY = previousOverflowY || "auto";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isMobile, sidebarOpen]);

  useEffect(() => () => {
    document.body.classList.remove("benevolent-portal-active");
  }, []);

  const goHome = () => navigate(basePath);
  const portalRole = String(role || user?.role || "member").toLowerCase();

  return (
    <div
      className={`dashboard-container portal-role-${portalRole} ${
        isMobile ? "dashboard-mobile-shell" : "dashboard-desktop-shell"
      } ${isDashboardHome ? "dashboard-is-home dashboard-home-shell" : "dashboard-is-subpage dashboard-mobile-subpage"}`}
    >
      {isMobile && sidebarOpen && (
        <button
          type="button"
          className="dashboard-drawer-backdrop"
          aria-label="Close dashboard navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <DashboardSidebar
        role={role}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        mobileHidden={false}
        mobileBottomNav={mobileBottomNav}
      />

      <div className="dashboard-main">
        <DashboardTopbar
          role={role}
          user={user}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          onLogout={logout}
          homePath={basePath}
          showHomeBack={isMobile && !isDashboardHome}
          onHomeBack={goHome}
        />

        <main className="dashboard-content">
          <div className="dashboard-page">{children}</div>
        </main>

        <footer className="dashboard-portal-footer" aria-label="Portal footer">
          <span>Benevolent MIDAX</span>
          <span>Secure member portal</span>
        </footer>
      </div>
    </div>
  );
}

export default DashboardLayout;
