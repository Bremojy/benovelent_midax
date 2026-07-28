import {
  LayoutDashboard,
  Globe,
  Image,
  UserRound,
  Users,
  Wallet,
  HandHeart,
  Phone,
  Settings,
  LogOut,
} from "lucide-react";

function Sidebar({
  activePage,
  navigateTo,
  logout,
  sidebarOpen,
}) {
  return (
    <aside
      className={`admin-sidebar ${
        sidebarOpen ? "open" : ""
      }`}
    >
      <div className="admin-logo">
        <h2>Benevolent</h2>
        <span>MIDAX ADMIN</span>
      </div>

      <nav className="admin-nav">

        <button
          className={
            activePage === "dashboard"
              ? "active"
              : ""
          }
          onClick={() => navigateTo("dashboard")}
        >
          <LayoutDashboard size={20} />
          Dashboard
        </button>

        <div className="admin-nav-label">
          WEBSITE MANAGEMENT
        </div>

        <button
          className={
            activePage === "content"
              ? "active"
              : ""
          }
          onClick={() => navigateTo("content")}
        >
          <Globe size={20} />
          Website Content
        </button>

        <button
          className={
            activePage === "carousel"
              ? "active"
              : ""
          }
          onClick={() => navigateTo("carousel")}
        >
          <Image size={20} />
          Carousel
        </button>

        <button
          className={
            activePage === "leaders"
              ? "active"
              : ""
          }
          onClick={() => navigateTo("leaders")}
        >
          <UserRound size={20} />
          Leaders
        </button>

        <div className="admin-nav-label">
          MEMBER MANAGEMENT
        </div>

        <button
          className={
            activePage === "members"
              ? "active"
              : ""
          }
          onClick={() => navigateTo("members")}
        >
          <Users size={20} />
          Members
        </button>

        <button
          className={
            activePage === "finances"
              ? "active"
              : ""
          }
          onClick={() => navigateTo("finances")}
        >
          <Wallet size={20} />
          Finances
        </button>

        <button
          className={
            activePage === "claims"
              ? "active"
              : ""
          }
          onClick={() => navigateTo("claims")}
        >
          <HandHeart size={20} />
          Claims
        </button>

        <button
          className={
            activePage === "contact"
              ? "active"
              : ""
          }
          onClick={() => navigateTo("contact")}
        >
          <Phone size={20} />
          Contact
        </button>

        <button
          className={
            activePage === "settings"
              ? "active"
              : ""
          }
          onClick={() => navigateTo("settings")}
        >
          <Settings size={20} />
          Settings
        </button>

        <button
          className="logout-button"
          onClick={logout}
        >
          <LogOut size={20} />
          Logout
        </button>
      </nav>
    </aside>
  );
}

export default Sidebar;