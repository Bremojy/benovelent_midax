import {
  useEffect,
  useState,
} from "react";

import DashboardSidebar
  from "../components/dashboard/DashboardSidebar";

import DashboardTopbar
  from "../components/dashboard/DashboardTopbar";

import {
  useAuth,
} from "../context/AuthContext";

import "../styles/dashboard.css";

function DashboardLayout({
  children,
}) {
  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const {
    user,
    role,
    logout,
  } = useAuth();

  // ======================================
  // RESPONSIVE SIDEBAR
  // ======================================

  useEffect(() => {
    const resize = () => {
      if (window.innerWidth >= 992) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    window.addEventListener(
      "resize",
      resize
    );

    return () =>
      window.removeEventListener(
        "resize",
        resize
      );
  }, []);

  // ======================================
  // DASHBOARD
  // ======================================

  return (
    <div className="dashboard-container">

      {sidebarOpen && (
        <div
          className="dashboard-overlay"
          onClick={() =>
            window.innerWidth < 992 &&
            setSidebarOpen(false)
          }
        />
      )}

      <DashboardSidebar
        role={role}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={
          setSidebarOpen
        }
      />

      <div className="dashboard-main">

        <DashboardTopbar
          role={role}
          user={user}
          sidebarOpen={
            sidebarOpen
          }
          setSidebarOpen={
            setSidebarOpen
          }
          onLogout={logout}
        />

        <main className="dashboard-content">

          <div className="dashboard-page">

            {children}

          </div>

        </main>

      </div>

    </div>
  );
}

export default DashboardLayout;