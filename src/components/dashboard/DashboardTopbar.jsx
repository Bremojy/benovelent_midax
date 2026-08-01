import {
  Menu,
  Bell,
  MessageCircle,
  Search,
  Settings,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import "../../styles/topbar.css";

function DashboardTopbar({
  role,
  sidebarOpen,
  setSidebarOpen,
  user,
}) {
  const navigate = useNavigate();

  const unreadMessages =
    user?.unreadMessages || 0;

  const unreadNotifications =
    user?.unreadNotifications || 0;

  const normalizedRole =
    (role || user?.role || "member").toLowerCase();

  const initials = (
    user?.fullName ||
    user?.name ||
    "Member"
  )
    .trim()
    .charAt(0)
    .toUpperCase();

  // ========================================
  // ROLE BASE PATH
  // ========================================

  const basePath =
    normalizedRole === "superadmin"
      ? "/superadmin"
      : normalizedRole === "admin"
      ? "/admin"
      : "/member";

  // ========================================
  // NAVIGATION
  // ========================================

  const goToMessages = () => {
    if (normalizedRole === "member") navigate("/member/messages");
    else if (normalizedRole === "admin") navigate("/admin/members");
    else navigate("/superadmin/admins");
  };

  const goToNotifications = () => {
    if (normalizedRole === "member") navigate("/member/notifications");
    else navigate(basePath);
  };

  const goToSettings = () => {
    if (normalizedRole === "member") navigate("/member/settings");
    else navigate(basePath);
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <header className="dashboard-topbar">

      {/* LEFT */}
      <div className="topbar-left">

        <button
          type="button"
          className="menu-btn"
          onClick={() =>
            setSidebarOpen(!sidebarOpen)
          }
          aria-label="Toggle sidebar"
        >
          <Menu size={23} />
        </button>

        <div className="search-box">

          <Search size={18} />

          <input
            type="text"
            placeholder="Search members, news, claims..."
            aria-label="Search"
          />

        </div>

      </div>

      {/* RIGHT */}
      <div className="topbar-right">

        {/* MESSAGES */}

        <button
          type="button"
          className="icon-btn"
          onClick={goToMessages}
          aria-label="Messages"
          title="Messages"
        >
          <MessageCircle size={20} />

          {unreadMessages > 0 && (
            <span className="badge">
              {unreadMessages > 99
                ? "99+"
                : unreadMessages}
            </span>
          )}
        </button>

        {/* NOTIFICATIONS */}

        <button
          type="button"
          className="icon-btn"
          onClick={goToNotifications}
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell size={20} />

          {unreadNotifications > 0 && (
            <span className="badge">
              {unreadNotifications > 99
                ? "99+"
                : unreadNotifications}
            </span>
          )}
        </button>

        {/* SETTINGS */}

        <button
          type="button"
          className="icon-btn"
          onClick={goToSettings}
          aria-label="Settings"
          title="Settings"
        >
          <Settings size={20} />
        </button>

        {/* USER */}

        <div className="user-box">

          <div className="avatar">

            {initials}

            {user?.online && (
              <span className="online-dot" />
            )}

          </div>

          <div className="user-info">

            <h4>
              {user?.fullName ||
                user?.name ||
                "Member"}
            </h4>

            <p>
              {normalizedRole === "superadmin"
                ? "Super Administrator"
                : normalizedRole === "admin"
                ? "Administrator"
                : "Verified Member"}
            </p>

          </div>

        </div>

      </div>

    </header>
  );
}

export default DashboardTopbar;