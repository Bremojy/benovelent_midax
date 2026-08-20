import { useEffect, useMemo, useState } from "react";
import DashboardSidebar from "../components/dashboard/DashboardSidebar";
import DashboardTopbar from "../components/dashboard/DashboardTopbar";
import { useAuth } from "../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/dashboard.css";
import "../styles/dashboard-mobile.css";

function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(() => (typeof window !== "undefined" ? window.innerWidth > 900 : true));
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth <= 900 : false));
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
  const mobileSubpage = !isDashboardHome;
  // The mobile bottom dashboard dock belongs to the portal dashboard home only.
  // Portal subpages use the topbar menu + drawer instead of placing dashboard
  // navigation below their page content.
  const mobileBottomNav = isMobile && isDashboardHome;

  useEffect(() => {
    const resize = () => {
      const mobile = window.innerWidth <= 900;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setSidebarOpen(true);
      return;
    }
    setSidebarOpen(false);
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile || !sidebarOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isMobile, sidebarOpen]);

  const goHome = () => navigate(basePath);

  return (
    <div className={`dashboard-container portal-role-${String((role || user?.role || "member").toLowerCase())} ${mobileSubpage ? "dashboard-mobile-subpage" : ""} ${mobileBottomNav ? "dashboard-home-shell" : ""}`}>
      {isMobile && !mobileBottomNav && sidebarOpen && (
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
      <div className={`dashboard-main ${mobileSubpage ? "mobile-fullscreen" : ""}`}>
        <DashboardTopbar
          role={role}
          user={user}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          onLogout={logout}
          homePath={basePath}
          showHomeBack={isMobile && mobileSubpage}
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
