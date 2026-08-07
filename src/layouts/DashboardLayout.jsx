import { useEffect, useState } from "react";
import DashboardSidebar from "../components/dashboard/DashboardSidebar";
import DashboardTopbar from "../components/dashboard/DashboardTopbar";
import { useAuth } from "../context/AuthContext";
import "../styles/dashboard.css";

function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(true);
  const { user, role, logout } = useAuth();

  useEffect(() => {
    const resize = () => {
      const desktop = window.innerWidth >= 992;
      setIsDesktop(desktop);
      setSidebarOpen(desktop);
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <div className={`dashboard-container ${sidebarOpen ? "sidebar-open" : "sidebar-collapsed"} ${isDesktop ? "desktop" : "mobile"}`}>
      <DashboardSidebar role={role} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="dashboard-main">
        <DashboardTopbar
          role={role}
          user={user}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          onLogout={logout}
        />

        <main className="dashboard-content">
          <div className="dashboard-page">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
