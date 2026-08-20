
import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, History, RefreshCw, Trash2 } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../services/api";
import "./notifications.css";

export default function Notifications() {
  const [activeNotifications, setActiveNotifications] = useState([]);
  const [historyNotifications, setHistoryNotifications] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await API.get("/notifications");
      const all = Array.isArray(data?.notifications) ? data.notifications : [];
      setActiveNotifications(all.filter((item) => !item.read));
      setHistoryNotifications(all.filter((item) => item.read));
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const unreadCount = useMemo(() => activeNotifications.length, [activeNotifications]);

  const markOne = async (id) => {
    try {
      setBusy(true);
      await API.put(`/notifications/${id}/read`);
      await load();
      setMessage("Notification marked as read.");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to update notification.");
    } finally {
      setBusy(false);
    }
  };

  const markAll = async () => {
    try {
      setBusy(true);
      await API.put("/notifications/read-all");
      setHistoryNotifications((previous) => [
        ...activeNotifications.map((item) => ({ ...item, read: true, readAt: new Date().toISOString() })),
        ...previous,
      ]);
      setActiveNotifications([]);
      setShowHistory(true);
      setMessage("All notifications moved to history.");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to mark notifications as read.");
    } finally {
      setBusy(false);
    }
  };

  const clearHistory = async () => {
    try {
      setBusy(true);
      await API.delete("/notifications/clear");
      setHistoryNotifications([]);
      setMessage("Notification history cleared.");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to clear history.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="notifications-page portal-module">
        <header className="portal-module-header">
          <div>
            <span>ALERTS & UPDATES</span>
            <h1>Notifications</h1>
            <p>Keep track of live alerts from the constitution, support team, finance and polls.</p>
          </div>
          <div className="portal-actions">
            <button className="portal-btn secondary" onClick={load} disabled={loading || busy}><RefreshCw size={16} /> Refresh</button>
            <button className="portal-btn" onClick={() => setShowHistory((v) => !v)} disabled={busy}>
              <History size={16} /> {showHistory ? "Hide history" : "Notification history"}
            </button>
          </div>
        </header>

        {message && <div className="portal-alert success">{message}</div>}
        {error && <div className="portal-alert">{error}</div>}

        <section className="portal-panel">
          <div className="notifications-summary">
            <div>
              <span>UNREAD</span>
              <strong>{unreadCount}</strong>
            </div>
            <button className="portal-btn" onClick={markAll} disabled={busy || unreadCount === 0}>
              <CheckCheck size={16} /> Mark all as read
            </button>
          </div>

          {loading ? (
            <div className="portal-empty">Loading notifications...</div>
          ) : activeNotifications.length === 0 ? (
            <div className="portal-empty">No active notifications right now.</div>
          ) : (
            <div className="notifications-list">
              {activeNotifications.map((notification) => (
                <article className="notification-card" key={notification._id}>
                  <div className="notification-icon">
                    <Bell size={18} />
                  </div>
                  <div className="notification-content">
                    <h3>{notification.title || "Notification"}</h3>
                    <p>{notification.message || "You have a new update."}</p>
                    <small>{formatDate(notification.createdAt)}</small>
                  </div>
                  <button className="portal-btn secondary" onClick={() => markOne(notification._id)} disabled={busy}>
                    <CheckCheck size={15} /> Read
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        {showHistory && (
          <section className="portal-panel">
            <div className="notifications-history-header">
              <h2>Notification history</h2>
              <button className="portal-btn danger" onClick={clearHistory} disabled={busy || historyNotifications.length === 0}>
                <Trash2 size={15} /> Clear history
              </button>
            </div>

            {historyNotifications.length === 0 ? (
              <div className="portal-empty">No notification history yet.</div>
            ) : (
              <div className="notifications-list history">
                {historyNotifications.map((notification) => (
                  <article className="notification-card history" key={notification._id}>
                    <div className="notification-icon muted">
                      <History size={18} />
                    </div>
                    <div className="notification-content">
                      <h3>{notification.title || "Notification"}</h3>
                      <p>{notification.message || "Previously read notification."}</p>
                      <small>{formatDate(notification.readAt || notification.updatedAt || notification.createdAt)}</small>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}

function formatDate(value) {
  if (!value) return "Recent";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recent";
  return date.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
