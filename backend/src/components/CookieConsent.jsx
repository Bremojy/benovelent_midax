import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie, Check, X } from "lucide-react";

export default function CookieConsent() {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(localStorage.getItem("benovelentPrivacyAccepted") !== "true"), []);
  if (!open) return null;
  const dismiss = () => setOpen(false);
  const accept = () => { localStorage.setItem("benovelentPrivacyAccepted", "true"); setOpen(false); };
  return (
    <aside className="cookie-consent" role="dialog" aria-label="Privacy and cookie notice">
      <div className="cookie-icon"><Cookie size={17} /></div>
      <div className="cookie-copy"><strong>Privacy & cookies</strong><span>Essential browser storage helps remember your privacy choice.</span><Link to="/privacy-policy">Privacy policy</Link></div>
      <div className="cookie-actions"><button type="button" className="cookie-dismiss" onClick={dismiss} aria-label="Dismiss"><X size={16}/></button><button type="button" className="cookie-accept" onClick={accept}><Check size={15}/> Accept</button></div>
    </aside>
  );
}
