import {
  Bell,
} from "lucide-react";

import "../../styles/member.css";

function AnnouncementsCard() {

  const announcements = [

    {
      title: "Monthly Contribution Reminder",
      date: "25 Jul 2026",
    },

    {
      title: "Emergency Meeting",
      date: "20 Jul 2026",
    },

    {
      title: "Policy Update",
      date: "15 Jul 2026",
    },

  ];

  return (

    <div className="announcement-card">

      <h3>Recent Announcements</h3>

      {

        announcements.map((item, index) => (

          <div
            key={index}
            className="announcement-item"
          >

            <Bell size={18} />

            <div>

              <h4>{item.title}</h4>

              <p>{item.date}</p>

            </div>

          </div>

        ))

      }

    </div>

  );

}

export default AnnouncementsCard;