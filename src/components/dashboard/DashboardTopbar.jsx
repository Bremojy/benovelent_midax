import {
  Menu,
  Bell,
  MessageCircle,
  Search,
  Settings,
} from "lucide-react";

import "../../styles/topbar.css";

function DashboardTopbar({
  role,
  sidebarOpen,
  setSidebarOpen,
  user,
}) {

  const unreadMessages =
    user?.unreadMessages || 0;

  const unreadNotifications =
    user?.unreadNotifications || 0;

  const initials =
    (
      user?.fullName ||
      user?.name ||
      "Member"
    )
      .charAt(0)
      .toUpperCase();

  return (

    <header className="dashboard-topbar">

      {/* LEFT */}

      <div className="topbar-left">

        <button
          className="menu-btn"
          onClick={() =>
            setSidebarOpen(!sidebarOpen)
          }
        >
          <Menu size={23} />
        </button>

        <div className="search-box">

          <Search size={18} />

          <input
            type="text"
            placeholder="Search members, news, claims..."
          />

        </div>

      </div>

      {/* RIGHT */}

      <div className="topbar-right">

        <button className="icon-btn">

          <MessageCircle size={20} />

          {unreadMessages > 0 && (

            <span className="badge">

              {unreadMessages}

            </span>

          )}

        </button>

        <button className="icon-btn">

          <Bell size={20} />

          {unreadNotifications > 0 && (

            <span className="badge">

              {unreadNotifications}

            </span>

          )}

        </button>

        <button className="icon-btn">

          <Settings size={20} />

        </button>

        <div className="user-box">

          <div className="avatar">

            {initials}

            {user?.online && (

              <span className="online-dot"></span>

            )}

          </div>

          <div className="user-info">

            <h4>

              {
                user?.fullName ||
                user?.name ||
                "Member"
              }

            </h4>

            <p>

              {
                role === "superadmin"
                  ? "Super Administrator"
                  : role === "admin"
                  ? "Administrator"
                  : "Verified Member"
              }

            </p>

          </div>

        </div>

      </div>

    </header>

  );

}

export default DashboardTopbar;