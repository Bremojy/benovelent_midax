import { useState } from "react";
import { ChevronUp, LogOut, MoreHorizontal, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { dashboardMenus } from "../../config/dashboardMenu";
import "../../styles/sidebar.css";

function DashboardSidebar({ role, sidebarOpen, setSidebarOpen, mobileHidden = false, mobileBottomNav = false }) {
  const currentRole = role || "member";
  const menu = dashboardMenus[currentRole] || dashboardMenus.member;
  const { logout: authLogout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const mobilePrimaryItems = (() => {
    const preferred = currentRole === "member"
      ? ["Dashboard", "Contributions", "Support & Claims", "Messages"]
      : currentRole === "admin"
        ? ["Overview", "Members", "Claims / Support", "Communications"]
        : ["Control Center", "Members", "Financial Control", "Audit Logs"];
    return preferred
      .map((title) => menu.find((item) => item.title === title))
      .filter(Boolean);
  })();

  const mobileMoreItems = menu.filter(
    (item) => !mobilePrimaryItems.some((primary) => primary.path === item.path)
  );

  const logout = async () => {
    setMoreOpen(false);
    setSidebarOpen?.(false);
    await authLogout();
    window.location.href = "/login";
  };

  const handleNavigation = () => {
    setMoreOpen(false);
    setSidebarOpen?.(false);
  };

  const roleLabel = currentRole === "superadmin"
    ? "Super Admin"
    : currentRole === "admin"
      ? "Administrator"
      : "Member";

  const renderMenuLinks = (items) => (
    items.length > 0
      ? items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={`${item.title}-${item.path}`}
              to={item.path}
              onClick={handleNavigation}
              className={({ isActive }) => (isActive ? "sidebar-link active" : "sidebar-link")}
            >
              <Icon size={20} strokeWidth={2} />
              <span>{item.title}</span>
            </NavLink>
          );
        })
      : <div className="sidebar-empty">No menu items available.</div>
  );

  const renderMorePanel = () => (
    mobileMoreItems.length > 0 && moreOpen ? (
      <div className="mobile-more-panel" role="dialog" aria-label="More dashboard sections">
        <div className="mobile-more-panel-header">
          <div><strong>More sections</strong><span>{roleLabel} portal</span></div>
          <button type="button" onClick={() => setMoreOpen(false)} aria-label="Close more sections"><X size={18} /></button>
        </div>
        <div className="mobile-more-grid">
          {mobileMoreItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.path} to={item.path} onClick={handleNavigation} className="mobile-more-link">
                <Icon size={19} />
                <span>{item.title}</span>
              </NavLink>
            );
          })}
          <button type="button" className="mobile-more-link logout-more" onClick={logout}>
            <LogOut size={19} /><span>Logout</span>
          </button>
        </div>
      </div>
    ) : null
  );

  if (mobileBottomNav) {
    return (
      <>
        <aside className="dashboard-sidebar mobile-bottom-nav" aria-label="Dashboard quick navigation">
          <nav className="sidebar-menu" aria-label={`${roleLabel} quick navigation`}>
            {renderMenuLinks(mobilePrimaryItems)}
            {mobileMoreItems.length > 0 && (
              <button
                type="button"
                className={`sidebar-link sidebar-more-button ${moreOpen ? "active" : ""}`}
                onClick={() => setMoreOpen((value) => !value)}
                aria-expanded={moreOpen}
                aria-label="More dashboard sections"
              >
                {moreOpen ? <ChevronUp size={20} /> : <MoreHorizontal size={20} />}
                <span>More</span>
              </button>
            )}
          </nav>
          {renderMorePanel()}
        </aside>

        {sidebarOpen && (
          <aside className="dashboard-sidebar mobile-drawer open" aria-label="Full dashboard navigation">
            <div className="sidebar-header">
              <div className="sidebar-brand"><h2>Benevolent MIDAX</h2><span className="sidebar-role">{roleLabel}</span></div>
              <button type="button" className="close-sidebar" onClick={() => setSidebarOpen?.(false)} aria-label="Close sidebar"><X size={22} /></button>
            </div>
            <nav className="sidebar-menu" aria-label={`${roleLabel} navigation`}>
              {renderMenuLinks(menu)}
            </nav>
            <div className="sidebar-footer">
              <button type="button" className="logout-btn" onClick={logout}>
                <LogOut size={20} strokeWidth={2} /><span>Logout</span>
              </button>
            </div>
          </aside>
        )}
      </>
    );
  }

  return (
    <aside className={`${sidebarOpen ? "dashboard-sidebar open" : "dashboard-sidebar"} ${mobileHidden ? "mobile-hidden" : ""}`} aria-label="Dashboard navigation">
      <div className="sidebar-header">
        <div className="sidebar-brand"><h2>Benevolent MIDAX</h2><span className="sidebar-role">{roleLabel}</span></div>
        <button type="button" className="close-sidebar" onClick={() => setSidebarOpen?.(false)} aria-label="Close sidebar"><X size={22} /></button>
      </div>
      <nav className="sidebar-menu" aria-label={`${roleLabel} navigation`}>
        {renderMenuLinks(menu)}
      </nav>
      <div className="sidebar-footer">
        <button type="button" className="logout-btn" onClick={logout}><LogOut size={20} strokeWidth={2} /><span>Logout</span></button>
      </div>
    </aside>
  );
}

export default DashboardSidebar;
