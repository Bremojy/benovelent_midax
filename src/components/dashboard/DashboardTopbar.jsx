import {
  Menu,
  ArrowLeft,
  Bell,
  MessageCircle,
  Search,
  Settings,
  LogOut,
  Download as DownloadIcon,
  House,
  ListChecks,
} from "lucide-react";

import { useEffect, useState } from "react";
import socket from "../../sockets/socket";
import API, { resolveUploadUrl } from "../../services/api";

import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

import "../../styles/topbar.css";

function DashboardTopbar({
  role,
  sidebarOpen,
  setSidebarOpen,
  user,
  homePath = "/member",
  showHomeBack = false,
  onHomeBack,
}) {
  const navigate = useNavigate();
  const { logout: authLogout } = useAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [unreadNotifications, setUnreadNotifications] = useState(
    Number(user?.unreadNotifications || 0)
  );

  const [unreadMessages, setUnreadMessages] = useState(Number(user?.unreadMessages || 0));

  const normalizedRole =
    (role || user?.role || "member").toLowerCase();

  useEffect(() => {
    let mounted = true;

    const loadUnread = async () => {
      try {
        const { data } = await API.get("/notifications/unread-count");
        if (mounted) setUnreadNotifications(Number(data?.unread || 0));
      } catch (error) {
        // Non-blocking.
      }
    };

    loadUnread();
    const interval = window.setInterval(loadUnread, 60000);
    const loadUnreadMessages = async () => {
      if (normalizedRole === "superadmin") return;
      try {
        const { data } = await API.get("/conversations");
        const conversations = Array.isArray(data?.conversations) ? data.conversations : [];
        const actorId = String(user?.chatId || user?._id || user?.id || "");
        const total = conversations.reduce((sum, conversation) => {
          const counts = conversation?.unreadCounts || {};
          return sum + Math.max(0, Number(counts?.[actorId] || 0) || 0);
        }, 0);
        if (mounted) setUnreadMessages(total);
      } catch {
        // Non-blocking.
      }
    };

    const onNotificationCount = (count) => {
      if (mounted) setUnreadNotifications(Math.max(0, Number(count) || 0));
    };
    const onMessage = () => { if (mounted) loadUnreadMessages(); };

    if (normalizedRole !== "superadmin") {
      loadUnreadMessages();
      if (!socket.connected) socket.connect();
      socket.on("new-message", onMessage);
    }
    socket.on("notification-count", onNotificationCount);
    return () => {
      mounted = false;
      window.clearInterval(interval);
      socket.off("notification-count", onNotificationCount);
      if (normalizedRole !== "superadmin") {
        socket.off("new-message", onMessage);
      }
    };
  }, [user?.unreadNotifications, normalizedRole]);

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
    else if (normalizedRole === "admin") navigate("/admin/messages");
  };

  const goToNotifications = () => {
    if (normalizedRole === "member") navigate("/member/notifications");
    else if (normalizedRole === "admin") navigate("/admin/notifications");
    else navigate("/superadmin/notifications");
  };

  const openInstall = () => window.dispatchEvent(new Event("benovelent:install-now"));
  const openCommandCenter = (term = "") => window.dispatchEvent(new CustomEvent("benovelent:open-command-center", { detail: { term } }));
  const openActionCenter = () => window.dispatchEvent(new Event("benovelent:open-action-center"));

  const goToSettings = () => {
    if (normalizedRole === "member") navigate("/member/settings");
    else if (normalizedRole === "admin") navigate("/admin/settings");
    else navigate("/superadmin/password");
  };

  const handleLogout = async () => {
    setProfileMenuOpen(false);
    try {
      await authLogout();
    } finally {
      window.location.href = "/login";
    }
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <header className="dashboard-topbar">

      {/* LEFT */}
      <div className="topbar-left">

        {showHomeBack ? (
          <button
            type="button"
            className="home-btn"
            onClick={onHomeBack || (() => navigate(homePath))}
            aria-label="Go back home"
            title="Go back home"
          >
            <ArrowLeft size={20} />
            <span>Home</span>
          </button>
        ) : (
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
        )}

        <button
          type="button"
          className="portal-website-home-btn"
          onClick={() => navigate("/")}
          aria-label="Open public website home"
          title="Public website home"
        >
          <House size={18} />
          <span>Website</span>
        </button>

        <div className="search-box">

          <Search size={18} />

          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onFocus={() => openCommandCenter(searchTerm)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              const term = searchTerm.trim();
              setSearchTerm("");
              openCommandCenter(term);
            }}
            placeholder="Search portal & records…"
            aria-label="Search authorized portal records"
          />

        </div>

      </div>

      {/* RIGHT */}
      <div className="topbar-right">

        {/* MESSAGES — deliberately hidden for SuperAdmin. */}
        {normalizedRole !== "superadmin" && (
          <button type="button" className="icon-btn" onClick={goToMessages} aria-label="Messages" title="Messages">
            <MessageCircle size={20} />
            {unreadMessages > 0 && <span className="badge">{unreadMessages > 99 ? "99+" : unreadMessages}</span>}
          </button>
        )}

        <button type="button" className="icon-btn action-center-btn" onClick={openActionCenter} aria-label="Open action center" title="Action center">
          <ListChecks size={20} />
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

        <button type="button" className="icon-btn install-topbar-btn" onClick={openInstall} aria-label="Install Benevolent MIDAX" title="Install Benevolent MIDAX"><DownloadIcon size={19}/><span>Install</span></button>

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

        <div className={`user-menu ${profileMenuOpen ? "open" : ""}`}>
          <button
            type="button"
            className="user-box"
            onClick={() => setProfileMenuOpen((open) => !open)}
            aria-expanded={profileMenuOpen}
            aria-haspopup="menu"
            title="Account menu"
          >

          <div className="avatar">
            {user?.profileImage ? (
              <img
                src={resolveUploadUrl(user.profileImage)}
                alt={user?.fullName || user?.name || "Profile"}
              />
            ) : (
              initials
            )}

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
          </button>

          {profileMenuOpen && (
            <div className="profile-dropdown" role="menu">
              <button type="button" onClick={goToSettings} role="menuitem">
                <Settings size={17} />
                Change password & settings
              </button>
              <button type="button" className="profile-logout" onClick={handleLogout} role="menuitem">
                <LogOut size={17} />
                Logout
              </button>
            </div>
          )}
        </div>

      </div>

    </header>
  );
}

export default DashboardTopbar;