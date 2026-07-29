import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  User,
  Wallet,
  Newspaper,
  Vote,
  MessageCircle,
  Bell,
  Settings,
  LogOut,
  Users
} from "lucide-react";

import "./Sidebar.css";

function Sidebar({

  member,

  unreadMessages = 0,

  unreadNotifications = 0,

  onLogout

}) {

  return (

    <aside className="dashboard-sidebar">

      {/* ===========================
            PROFILE
      ============================ */}

      <div className="sidebar-profile">

        <img

          src={
            member?.profileImage ||
            "/default-avatar.png"
          }

          alt="profile"

        />

        <div>

          <h3>

            {member?.fullName || "Member"}

          </h3>

          <p>

            {member?.memberNumber || "MIDAX"}

          </p>

        </div>

        <span className="online-dot"></span>

      </div>

      {/* ===========================
            MENU
      ============================ */}

      <nav>

        <NavLink
          to="/member"
          end
          className="sidebar-link"
        >

          <LayoutDashboard size={20}/>

          Dashboard

        </NavLink>

        <NavLink
          to="/member/profile"
          className="sidebar-link"
        >

          <User size={20}/>

          My Profile

        </NavLink>

        <NavLink
          to="/member/contributions"
          className="sidebar-link"
        >

          <Wallet size={20}/>

          Contributions

        </NavLink>

        <NavLink
          to="/news"
          className="sidebar-link"
        >

          <Newspaper size={20}/>

          News

        </NavLink>

        <NavLink
          to="/member/polls"
          className="sidebar-link"
        >

          <Vote size={20}/>

          Polls

        </NavLink>

        <NavLink
          to="/member/chat"
          className="sidebar-link"
        >

          <MessageCircle size={20}/>

          Chats

          {unreadMessages > 0 && (

            <span className="sidebar-badge">

              {unreadMessages}

            </span>

          )}

        </NavLink>

        <NavLink
          to="/member/notifications"
          className="sidebar-link"
        >

          <Bell size={20}/>

          Notifications

          {unreadNotifications > 0 && (

            <span className="sidebar-badge">

              {unreadNotifications}

            </span>

          )}

        </NavLink>

        <NavLink
          to="/member/members"
          className="sidebar-link"
        >

          <Users size={20}/>

          Members

        </NavLink>

        <NavLink
          to="/member/settings"
          className="sidebar-link"
        >

          <Settings size={20}/>

          Settings

        </NavLink>

      </nav>

      {/* ===========================
            LOGOUT
      ============================ */}

      <button

        className="logout-btn"

        onClick={onLogout}

      >

        <LogOut size={20}/>

        Logout

      </button>

    </aside>

  );

}

export default Sidebar;