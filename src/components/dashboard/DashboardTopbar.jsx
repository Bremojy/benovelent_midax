import {
  Menu,
  Bell,
  MessageCircle,
  Search
} from "lucide-react";

import "../../styles/topbar.css";

function DashboardTopbar({
  role,
  sidebarOpen,
  setSidebarOpen,
  user,
}) {
  return (
    <header className="dashboard-topbar">

      <div className="topbar-left">

        <button
          className="menu-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu size={24} />
        </button>

        <div className="search-box">

          <Search size={18} />

          <input
            type="text"
            placeholder="Search..."
          />

        </div>

      </div>

      <div className="topbar-right">

        <button className="icon-btn">
          <MessageCircle size={20} />
          <span className="badge">0</span>
        </button>

        <button className="icon-btn">
          <Bell size={20} />
          <span className="badge">0</span>
        </button>

        <div className="user-box">

          <div className="avatar">
            {user?.name
              ? user.name.charAt(0).toUpperCase()
              : "U"}
          </div>

          <div className="user-info">

            <h4>
              {user?.name || "User"}
            </h4>

            <p>
              {role === "superadmin"
                ? "Super Administrator"
                : role === "admin"
                ? "Administrator"
                : "Member"}
            </p>

          </div>

        </div>

      </div>

    </header>
  );
}

export default DashboardTopbar;