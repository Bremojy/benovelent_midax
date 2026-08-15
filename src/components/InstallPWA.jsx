import { useEffect, useRef, useState } from "react";
import { Download, X } from "lucide-react";
import "../styles/feedback-pwa.css";

const isStandalone = () => Boolean(
  window.matchMedia?.("(display-mode: standalone)")?.matches ||
  window.navigator?.standalone === true
);
const isIOS = () => /iphone|ipad|ipod/i.test(window.navigator?.userAgent || "");

export default function InstallPWA() {
  const deferredPromptRef = useRef(null);
  const [installed, setInstalled] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return undefined;
    }

    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      deferredPromptRef.current = event;
      window.__benovelentPwaPrompt = event;
    };

    const onInstalled = () => {
      deferredPromptRef.current = null;
      window.__benovelentPwaPrompt = null;
      setInstalled(true);
      setNotice(null);
    };

    const onDirectInstall = async () => {
      if (isStandalone()) return;
      const prompt = deferredPromptRef.current || window.__benovelentPwaPrompt;
      if (prompt) {
        try {
          await prompt.prompt();
          await prompt.userChoice;
        } catch (error) {
          console.debug("PWA install prompt was dismissed or unavailable.", error);
        } finally {
          deferredPromptRef.current = null;
          window.__benovelentPwaPrompt = null;
        }
        return;
      }

      if (isIOS()) {
        setNotice({
          title: "Add MIDAX to your Home Screen",
          body: <>Tap <b>Share</b> in Safari, then choose <b>Add to Home Screen</b>.</>,
        });
      } else {
        // Chromium only emits beforeinstallprompt when the browser decides the
        // install criteria are met. Do not cover the dashboard with instructions.
        setNotice({
          title: "Install isn’t ready yet",
          body: <>Your browser has not exposed the direct install prompt. Try again from this Install button after the app has finished loading.</>,
        });
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("benovelent:install-now", onDirectInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("benovelent:install-now", onDirectInstall);
    };
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 6500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (installed || !notice) return null;

  return (
    <div className="pwa-install-toast" role="status" aria-live="polite">
      <div className="pwa-install-toast-icon"><Download size={18} /></div>
      <div className="pwa-install-toast-copy">
        <strong>{notice.title}</strong>
        <span>{notice.body}</span>
      </div>
      <button type="button" className="pwa-install-toast-close" onClick={() => setNotice(null)} aria-label="Close install message"><X size={17} /></button>
    </div>
  );
}
