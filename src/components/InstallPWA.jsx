import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

export default function InstallPWA() {
  const [show, setShow] = useState(false);
  const [deferred, setDeferred] = useState(null);
  useEffect(() => {
    const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator?.standalone === true;
    if (standalone || localStorage.getItem("benovelentPwaDismissed") === "true") return;
    const onPrompt = (event) => { event.preventDefault(); setDeferred(event); setShow(true); };
    const onInstalled = () => { setDeferred(null); setShow(false); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);
  if (!show) return null;
  const install = async () => { if (!deferred) return; await deferred.prompt(); try { await deferred.userChoice; } catch {} setDeferred(null); setShow(false); };
  const dismiss = () => { localStorage.setItem("benovelentPwaDismissed", "true"); setShow(false); };
  return <aside className="pwa-install-banner" role="status" aria-live="polite"><div className="pwa-install-icon"><Download size={17}/></div><div className="pwa-install-copy"><strong>Install Benevolent</strong><span>Use the portal like an app.</span></div><div className="pwa-install-actions"><button type="button" className="pwa-install-now" onClick={install}>Install</button><button type="button" className="pwa-install-close" onClick={dismiss} aria-label="Dismiss"><X size={15}/></button></div></aside>;
}
