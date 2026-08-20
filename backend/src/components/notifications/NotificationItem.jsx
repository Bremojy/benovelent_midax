import {
  Bell,
  Wallet,
  HandHeart,
  Newspaper,
} from "lucide-react";

import "../../pages/member/notifications.css";

function NotificationItem({ notification }) {

  const getIcon = () => {

    switch (notification.type) {

      case "payment":
        return <Wallet size={22} />;

      case "claim":
        return <HandHeart size={22} />;

      case "announcement":
        return <Newspaper size={22} />;

      default:
        return <Bell size={22} />;
    }
  };

  return (

    <div className="notification-card">

      <div className="notification-icon">

        {getIcon()}

      </div>

      <div className="notification-content">

        <h4>

          {notification.title}

        </h4>

        <p>

          {notification.message}

        </p>

        <span>

          {notification.time}

        </span>

      </div>

    </div>

  );

}

export default NotificationItem;