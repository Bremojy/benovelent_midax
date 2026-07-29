import DashboardLayout from "../../layouts/DashboardLayout";

import NotificationItem from "../../components/notifications/NotificationItem";

import "./notifications.css";

function Notifications() {

  const notifications = [

    {
      id: 1,
      type: "payment",
      title: "Contribution Received",
      message: "Your monthly contribution has been received.",
      time: "2 minutes ago",
    },

    {
      id: 2,
      type: "claim",
      title: "Claim Approved",
      message: "Your medical claim has been approved.",
      time: "1 hour ago",
    },

    {
      id: 3,
      type: "announcement",
      title: "New Announcement",
      message: "Annual General Meeting this Saturday.",
      time: "Yesterday",
    },

  ];

  return (

    <DashboardLayout>

      <div className="notifications-page">

        <h1>

          Notifications

        </h1>

        {

          notifications.map(item => (

            <NotificationItem

              key={item.id}

              notification={item}

            />

          ))

        }

      </div>

    </DashboardLayout>

  );

}

export default Notifications;