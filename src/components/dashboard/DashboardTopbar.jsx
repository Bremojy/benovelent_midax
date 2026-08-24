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
} from "lucide-react";

import { useEffect, useState } from "react";
import { dashboardMenus } from "../../config/dashboardMenu";
import socket from "../../sockets/socket";
import API, { UPLOAD_URL } from "../../services/api";

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
    const interval = window.setInterval(loadUnread, 30000);
    const loadUnreadMessages = async () => {
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

    const onNotification = () => {
      if (mounted) {
        setUnreadNotifications((v) => Number(v) + 1);
        loadUnread();
      }
    };
    const onMessage = () => { if (mounted) loadUnreadMessages(); };

    loadUnreadMessages();
    if (!socket.connected) socket.connect();
    socket.on("new-notification", onNotification);
    socket.on("new-call-notification", onNotification);
    socket.on("new-message", onMessage);
    socket.on("message-seen", onMessage);
    return () => {
      mounted = false;
      window.clearInterval(interval);
      socket.off("new-notification", onNotification);
      socket.off("new-call-notification", onNotification);
      socket.off("new-message", onMessage);
      socket.off("message-seen", onMessage);
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
    else navigate("/superadmin/messages");

  };

  const goToNotifications = () => {
    if (normalizedRole === "member") navigate("/member/notifications");
    else if (normalizedRole === "admin") navigate("/admin/notifications");
    else navigate("/superadmin/notifications");
  };

  const openInstall = () => window.dispatchEvent(new Event("benovelent:install-now"));

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
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              const term = searchTerm.trim().toLowerCase();
              if (!term) return;
              const menu = dashboardMenus[normalizedRole] || [];
              const match = menu.find((item) => item.title.toLowerCase().includes(term));
              if (match) {
                setSearchTerm("");
                navigate(match.path);
              } else {
                window.dispatchEvent(new CustomEvent("benovelent:portal-search", { detail: { term } }));
              }
            }}
            placeholder="Jump to a portal section…"
            aria-label="Search portal sections"
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

        <button type="button" className="icon-btn install-topbar-btn" onClick={openInstall} aria-label="Install Benovelent MIDAX" title="Install Benovelent MIDAX"><DownloadIcon size={19}/><span>Install</span></button>

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
                src={
                  String(user.profileImage).startsWith("http")
                    ? user.profileImage
                    : `${UPLOAD_URL}${user.profileImage.startsWith("/") ? "" : "/"}${user.profileImage}`
                }
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