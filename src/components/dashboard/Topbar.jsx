import { useState } from "react";
import {
  Search,
  Bell,
  MessageCircle,
  Menu,
  ChevronDown
} from "lucide-react";

import "./Topbar.css";

function Topbar({

  member,

  unreadMessages = 0,

  unreadNotifications = 0,

  onMenuClick

}) {

  const [showMenu, setShowMenu] = useState(false);

  const today = new Date().toLocaleDateString(
    "en-GB",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }
  );

  return (

    <header className="topbar">

      {/* LEFT */}

      <div className="topbar-left">

        <button
          className="menu-toggle"
          onClick={onMenuClick}
        >
          <Menu size={24}/>
        </button>

        <div className="topbar-search">

          <Search size={18}/>

          <input
            type="text"
            placeholder="Search members, news, chats..."
          />

        </div>

      </div>

      {/* RIGHT */}

      <div className="topbar-right">

        <span className="today-date">

          {today}

        </span>

        {/* MESSAGES */}

        <button className="icon-button">

          <MessageCircle size={22}/>

          {unreadMessages > 0 && (

            <span className="icon-badge">

              {unreadMessages}

            </span>

          )}

        </button>

        {/* NOTIFICATIONS */}

        <button className="icon-button">

          <Bell size={22}/>

          {unreadNotifications > 0 && (

            <span className="icon-badge">

              {unreadNotifications}

            </span>

          )}

        </button>

        {/* PROFILE */}

        <div
          className="profile-menu"
          onClick={() =>
            setShowMenu(!showMenu)
          }
        >

          <img
            src={
              member?.profileImage ||
              "/default-avatar.png"
            }
            alt="profile"
          />

          <div>

            <h4>

              {member?.fullName || "Member"}

            </h4>

            <p>

              {member?.role || "Member"}

            </p>

          </div>

          <ChevronDown size={18}/>

          {showMenu && (

            <div className="dropdown-menu">

              <button>

                My Profile

              </button>

              <button>

                Settings

              </button>

              <button>

                Help

              </button>

            </div>

          )}

        </div>

      </div>

    </header>

  );

}

export default Topbar;