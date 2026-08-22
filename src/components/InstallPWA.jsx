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
  const [statusMessage, setStatusMessage] = useState("");
  const [installed, setInstalled] = useState(false);
  const [iosDevice, setIosDevice] = useState(false);
  const [androidDevice, setAndroidDevice] = useState(false);
  const [pendingInstallIntent, setPendingInstallIntent] = useState(false);

  useEffect(() => {
    if (standalone()) {
      setInstalled(true);
      return undefined;
    }
    setIosDevice(ios());
    setAndroidDevice(android());

    const onPrompt = async (event) => {
      event.preventDefault();
      setDeferred(event);
      setOpen(true);
      window.__benovelentPwaPrompt = event;
      if (pendingInstallIntent) {
        try {
          await event.prompt();
          await event.userChoice;
        } catch (_) {
          // Browser may reject/consume the one-time prompt.
        } finally {
          setPendingInstallIntent(false);
          setDeferred(null);
          window.__benovelentPwaPrompt = null;
        }
      }
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      setOpen(false);
    };
    const onDirectInstall = async () => {
      if (standalone()) return;
      const prompt = window.__benovelentPwaPrompt || deferred;
      if (prompt) {
        try {
          await prompt.prompt();
          await prompt.userChoice;
        } catch (_) {
          // Browser may reject/consume the one-time prompt.
        } finally {
          setDeferred(null);
          window.__benovelentPwaPrompt = null;
        }
        setPendingInstallIntent(false);
        return;
      }
      setPendingInstallIntent(true);
      if (ios()) {
        setPendingInstallIntent(false);
        setStatusMessage("On iPhone/iPad: tap Share, then Add to Home Screen.");
      } else {
        setPendingInstallIntent(true);
        setStatusMessage("Your browser controls installation. Open its menu and choose Install app when available.");
      }
      setOpen(true);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("benovelent:install-now", onDirectInstall);
    if (window.__benovelentPwaPrompt) setDeferred(window.__benovelentPwaPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("benovelent:install-now", onDirectInstall);
    };
  }, [pendingInstallIntent]);

  const closeFallback = () => {
    setOpen(false);
    setPendingInstallIntent(false);
  };

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
    <div className="pwa-install-sheet" role="dialog" aria-modal="true" aria-label="Install Benevolent MIDAX">
      <button type="button" className="pwa-install-sheet-close" onClick={closeFallback} aria-label="Close installation dialog">
        <X size={18} />
      </button>
      <div className="pwa-install-sheet-icon"><Download size={22} /></div>
      <div className="pwa-install-sheet-copy">
        <span>BENOVELENT MIDAX</span>
        <h2>{directInstall ? "Install Benevolent MIDAX" : iosMode ? "Add to Home Screen" : "Installation notice"}</h2>
        {directInstall ? (
          <p>Install the portal for a faster, app-like experience and easier access on your device.</p>
        ) : iosMode ? (
          <p><Share2 size={14} /> In Safari, tap <b>Share</b> → <b>Add to Home Screen</b> → <b>Add</b>.</p>
        ) : statusMessage ? (
          <p>{statusMessage}</p>
        ) : androidDevice ? (
          <p>Open the browser menu and choose <b>Install app</b> when available.</p>
        ) : (
          <p>Open your browser menu and choose <b>Install app</b> when available.</p>
        )}
      </div>
      <div className="pwa-install-sheet-actions">
        {directInstall ? (
          <button type="button" className="pwa-install-now" onClick={install}><Smartphone size={16} /> Install</button>
        ) : (
          <button type="button" className="pwa-help-secondary" onClick={closeFallback}>Close</button>
        )}
      </div>
    </div>
  );
}
