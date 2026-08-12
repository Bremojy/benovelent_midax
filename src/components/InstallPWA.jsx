import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

/**
 * PWA installation helper.
 *
 * We intentionally do not cancel `beforeinstallprompt`. Cancelling the event
 * requires the page to later call event.prompt(); otherwise Chromium reports:
 * "Banner not shown: beforeinstallpromptevent.preventDefault() called."
 *
 * Leaving the event's default behavior intact allows the browser to manage its
 * native install UI. This component only shows a lightweight reminder when the
 * app is not already installed and the browser reports a PWA install state.
 */
export default function InstallPWA() {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches;
    const iosStandalone = window.navigator?.standalone === true;
    if (standalone || iosStandalone) return undefined;

    const handleInstalled = () => setShowHint(false);
    const handleBeforeInstallPrompt = () => {
      // Do not call preventDefault() or store the event for a delayed prompt.
      // Chromium can therefore use its own native install UI without warnings.
      setShowHint(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (!showHint) return null;

  return (
    <div className="pwa-install-banner" role="status" aria-live="polite">
      <div>
        <strong>Install Benevolent</strong>
        <span>
          Your browser can install Benevolent as an app. Use your browser's
          install option when it appears in the address bar or menu.
        </span>
      </div>
      <div className="pwa-install-actions">
        <button
          type="button"
          className="icon-btn"
          aria-label="Dismiss installation reminder"
          onClick={() => setShowHint(false)}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
