import { useEffect, useState } from "react";
import { Download, X, Smartphone, Share2 } from "lucide-react";
import "../styles/feedback-pwa.css";

const standalone = () => Boolean(
  window.matchMedia?.("(display-mode: standalone)")?.matches ||
  window.navigator?.standalone === true
);
const ios = () => /iphone|ipad|ipod/i.test(window.navigator?.userAgent || "");
const android = () => /android/i.test(window.navigator?.userAgent || "");

export default function InstallPWA() {
  const [deferred, setDeferred] = useState(null);
  const [open, setOpen] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [iosDevice, setIosDevice] = useState(false);
  const [androidDevice, setAndroidDevice] = useState(false);

  useEffect(() => {
    if (standalone()) {
      setInstalled(true);
      return undefined;
    }
    setIosDevice(ios());
    setAndroidDevice(android());

    const onPrompt = (event) => {
      event.preventDefault();
      setDeferred(event);
      window.__benovelentPwaPrompt = event;
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      setOpen(false);
    };
    const onOpen = () => {
      if (!standalone()) setOpen(true);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("benovelent:open-install", onOpen);
    if (window.__benovelentPwaPrompt) setDeferred(window.__benovelentPwaPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("benovelent:open-install", onOpen);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch (_) {
      // The browser can reject/consume the prompt; the app remains usable.
    } finally {
      setDeferred(null);
      setOpen(false);
    }
  };

  if (installed || !open) return null;

  const directInstall = Boolean(deferred);
  const iosMode = !directInstall && iosDevice;

  return (
    <div className="pwa-install-sheet" role="dialog" aria-modal="true" aria-label="Install Benovelent MIDAX">
      <button type="button" className="pwa-install-sheet-close" onClick={() => setOpen(false)} aria-label="Close installation dialog">
        <X size={18} />
      </button>
      <div className="pwa-install-sheet-icon"><Download size={22} /></div>
      <div className="pwa-install-sheet-copy">
        <span>BENOVELENT MIDAX</span>
        <h2>{directInstall ? "Install the app" : iosMode ? "Add to Home Screen" : "Install is browser-controlled"}</h2>
        {directInstall ? (
          <p>Install the portal for a faster, app-like experience and easier access on your device.</p>
        ) : iosMode ? (
          <p><Share2 size={14} /> In Safari, tap <b>Share</b> → <b>Add to Home Screen</b> → <b>Add</b>.</p>
        ) : androidDevice ? (
          <p>Use Chrome's menu <b>⋮</b> and choose <b>Install app</b> or <b>Add to Home screen</b>.</p>
        ) : (
          <p>Open your browser menu and choose <b>Install app</b> or <b>Add to Home Screen</b> when available.</p>
        )}
      </div>
      <div className="pwa-install-sheet-actions">
        {directInstall ? (
          <button type="button" className="pwa-install-now" onClick={install}><Smartphone size={16} /> Install</button>
        ) : (
          <button type="button" className="pwa-help-secondary" onClick={() => setOpen(false)}>Close</button>
        )}
      </div>
    </div>
  );
}
