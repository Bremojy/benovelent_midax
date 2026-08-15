import { LogOut, X, MoreHorizontal } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { dashboardMenus } from "../../config/dashboardMenu";
import "../../styles/sidebar.css";

function DashboardSidebar({ role, sidebarOpen, setSidebarOpen, mobileHidden = false, mobileBottomNav = false }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const currentRole = role || "member";
  const menu = dashboardMenus[currentRole] || dashboardMenus.member;
  const { logout: authLogout } = useAuth();

  const logout = async () => { if (setSidebarOpen) setSidebarOpen(false); await authLogout(); window.location.href = "/login"; };
  const handleNavigation = () => {
    if (window.innerWidth <= 900) {
      setSidebarOpen?.(mobileBottomNav);
      setMoreOpen(false);
    }
  };
  useEffect(() => {
    if (window.innerWidth > 900) setMoreOpen(false);
  }, []);

  const compactMenu = menu.slice(0, 4);
  const overflowMenu = menu.slice(4);
  const roleLabel = currentRole === "superadmin" ? "Super Admin" : currentRole === "admin" ? "Administrator" : "Member";

  return (
    <aside className={`${sidebarOpen ? "dashboard-sidebar open" : "dashboard-sidebar"} ${mobileHidden ? "mobile-hidden" : ""} ${mobileBottomNav ? "mobile-bottom-nav" : "mobile-drawer"}`} aria-label="Dashboard navigation">
      <div className="sidebar-header">
        <div className="sidebar-brand"><h2>Benovelent Midax</h2><span className="sidebar-role">{roleLabel}</span></div>
        <button type="button" className="close-sidebar" onClick={() => setSidebarOpen?.(false)} aria-label="Close sidebar"><X size={22} /></button>
      </div>
      <nav className="sidebar-menu" aria-label={`${roleLabel} navigation`}>
        {mobileBottomNav ? (
          compactMenu.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={`${item.title}-${item.path}`} to={item.path} onClick={handleNavigation} className={({ isActive }) => (isActive ? "sidebar-link active" : "sidebar-link")} title={item.title}>
                <Icon size={20} strokeWidth={2} />
                <span>{item.title}</span>
              </NavLink>
            );
          })
        ) : (
          menu.length > 0 ? menu.map((item) => { const Icon = item.icon; return (<NavLink key={`${item.title}-${item.path}`} to={item.path} onClick={handleNavigation} className={({ isActive }) => (isActive ? "sidebar-link active" : "sidebar-link")}><Icon size={20} strokeWidth={2} /><span>{item.title}</span></NavLink>); }) : <div className="sidebar-empty">No menu items available.</div>
        )}
      </nav>
      <div className={`sidebar-footer ${mobileBottomNav ? "compact-footer" : ""}`}>
        {mobileBottomNav && overflowMenu.length > 0 && (
          <button type="button" className="mobile-more-btn" onClick={() => { setMoreOpen(true); setSidebarOpen?.(false); }} title="More portal pages" aria-label="More portal pages">
            <MoreHorizontal size={20} />
            <span>More</span>
          </button>
        )}
        <button type="button" className="logout-btn" onClick={logout}><LogOut size={20} strokeWidth={2} /><span>Logout</span></button>
      </div>
      {mobileBottomNav && moreOpen && (
        <div className="mobile-more-backdrop" role="presentation" onClick={() => { setMoreOpen(false); setSidebarOpen?.(true); }}>
          <section className="mobile-more-drawer" role="dialog" aria-modal="true" aria-label="More portal pages" onClick={(event) => event.stopPropagation()}>
            <div className="mobile-more-header"><strong>More</strong><button type="button" onClick={() => { setMoreOpen(false); setSidebarOpen?.(true); }} aria-label="Close more pages"><X size={20}/></button></div>
            <div className="mobile-more-grid">
              {overflowMenu.map((item) => { const Icon = item.icon; return (
                <NavLink key={`${item.title}-${item.path}`} to={item.path} onClick={() => setMoreOpen(false)} className={({ isActive }) => isActive ? "mobile-more-link active" : "mobile-more-link"}>
                  <Icon size={20}/><span>{item.title}</span>
                </NavLink>
              ); })}
              <button type="button" className="mobile-more-link danger" onClick={logout}><LogOut size={20}/><span>Logout</span></button>
            </div>
          </section>
        </div>
      )}
    </aside>
  );
}

export default DashboardSidebar;
