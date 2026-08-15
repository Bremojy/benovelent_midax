import {
  StrictMode,
} from "react";

import {
  createRoot,
} from "react-dom/client";

import App from "./App.jsx";

import {
  SocketProvider,
} from "./context/SocketContext.jsx";

import {
  AuthProvider,
} from "./context/AuthContext.jsx";

import "./index.css";
import "./styles/feedback-pwa.css";
import "./styles/v9-modern-forms.css";
import "./styles/v11-responsive-hardening.css";
import "./App.css";

createRoot(
  document.getElementById("root")
).render(

  <StrictMode>

    <AuthProvider>

      <SocketProvider>

        <App />

      </SocketProvider>

    </AuthProvider>

  </StrictMode>

);
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
      if ("Notification" in window && "PushManager" in window && Notification.permission === "granted") {
        // The settings page remains responsible for first-time permission prompts.
        // Once permission exists, refresh the subscription automatically after each login/app load.
        const { default: API } = await import("./services/api");
        const { data } = await API.get("/notifications/push/vapid-public-key");
        if (data?.configured && data?.publicKey) {
          const key = data.publicKey;
          const padding = "=".repeat((4 - (key.length % 4)) % 4);
          const raw = window.atob((key + padding).replace(/-/g, "+").replace(/_/g, "/"));
          const appServerKey = Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
          let subscription = await registration.pushManager.getSubscription();
          if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appServerKey });
          if (subscription) await API.post("/notifications/push/subscribe", { subscription: subscription.toJSON() });
        }
      }
    } catch (error) {
      console.debug("Service worker/push bootstrap skipped:", error?.message || error);
    }
  });
}
