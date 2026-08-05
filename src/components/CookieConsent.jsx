import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function CookieConsent() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(localStorage.getItem("benevolentPrivacyAccepted") !== "true");
  }, []);

  if (!open) return null;

  const accept = () => {
    localStorage.setItem("benevolentPrivacyAccepted", "true");
    setOpen(false);
  };

  return (
    <div className="cookie-consent modern-cookie-consent" role="dialog" aria-live="polite" aria-label="Privacy and cookies notice">
      <div className="cookie-copy">
        <span className="cookie-badge">Privacy & cookies</span>
        <strong>We use essential storage to keep your settings and privacy choice.</strong>
        <p>
          Member information stays private and access is restricted to authorised administrators only. You can review the policy before continuing.
        </p>
      </div>

      <div className="cookie-actions modern-cookie-actions">
        <Link to="/privacy-policy" className="cookie-link">Read policy</Link>
        <button type="button" className="cookie-secondary" onClick={() => setOpen(false)}>Dismiss</button>
        <button type="button" className="cookie-primary" onClick={accept}>Accept cookies</button>
      </div>
    </div>
  );
}
