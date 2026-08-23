import { Bell, Wallet, Calendar, HandHeart, Megaphone, Phone, Video, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import API from "../../services/api";
import socket from "../../sockets/socket";
import "./NotificationCenter.css";

const iconFor = (type = "system") => {
  const t = String(type).toLowerCase();
  if (t.includes("contribution") || t.includes("finance") || t.includes("payment")) return Wallet;
  if (t.includes("claim") || t.includes("medical") || t.includes("funeral") || t.includes("education")) return HandHeart;
  if (t.includes("news") || t.includes("announcement")) return Megaphone;
  if (t.includes("video")) return Video;
  if (t.includes("call")) return Phone;
  if (t.includes("poll") || t.includes("event")) return Calendar;
  return AlertCircle;
};

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const load = async () => { try { const { data } = await API.get("/notifications", { params: { limit: 6 } }); setNotifications(Array.isArray(data?.notifications) ? data.notifications : []); } catch {} };
  useEffect(() => {
    load();
    const id = window.setInterval(load, 30000);
    const onConnect = () => socket.emit("notification-register");
    const onChange = () => load();
    if (!socket.connected) socket.connect();
    else onConnect();
    socket.on("connect", onConnect);
    socket.on("new-notification", onChange);
    socket.on("notification-updated", onChange);
    socket.on("notification-deleted", onChange);
    socket.on("notifications-cleared", onChange);
    return () => {
      window.clearInterval(id);
      socket.off("connect", onConnect);
      socket.off("new-notification", onChange);
      socket.off("notification-updated", onChange);
      socket.off("notification-deleted", onChange);
      socket.off("notifications-cleared", onChange);
    };
  }, []);
  return <div className="notification-card">
    <div className="notification-header"><h2><Bell size={22} />Notifications</h2><a href="/member/notifications">View All</a></div>
    <div className="notification-list">
      {notifications.length === 0 ? <div className="notification-empty">No notifications yet.</div> : notifications.map((item) => { const Icon = iconFor(item.type); return <div key={item._id} className={`notification-item ${item.read ? "read" : "unread"}`}><div className="notification-icon"><Icon size={20} /></div><div className="notification-content"><h4>{item.title}</h4><p>{item.message}</p></div><small>{item.createdAt ? new Date(item.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : ""}</small></div>; })}
    </div>
  </div>;
}
