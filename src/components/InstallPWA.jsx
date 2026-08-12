import { useEffect, useMemo, useState } from "react";
import { Download, X, Smartphone, Share2, HelpCircle } from "lucide-react";

const DISMISS_KEY = "benovelentPwaDismissedUntil";
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
  const [helpOpen, setHelpOpen] = useState(false);

  const installSupported = useMemo(() => Boolean(deferred), [deferred]);

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
      const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (until <= Date.now()) setOpen(true);
    };

    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      setOpen(false);
      setHelpOpen(false);
      try { localStorage.removeItem(DISMISS_KEY); } catch {}
    };

    const onOpen = () => {
      if (!standalone()) {
        setHelpOpen(false);
        setOpen(true);
      }
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

  if (installed) return null;

  const install = async () => {
    if (deferred) {
      try {
        await deferred.prompt();
        await deferred.userChoice;
        return;
      } catch {}
      setDeferred(null);
      return;
    }
    setHelpOpen(true);
  };

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now() + 604800000)); } catch {}
    setOpen(false);
    setHelpOpen(false);
  };

  const title = iosDevice
    ? "Add Benovelent MIDAX to Home Screen"
    : "Install Benovelent MIDAX";

  const description = iosDevice
    ? "Use Share → Add to Home Screen in Safari."
    : installSupported
      ? "Install the portal for a faster app-like experience."
      : "Install or view the steps for your phone/browser.";

  return (
    <>
      <aside className={`pwa-install-banner ${open ? "is-visible" : ""}`} role="dialog" aria-label="Install Benovelent MIDAX">
        <div className="pwa-install-icon"><Download size={18} /></div>
        <div className="pwa-install-copy">
          <strong>{title}</strong>
          <span>{iosDevice ? <><Share2 size={13} /> Share, then <b>Add to Home Screen</b>.</> : description}</span>
        </div>
        <div className="pwa-install-actions">
          <button type="button" className="pwa-install-now" onClick={install}>
            <Smartphone size={15} /> {iosDevice ? "How to install" : deferred ? "Install" : "Install"}
          </button>
          <button type="button" className="pwa-install-help" onClick={() => setHelpOpen(true)} aria-label="Installation help" title="Installation help">
            <HelpCircle size={16} />
          </button>
          <button type="button" className="pwa-install-close" onClick={dismiss} aria-label="Not now"><X size={16} /></button>
        </div>
      </aside>

      {helpOpen && (
        <div className="pwa-help-backdrop" role="presentation" onClick={() => setHelpOpen(false)}>
          <section className="pwa-help-card" role="dialog" aria-modal="true" aria-label="Benovelent MIDAX installation help" onClick={(event) => event.stopPropagation()}>
            <div className="pwa-help-head"><div><span>BENOVELENT MIDAX</span><h2>Install the app</h2></div><button type="button" onClick={() => setHelpOpen(false)} aria-label="Close"><X size={18} /></button></div>
            {deferred && <p>Your browser is ready to install Benovelent MIDAX. Tap <strong>Install</strong> below.</p>}
            {!deferred && iosDevice && <ol><li>Open this site in Safari.</li><li>Tap <strong>Share</strong>.</li><li>Choose <strong>Add to Home Screen</strong>.</li><li>Tap <strong>Add</strong>.</li></ol>}
            {!deferred && !iosDevice && androidDevice && <ol><li>Open Benovelent MIDAX in Chrome.</li><li>Use the browser menu <strong>⋮</strong>.</li><li>Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li></ol>}
            {!deferred && !iosDevice && !androidDevice && <p>Use your browser menu and choose <strong>Install app</strong> or <strong>Add to Home Screen</strong> when available.</p>}
            <div className="pwa-help-actions"><button type="button" className="pwa-install-now" onClick={install} disabled={!deferred}><Download size={15} /> {deferred ? "Install Benovelent MIDAX" : "Use browser install option"}</button><button type="button" className="pwa-help-secondary" onClick={() => setHelpOpen(false)}>Close</button></div>
          </section>
        </div>
      )}
    </>
  );
}
