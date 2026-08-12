import { useEffect, useState } from "react";
import { Activity, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../services/api";
import "../../styles/portalModule.css";

export default function SuperAdminSystem() {
  const [status, setStatus] = useState("Checking...");
  const [details, setDetails] = useState(null);
  const [time, setTime] = useState(null);

  const check = async () => {
    try {
      setStatus("Checking...");
      const { data } = await API.get("/health");
      setDetails(data);
      setTime(new Date());
      setStatus(data?.database === "connected" ? "Operational" : "API online / database unavailable");
    } catch (error) {
      setStatus("Unavailable");
      setDetails({ message: error.response?.data?.message || error.message });
      setTime(new Date());
    }
  };

  useEffect(() => { check(); }, []);

  const online = status.startsWith("Operational");

  return (
    <DashboardLayout>
      <div className="portal-module">
        <header className="portal-module-header">
          <div>
            <span>INFRASTRUCTURE</span>
            <h1>System Health</h1>
            <p>Verify the live Benovelent Midax API and database connection.</p>
          </div>
          <button className="portal-btn" onClick={check}>
            <RefreshCw size={16} /> Run Health Check
          </button>
        </header>

        <section className="portal-panel">
          <div className="portal-stat-grid">
            <div className="portal-stat">
              <span>API STATUS</span>
              <strong>{status}</strong>
            </div>
            <div className="portal-stat">
              <span>APPLICATION</span>
              <strong>{details?.application || "Benovelent Midax API"}</strong>
            </div>
            <div className="portal-stat">
              <span>DATABASE</span>
              <strong>{details?.database || "—"}</strong>
            </div>
            <div className="portal-stat">
              <span>LAST CHECK</span>
              <strong style={{ fontSize: 16 }}>{time ? time.toLocaleTimeString() : "—"}</strong>
            </div>
          </div>

          <div className={`system-health-banner ${online ? "online" : "offline"}`}>
            {online ? <CheckCircle2 size={23} /> : <XCircle size={23} />}
            <div>
              <strong>{online ? "Benovelent Midax is operational" : "Backend connection needs attention"}</strong>
              <p>
                The portal is checking the backend configured through
                <strong> VITE_API_URL</strong>. This prevents production from accidentally checking localhost.
              </p>
            </div>
            <Activity size={24} />
          </div>

          {details?.message && (
            <div className="portal-alert">{details.message}</div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
