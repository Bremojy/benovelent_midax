import { useState } from "react";

import DashboardSidebar from "../components/dashboard/DashboardSidebar";
import DashboardTopbar from "../components/dashboard/DashboardTopbar";

import "../styles/dashboard.css";

function DashboardLayout({
  children,
}) {
  const [sidebarOpen, setSidebarOpen] =
    useState(window.innerWidth > 900);

  // Current logged-in user
  // Later this will come from AuthContext or backend
  const user = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  // Determine role
  let role = "member";

  if (localStorage.getItem("superAdminToken")) {
    role = "superadmin";
  } else if (localStorage.getItem("adminToken")) {
    role = "admin";
  } else if (localStorage.getItem("memberToken")) {
    role = "member";
  }

  return (
    <div className="dashboard-container">

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

          {children}

        </main>

      </div>

    </div>
  );
}

export default DashboardLayout;