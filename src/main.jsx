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
import "./styles/portal-shell-final.css";

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

// Prime foreground call audio after the browser receives a real user gesture.
// When the tab/browser is hidden or closed, the service-worker push notification
// is the supported alert channel; arbitrary page audio cannot be guaranteed there.
window.addEventListener("pointerdown", async () => {
  try {
    const { unlockCallAudio } = await import("./utils/callTone");
    await unlockCallAudio();
  } catch {}
}, { once: true, passive: true });
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      if (import.meta.env.DEV) {
        // Never let the production PWA service worker control the Vite dev
        // server. It can cache Vite dependency chunks and @vite/client, which
        // causes stale React runtimes and HMR WebSocket 400 errors.
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
        return;
      }

      await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
      // Push subscription persistence is intentionally handled by AuthContext after
      // the server has confirmed a real authenticated account. This prevents the
      // public website/login page from POSTing to the protected subscribe endpoint.
    } catch (error) {
      console.debug("Service worker/push bootstrap skipped:", error?.message || error);
    }
  });
}
