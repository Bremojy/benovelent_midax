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

import {
  getSuperAdminAdminStatistics,
  getSuperAdmins,
} from "../../services/superAdminService";

import "./SuperAdminDashboard.css";

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

  const [error, setError] =
    useState("");

  // ==================================================
  // LOAD DASHBOARD
  // ==================================================

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        statisticsResponse,
        adminsResponse,
      ] = await Promise.all([
        getSuperAdminAdminStatistics(),

        getSuperAdmins({
          page: 1,
          limit: 5,
        }),
      ]);

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
              members and the Benevolent
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

            <h2>
              Benevolent Midax is
              operational
            </h2>

            <p>
              Administrator authentication,
              member management and system
              controls are available.
            </p>

          </div>

          <div className="system-status">

            <span className="system-status-dot" />

            Operational

          </div>

        </section>

      </div>

    </DashboardLayout>
  );
}


// ======================================================
// DASHBOARD STAT
// ======================================================

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