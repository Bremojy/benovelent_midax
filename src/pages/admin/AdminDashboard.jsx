import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Users,
  UserCheck,
  UserX,
  ShieldCheck,
  Wifi,
  Ban,
  RefreshCw,
  UserPlus,
  FileText,
  Wallet,
  AlertCircle,
  Activity,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

import API from "../../services/api";

import "./AdminDashboard.css";

function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // ========================================
  // LOAD DASHBOARD
  // ========================================

  const loadDashboard = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response =
          await API.get("/admin/dashboard");

        if (!response?.data?.success) {
          throw new Error(
            response?.data?.message ||
              "Unable to load admin dashboard."
          );
        }

        setDashboard(
          response.data.dashboard || {}
        );

      } catch (err) {
        console.error(
          "Admin Dashboard Error:",
          err
        );

        setError(
          err.response?.data?.message ||
            err.message ||
            "Unable to load dashboard."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  // ========================================
  // INITIAL LOAD
  // ========================================

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // ========================================
  // LOADING
  // ========================================

  if (loading) {
    return (
      <DashboardLayout>
        <div className="admin-dashboard-loading">
          <div className="admin-loading-spinner">
            <RefreshCw size={30} />
          </div>

          <h2>
            Loading Admin Dashboard...
          </h2>

          <p>
            Retrieving the latest membership
            information.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  // ========================================
  // ERROR
  // ========================================

  if (error && !dashboard) {
    return (
      <DashboardLayout>
        <div className="admin-dashboard-error">
          <div className="admin-error-icon">
            <AlertCircle size={32} />
          </div>

          <h2>
            Unable to load dashboard
          </h2>

          <p>{error}</p>

          <button
            type="button"
            onClick={() =>
              loadDashboard()
            }
          >
            <RefreshCw size={17} />
            Try Again
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const totalMembers =
    dashboard?.totalMembers || 0;

  const activeMembers =
    dashboard?.activeMembers || 0;

  const inactiveMembers =
    dashboard?.inactiveMembers || 0;

  const suspendedMembers =
    dashboard?.suspendedMembers || 0;

  const onlineMembers =
    dashboard?.onlineMembers || 0;

  const verifiedMembers =
    dashboard?.verifiedMembers || 0;

  // ========================================
  // DASHBOARD
  // ========================================

  return (
    <DashboardLayout>
      <div className="admin-dashboard">

        {/* ==================================
            HEADER
        ================================== */}

        <section className="admin-dashboard-header">

          <div>
            <span className="admin-eyebrow">
              ADMINISTRATION
            </span>

            <h1>
              Admin Dashboard
            </h1>

            <p>
              Monitor and manage Benevolent
              Midax membership activities.
            </p>
          </div>

          <button
            type="button"
            className="admin-refresh-btn"
            onClick={() =>
              loadDashboard(true)
            }
            disabled={refreshing}
          >
            <RefreshCw
              size={17}
              className={
                refreshing
                  ? "spinning"
                  : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>

        </section>

        {/* ==================================
            ERROR NOTICE
        ================================== */}

        {error && dashboard && (
          <div className="admin-inline-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* ==================================
            STATISTICS
        ================================== */}

        <section className="admin-stat-grid">

          <StatCard
            title="Total Members"
            value={totalMembers}
            icon={Users}
            description="Registered members"
            className="primary"
          />

          <StatCard
            title="Active Members"
            value={activeMembers}
            icon={UserCheck}
            description="Currently active"
            className="success"
          />

          <StatCard
            title="Online Members"
            value={onlineMembers}
            icon={Wifi}
            description="Currently online"
            className="online"
          />

          <StatCard
            title="Verified Members"
            value={verifiedMembers}
            icon={ShieldCheck}
            description="Verified accounts"
            className="verified"
          />

          <StatCard
            title="Inactive Members"
            value={inactiveMembers}
            icon={UserX}
            description="Inactive accounts"
            className="warning"
          />

          <StatCard
            title="Suspended Members"
            value={suspendedMembers}
            icon={Ban}
            description="Suspended accounts"
            className="danger"
          />

        </section>

        {/* ==================================
            MEMBER OVERVIEW
        ================================== */}

        <section className="admin-overview-grid">

          <div className="admin-overview-card">

            <div className="overview-card-header">
              <div>
                <span>
                  MEMBERSHIP
                </span>

                <h2>
                  Membership Overview
                </h2>
              </div>

              <div className="overview-icon">
                <Activity size={21} />
              </div>
            </div>

            <div className="membership-progress">

              <div className="progress-label">
                <span>
                  Active members
                </span>

                <strong>
                  {totalMembers > 0
                    ? Math.round(
                        (activeMembers /
                          totalMembers) *
                          100
                      )
                    : 0}
                  %
                </strong>
              </div>

              <div className="progress-track">

                <div
                  className="progress-fill"
                  style={{
                    width: `${
                      totalMembers > 0
                        ? Math.min(
                            (activeMembers /
                              totalMembers) *
                              100,
                            100
                          )
                        : 0
                    }%`,
                  }}
                />

              </div>

            </div>

            <div className="overview-mini-grid">

              <div>
                <span>
                  Total
                </span>

                <strong>
                  {totalMembers}
                </strong>
              </div>

              <div>
                <span>
                  Active
                </span>

                <strong>
                  {activeMembers}
                </strong>
              </div>

              <div>
                <span>
                  Inactive
                </span>

                <strong>
                  {inactiveMembers}
                </strong>
              </div>

              <div>
                <span>
                  Suspended
                </span>

                <strong>
                  {suspendedMembers}
                </strong>
              </div>

            </div>

          </div>

          {/* ==================================
              ACCOUNT HEALTH
          ================================== */}

          <div className="admin-overview-card">

            <div className="overview-card-header">

              <div>
                <span>
                  ACCOUNT HEALTH
                </span>

                <h2>
                  Verification
                </h2>
              </div>

              <div className="overview-icon">
                <ShieldCheck size={21} />
              </div>

            </div>

            <div className="verification-content">

              <div className="verification-number">
                {totalMembers > 0
                  ? Math.round(
                      (verifiedMembers /
                        totalMembers) *
                        100
                    )
                  : 0}
                <small>%</small>
              </div>

              <div>
                <h3>
                  Verified Members
                </h3>

                <p>
                  {verifiedMembers} of{" "}
                  {totalMembers} members
                  have verified accounts.
                </p>
              </div>

            </div>

            <div className="verification-track">

              <div
                style={{
                  width: `${
                    totalMembers > 0
                      ? Math.min(
                          (verifiedMembers /
                            totalMembers) *
                            100,
                          100
                        )
                      : 0
                  }%`,
                }}
              />

            </div>

          </div>

        </section>

        {/* ==================================
            QUICK ACTIONS
        ================================== */}

        <section className="admin-quick-section">

          <div className="admin-section-heading">

            <div>
              <span>
                ADMIN TOOLS
              </span>

              <h2>
                Quick Actions
              </h2>
            </div>

          </div>

          <div className="admin-quick-grid">

            <QuickAction
              icon={UserPlus}
              title="Manage Members"
              description="View, add and manage members"
              path="/admin/members"
            />

            <QuickAction
              icon={Wallet}
              title="Contributions"
              description="Monitor member contributions"
              path="/admin/contributions"
            />

            <QuickAction
              icon={FileText}
              title="Reports"
              description="View membership reports"
              path="/admin/reports"
            />

            <QuickAction
              icon={AlertCircle}
              title="Claims"
              description="Review member claims"
              path="/admin/claims"
            />

          </div>

        </section>

      </div>
    </DashboardLayout>
  );
}

// =========================================
// STAT CARD
// =========================================

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  className = "",
}) {
  return (
    <div
      className={`admin-stat-card ${className}`}
    >
      <div className="stat-card-top">

        <div className="stat-icon">
          <Icon size={21} />
        </div>

        <span className="stat-label">
          {title}
        </span>

      </div>

      <div className="stat-value">
        {value.toLocaleString()}
      </div>

      <p>
        {description}
      </p>
    </div>
  );
}

// =========================================
// QUICK ACTION
// =========================================

function QuickAction({
  icon: Icon,
  title,
  description,
  path,
}) {
  const handleClick = () => {
    window.location.href = path;
  };

  return (
    <button
      type="button"
      className="admin-quick-action"
      onClick={handleClick}
    >
      <div className="quick-action-icon">
        <Icon size={21} />
      </div>

      <div>
        <h3>
          {title}
        </h3>

        <p>
          {description}
        </p>
      </div>

      <span className="quick-arrow">
        →
      </span>
    </button>
  );
}

export default AdminDashboard;