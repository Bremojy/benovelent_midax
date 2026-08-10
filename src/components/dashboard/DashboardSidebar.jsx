import { LogOut, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { dashboardMenus } from "../../config/dashboardMenu";
import "../../styles/sidebar.css";

function DashboardSidebar({ role, sidebarOpen, setSidebarOpen, mobileHidden = false }) {
  const currentRole = role || "member";
  const menu = dashboardMenus[currentRole] || dashboardMenus.member;
  const { logout: authLogout } = useAuth();

  const logout = async () => { if (setSidebarOpen) setSidebarOpen(false); await authLogout(); window.location.href = "/login"; };
  const handleNavigation = () => { if (window.innerWidth <= 900 && setSidebarOpen) setSidebarOpen(false); };
  const roleLabel = currentRole === "superadmin" ? "Super Admin" : currentRole === "admin" ? "Administrator" : "Member";

  return (
    <aside className={`${sidebarOpen ? "dashboard-sidebar open" : "dashboard-sidebar"} ${mobileHidden ? "mobile-hidden" : ""}`} aria-label="Dashboard navigation">
      <div className="sidebar-header">
        <div className="sidebar-brand"><h2>Benevolent Midax</h2><span className="sidebar-role">{roleLabel}</span></div>
        <button type="button" className="close-sidebar" onClick={() => setSidebarOpen?.(false)} aria-label="Close sidebar"><X size={22} /></button>
      </div>
      <nav className="sidebar-menu" aria-label={`${roleLabel} navigation`}>
        {menu.length > 0 ? menu.map((item) => { const Icon = item.icon; return (<NavLink key={`${item.title}-${item.path}`} to={item.path} onClick={handleNavigation} className={({ isActive }) => (isActive ? "sidebar-link active" : "sidebar-link")}><Icon size={20} strokeWidth={2} /><span>{item.title}</span></NavLink>); }) : <div className="sidebar-empty">No menu items available.</div>}
      </nav>
      <div className="sidebar-footer"><button type="button" className="logout-btn" onClick={logout}><LogOut size={20} strokeWidth={2} /><span>Logout</span></button></div>
    </aside>
  );
}

export default DashboardSidebar;
