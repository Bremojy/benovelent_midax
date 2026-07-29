import { LogOut, X } from "lucide-react";
import { NavLink } from "react-router-dom";

import { dashboardMenus } from "../../config/dashboardMenu";
import "../../styles/sidebar.css";

function DashboardSidebar({
  role,
  sidebarOpen,
  setSidebarOpen,
}) {
  // Get the correct menu based on role
  const menu = dashboardMenus[role] || dashboardMenus.member;

  const logout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
    <aside
      className={
        sidebarOpen
          ? "dashboard-sidebar open"
          : "dashboard-sidebar"
      }
    >
      <div className="sidebar-header">
        <h2>Benevolent Midax</h2>

        <button
          className="close-sidebar"
          onClick={() => setSidebarOpen(false)}
        >
          <X size={22} />
        </button>
      </div>

      <nav className="sidebar-menu">
        {menu.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.title}
              to={item.path}
              className={({ isActive }) =>
                isActive
                  ? "sidebar-link active"
                  : "sidebar-link"
              }
            >
              <Icon size={20} />
              <span>{item.title}</span>
            </NavLink>
          );
        })}
      </nav>

      <button
        className="logout-btn"
        onClick={logout}
      >
        <LogOut size={20} />
        <span>Logout</span>
      </button>
    </aside>
  );
}

export default DashboardSidebar;