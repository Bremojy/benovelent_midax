import {
  Bell,
  Wallet,
  Calendar,
  HandHeart,
  Megaphone,
  Cake,
} from "lucide-react";

import "./NotificationCenter.css";

const notifications = [

  {
    id: 1,
    icon: Wallet,
    color: "#16a34a",
    title: "Contribution Received",
    message: "Your July contribution has been recorded successfully.",
    time: "5 min ago",
  },

  {
    id: 2,
    icon: HandHeart,
    color: "#ff7a00",
    title: "Claim Update",
    message: "Your assistance request is under review.",
    time: "20 min ago",
  },

  {
    id: 3,
    icon: Megaphone,
    color: "#2563eb",
    title: "Announcement",
    message: "Monthly meeting this Saturday at 2:00 PM.",
    time: "1 hour ago",
  },

  {
    id: 4,
    icon: Calendar,
    color: "#9333ea",
    title: "Upcoming Event",
    message: "Annual General Meeting starts next week.",
    time: "Yesterday",
  },

  {
    id: 5,
    icon: Cake,
    color: "#ec4899",
    title: "Birthday",
    message: "Wish Jane Wanjiku a happy birthday today.",
    time: "Today",
  },

];

export default function NotificationCenter() {

  return (

    <div className="notification-card">

      <div className="notification-header">

        <h2>

          <Bell size={22} />

          Notifications

        </h2>

        <button>

          View All

        </button>

      </div>

      <div className="notification-list">

        {notifications.map(item => {

          const Icon = item.icon;

          return (

            <div
              key={item.id}
              className="notification-item"
            >

              <div
                className="notification-icon"
                style={{
                  background: item.color
                }}
              >

                <Icon size={20} color="#fff"/>

              </div>

              <div className="notification-content">

                <h4>{item.title}</h4>

                <p>{item.message}</p>

              </div>

              <small>{item.time}</small>

            </div>

          );

        })}

      </div>

    </div>

  );

}