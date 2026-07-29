import { useEffect, useState } from "react";

import DashboardSidebar from "../components/dashboard/DashboardSidebar";
import DashboardTopbar from "../components/dashboard/DashboardTopbar";

import "../styles/dashboard.css";

function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(
    window.innerWidth > 992
  );

  const user = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  let role = "member";

  if (localStorage.getItem("superAdminToken")) {
    role = "superadmin";
  } else if (localStorage.getItem("adminToken")) {
    role = "admin";
  } else if (localStorage.getItem("memberToken")) {
    role = "member";
  }

  useEffect(() => {
    const resize = () => {
      if (window.innerWidth >= 992) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("resize", resize);

    return () =>
      window.removeEventListener(
        "resize",
        resize
      );
  }, []);

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
        setSidebarOpen={setSidebarOpen}
      />

<div className="dashboard-main">

    <DashboardTopbar
        role={role}
        user={user}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
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