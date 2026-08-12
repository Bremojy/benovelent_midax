import { useEffect, useState } from "react";
import { Bell, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import API from "../services/api";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export default function NotificationSettings() {
  const [status, setStatus] = useState("checking");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const supported = typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;

  const refresh = async () => {
    if (!supported) { setStatus("unsupported"); return; }
    if (Notification.permission === "denied") { setStatus("denied"); return; }
    try {
      const { data } = await API.get("/notifications/push/vapid-public-key");
      setStatus(data?.configured ? (Notification.permission === "granted" ? "granted" : "ready") : "unconfigured");
    } catch { setStatus(Notification.permission === "granted" ? "granted" : "ready"); }
  };

  useEffect(() => { refresh(); }, []);

  const enable = async () => {
    if (!supported) return;
    try {
      setBusy(true); setMessage("");
      const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (permission !== "granted") { setStatus("denied"); setMessage("Notifications are not enabled. Open your phone/browser notification settings to allow them for Benovelent Midax."); return; }
      const keyResponse = await API.get("/notifications/push/vapid-public-key");
      const publicKey = keyResponse.data?.publicKey;
      if (!publicKey) { setStatus("unconfigured"); setMessage("Phone notification service is not configured on the server yet."); return; }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      await API.post("/notifications/push/subscribe", { subscription: subscription.toJSON() });
      setStatus("granted");
      setMessage("Phone notifications are enabled for this device.");
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || "Unable to enable notifications.");
    } finally { setBusy(false); }
  };

  return (
    <section className="settings-panel notification-settings-panel">
      <div className="settings-panel-heading">
        <div className="settings-icon"><Bell size={20} /></div>
        <div><span>PHONE NOTIFICATIONS</span><h2>Enable app notifications</h2></div>
      </div>
      <p className="settings-description">Allow Benovelent Midax to alert you about new messages, finance updates and important announcements even when the installed app is not open.</p>
      {!supported && <div className="settings-message error"><ShieldAlert size={16}/> This device/browser does not support web push notifications.</div>}
      {status === "denied" && <div className="settings-message error"><ShieldAlert size={16}/> Notifications are blocked. Enable them in your phone/browser settings, then return here.</div>}
      {message && <div className="settings-message success"><CheckCircle2 size={16}/> {message}</div>}
      <button type="button" className="settings-primary-btn" onClick={enable} disabled={busy || !supported || status === "denied"}>
        {busy ? <Loader2 size={17} className="spin"/> : status === "granted" ? <CheckCircle2 size={17}/> : <Bell size={17}/>} 
        {busy ? "Enabling..." : status === "granted" ? "Notifications enabled" : "Enable phone notifications"}
      </button>
    </section>
  );
}
