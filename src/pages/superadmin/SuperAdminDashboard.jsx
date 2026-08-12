import {
  useEffect,
  useState,
} from "react";

import {
  Users,
  UserCog,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  UserPlus,
  ArrowRight,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../services/api";

import {
  getSuperAdminAdminStatistics,
  getSuperAdmins,
  getSuperAdminPortalOverview,
} from "../../services/superAdminService";

import "./SuperAdminDashboard.css";

const money = (value) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(Number(value || 0));

function SuperAdminDashboard() {
  const [statistics, setStatistics] =
    useState({
      total: 0,
      active: 0,
      inactive: 0,
      suspended: 0,
    });

  const [recentAdmins, setRecentAdmins] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [systemOnline, setSystemOnline] = useState(null);
  const [overview, setOverview] = useState(null);

  const [error, setError] =
    useState("");

  // ==================================================
  // LOAD DASHBOARD
  // ==================================================

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const [statisticsResponse, adminsResponse, systemResponse, overviewResponse] = await Promise.all([
        getSuperAdminAdminStatistics(),
        getSuperAdmins({ page: 1, limit: 5 }),
        API.get("/superadmin/system/status").catch(() => null),
        getSuperAdminPortalOverview().catch(() => null),
      ]);
      setSystemOnline(Boolean(systemResponse?.data?.success));
      setOverview(overviewResponse?.overview || null);

      if (
        statisticsResponse?.success
      ) {
        setStatistics(
          statisticsResponse.statistics ||
            {
              total: 0,
              active: 0,
              inactive: 0,
              suspended: 0,
            }
        );
      }

      if (
        adminsResponse?.success
      ) {
        setRecentAdmins(
          Array.isArray(
            adminsResponse.admins
          )
            ? adminsResponse.admins
            : []
        );
      }

    } catch (err) {
      console.error(
        "SuperAdmin dashboard error:",
        err
      );

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load dashboard."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <DashboardLayout>

      <div className="superadmin-dashboard">

        {/* ==========================================
            PAGE HEADER
        ========================================== */}

        <section className="superadmin-page-header">

          <div>

            <span className="superadmin-eyebrow">
              SUPER ADMINISTRATION
            </span>

            <h1>
              Super Admin Dashboard
            </h1>

            <p>
              Manage administrators,
              members and the Benovelent
              Midax system from one place.
            </p>

          </div>

          <button
            type="button"
            className="superadmin-refresh-button"
            onClick={loadDashboard}
            disabled={loading}
          >
            <RefreshCw
              size={17}
              className={
                loading
                  ? "refresh-spinning"
                  : ""
              }
            />

            {loading
              ? "Refreshing..."
              : "Refresh"}
          </button>

        </section>


        {/* ==========================================
            ERROR
        ========================================== */}

        {error && (

          <div className="superadmin-alert">

            <ShieldAlert size={20} />

            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
            >
              ×
            </button>

          </div>

        )}


        {/* ==========================================
            STATISTICS
        ========================================== */}

        <section className="superadmin-stats-grid">

          <DashboardStat
            label="Total Administrators"
            value={
              statistics.total
            }
            icon={
              <UserCog size={22} />
            }
            description="All administrator accounts"
          />

          <DashboardStat
            label="Active Administrators"
            value={
              statistics.active
            }
            icon={
              <ShieldCheck size={22} />
            }
            description="Currently active"
          />

          <DashboardStat
            label="Inactive"
            value={
              statistics.inactive
            }
            icon={
              <Users size={22} />
            }
            description="Inactive accounts"
          />

          <DashboardStat
            label="Suspended"
            value={
              statistics.suspended
            }
            icon={
              <ShieldAlert size={22} />
            }
            description="Suspended accounts"
          />

        </section>


        <section className="superadmin-pwa-card"><div className="superadmin-panel-header"><div><span>PWA STATUS</span><h2>Benovelent MIDAX app readiness</h2><p>Browser-side installation and service-worker status.</p></div><button type="button" className="superadmin-view-link" onClick={() => window.dispatchEvent(new Event("benovelent:open-install"))}>Install / Help</button></div><div className="superadmin-pwa-grid"><PwaCheck label="Standalone" value={window.matchMedia?.("(display-mode: standalone)")?.matches ? "Installed" : "Browser"}/><PwaCheck label="Service Worker" value={"serviceWorker" in navigator ? "Supported" : "Unavailable"}/><PwaCheck label="Manifest" value="Configured"/><PwaCheck label="App name" value="Benovelent MIDAX"/></div></section>

        <section className="superadmin-live-overview">
          <div className="superadmin-panel-header"><div><span>LIVE CONTROL CENTRE</span><h2>Everything happening across Benovelent Midax</h2><p>Refresh this panel to inspect current members, support, communication, finance and content activity.</p></div></div>
          <div className="superadmin-live-grid">
            <LiveCard label="Members" value={overview?.members?.total ?? 0} detail={`${overview?.members?.active ?? 0} active · ${overview?.members?.online ?? 0} online`} />
            <LiveCard label="Pending support" value={overview?.support?.pending ?? 0} detail={`Funeral ${overview?.support?.funeral ?? 0} · Medical ${overview?.support?.medical ?? 0} · Education ${overview?.support?.education ?? 0}`} />
            <LiveCard label="Administrators" value={overview?.leadership?.administrators ?? statistics.total ?? 0} detail={`${overview?.leadership?.activeAdministrators ?? statistics.active ?? 0} active`} />
            <LiveCard label="Conversations" value={overview?.communication?.conversations ?? 0} detail={`${overview?.communication?.messages ?? 0} messages · ${overview?.communication?.unreadNotifications ?? 0} unread notifications`} />
            <LiveCard label="Published news" value={overview?.content?.publishedNews ?? 0} detail={`${overview?.content?.activeFeedbackCollections ?? 0} active feedback collections`} />
            <LiveCard label="Book balance" value={money(overview?.finance?.bookBalance)} detail={`${overview?.support?.approvedClaims ?? 0} approved finance claims`} />
          </div>
          <div className="superadmin-live-links"><QuickAction icon={<UserPlus size={19}/>} title="Add Administrator" description="Create a new administrator" href="/superadmin/admins"/><QuickAction icon={<Users size={19}/>} title="Members" description="Review member accounts" href="/superadmin/members"/><QuickAction icon={<ShieldCheck size={19}/>} title="Database Integrity" description="Inspect and control live MongoDB data" href="/superadmin/data-integrity"/><QuickAction icon={<ArrowRight size={19}/>} title="System Settings" description="Manage portal configuration" href="/superadmin/settings"/></div>
        </section>

        {/* ==========================================
            MAIN GRID
        ========================================== */}

        <section className="superadmin-main-grid">

          {/* ========================================
              ADMINISTRATOR OVERVIEW
          ======================================== */}

          <div className="superadmin-panel">

            <div className="superadmin-panel-header">

              <div>

                <span>
                  ADMINISTRATION
                </span>

                <h2>
                  Recent Administrators
                </h2>

              </div>

              <a
                href="/superadmin/admins"
                className="superadmin-view-link"
              >
                View all

                <ArrowRight size={16} />
              </a>

            </div>


            {loading ? (

              <div className="superadmin-loading">

                <div className="superadmin-spinner" />

                <p>
                  Loading administrators...
                </p>

              </div>

            ) : recentAdmins.length ===
              0 ? (

              <div className="superadmin-empty">

                <UserCog
                  size={38}
                />

                <h3>
                  No administrators
                </h3>

                <p>
                  Create your first
                  administrator account.
                </p>

              </div>

            ) : (

              <div className="recent-admin-list">

                {recentAdmins.map(
                  (admin) => {

                    const status =
                      String(
                        admin.status ||
                          "active"
                      ).toLowerCase();

                    return (

                      <div
                        className="recent-admin-item"
                        key={
                          admin._id
                        }
                      >

                        <div className="recent-admin-avatar">
                          {getInitials(
                            admin.fullName ||
                              admin.name
                          )}
                        </div>

                        <div className="recent-admin-info">

                          <strong>
                            {admin.fullName ||
                              admin.name ||
                              "Administrator"}
                          </strong>

                          <span>
                            {admin.email ||
                              "No email"}
                          </span>

                        </div>

                        <span
                          className={`admin-status ${status}`}
                        >
                          {capitalize(
                            status
                          )}
                        </span>

                      </div>

                    );
                  }
                )}

              </div>

            )}

          </div>


          {/* ========================================
              QUICK ACTIONS
          ======================================== */}

          <div className="superadmin-panel">

            <div className="superadmin-panel-header">

              <div>

                <span>
                  QUICK ACTIONS
                </span>

                <h2>
                  System Management
                </h2>

              </div>

            </div>


            <div className="superadmin-quick-actions">

              <QuickAction
                icon={
                  <UserPlus size={21} />
                }
                title="Add Administrator"
                description="Create a new admin account"
                href="/superadmin/admins"
              />

              <QuickAction
                icon={
                  <UserCog size={21} />
                }
                title="Manage Administrators"
                description="View and manage admin accounts"
                href="/superadmin/admins"
              />

              <QuickAction
                icon={
                  <Users size={21} />
                }
                title="Manage Members"
                description="View the member directory"
                href="/superadmin/members"
              />

              <QuickAction
                icon={
                  <ShieldCheck size={21} />
                }
                title="Website Settings"
                description="Edit content, leaders, gallery and uploads"
                href="/superadmin/settings"
              />

            </div>

          </div>

        </section>


        {/* ==========================================
            SYSTEM OVERVIEW
        ========================================== */}

        <section className="superadmin-system-card">

          <div className="system-card-icon">
            <ShieldCheck size={25} />
          </div>

          <div className="system-card-content">

            <span>
              SYSTEM STATUS
            </span>

            <h2>{systemOnline === false ? "System connection needs attention" : "System status"}</h2>
            <p>{systemOnline === false ? "The live system-status check could not be completed." : "Live administrator statistics and system controls are available."}</p>

          </div>

          <div className="system-status">

            <span className="system-status-dot" />

            {systemOnline === null ? "Checking..." : systemOnline ? "Operational" : "Needs attention"}

          </div>

        </section>

      </div>

    </DashboardLayout>
  );
}


// ======================================================
// DASHBOARD STAT
// ======================================================

function LiveCard({label,value,detail}){return <div className="superadmin-live-card"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>}

function DashboardStat({
  label,
  value,
  icon,
  description,
}) {
  return (
    <div className="superadmin-stat-card">

      <div className="stat-card-top">

        <div className="stat-icon">
          {icon}
        </div>

        <span>
          {label}
        </span>

      </div>

      <strong>
        {value}
      </strong>

      <p>
        {description}
      </p>

    </div>
  );
}


// ======================================================
// QUICK ACTION
// ======================================================

function PwaCheck({label,value}){return <div className="superadmin-pwa-check"><span>{label}</span><strong>{value}</strong></div>}

function QuickAction({
  icon,
  title,
  description,
  href,
}) {
  return (
    <a
      href={href}
      className="superadmin-quick-action"
    >

      <div className="quick-action-icon">
        {icon}
      </div>

      <div>

        <strong>
          {title}
        </strong>

        <span>
          {description}
        </span>

      </div>

      <ArrowRight size={17} />

    </a>
  );
}


// ======================================================
// HELPERS
// ======================================================

function getInitials(name) {
  if (!name) {
    return "A";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (word) =>
        word[0]?.toUpperCase()
    )
    .join("");
}


function capitalize(value) {
  const text =
    String(value);

  return (
    text.charAt(0).toUpperCase() +
    text.slice(1)
  );
}


export default SuperAdminDashboard;