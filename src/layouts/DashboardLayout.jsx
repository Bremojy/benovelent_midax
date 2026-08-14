import { useEffect, useMemo, useState } from "react";
import DashboardSidebar from "../components/dashboard/DashboardSidebar";
import DashboardTopbar from "../components/dashboard/DashboardTopbar";
import { useAuth } from "../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/dashboard.css";

function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
  const mobileSubpage = false;

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
    if (!isMobile) { setSidebarOpen(true); return; }
    setSidebarOpen(true);
  }, [isMobile]);

  const goHome = () => navigate(basePath);

  return (
    <div className={`dashboard-container portal-role-${String((role || user?.role || "member").toLowerCase())} ${mobileSubpage ? "dashboard-mobile-subpage" : ""}`}>
      <DashboardSidebar
        role={role}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        mobileHidden={false}
      />
      <div className={`dashboard-main ${mobileSubpage ? "mobile-fullscreen" : ""}`}>
        <DashboardTopbar
          role={role}
          user={user}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          onLogout={logout}
          homePath={basePath}
          showHomeBack={false}
          onHomeBack={goHome}
        />
        <main className="dashboard-content">
          <div className="dashboard-page">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
