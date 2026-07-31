import DashboardLayout from "../../layouts/DashboardLayout";

import ProfileHeader
  from "../../components/member/ProfileHeader";

import MemberStats
  from "../../components/member/MemberStats";

import MembershipCard
  from "../../components/member/MembershipCard";

import AnnouncementsCard
  from "../../components/member/AnnouncementsCard";

import ContributionSummary
  from "../../components/member/ContributionSummary";

import QuickActions
  from "../../components/member/QuickActions";

import useMemberDashboard
  from "../../hooks/useMemberDashboard";

import "./MemberDashboard.css";

function MemberDashboard() {
  const {
    member,
    statistics,
    benefits,
    announcements,
    recentContributions,
    profileCompletion,
    loading,
    error,
    refreshDashboard,
  } = useMemberDashboard();

  // =====================================
  // LOADING
  // =====================================

  if (loading) {
    return (
      <DashboardLayout>
        <div className="member-dashboard-loading">

          <div className="loading-spinner"></div>

          <h3>
            Loading your dashboard...
          </h3>

          <p>
            Please wait while we retrieve
            your membership information.
          </p>

        </div>
      </DashboardLayout>
    );
  }

  // =====================================
  // ERROR
  // =====================================

  if (error) {
    return (
      <DashboardLayout>
        <div className="member-dashboard-error">

          <div className="error-icon">
            !
          </div>

          <h2>
            Unable to load dashboard
          </h2>

          <p>
            {error}
          </p>

          <button
            type="button"
            onClick={refreshDashboard}
          >
            Try Again
          </button>

        </div>
      </DashboardLayout>
    );
  }

  const firstName =
    member?.fullName
      ?.trim()
      ?.split(" ")[0] ||
    "Member";

  const status =
    member?.status || "active";

  const statusLabel =
    status.charAt(0).toUpperCase() +
    status.slice(1);

  const completion =
    profileCompletion?.percentage ??
    member?.profileCompletion ??
    0;

  return (
    <DashboardLayout>

      <div className="member-dashboard">

        {/* =================================
            WELCOME
        ================================= */}

        <section className="member-welcome">

          <div className="welcome-content">

            <span className="welcome-label">
              MEMBER PORTAL
            </span>

            <h1>
              Welcome back,{" "}
              <span>
                {firstName}
              </span>
              {" "}👋
            </h1>

            <p>
              Stay connected with your
              Benevolent Midax family.
              Manage your membership,
              contributions and benefits
              from one place.
            </p>

          </div>

          <div className="welcome-status">

            <span
              className={`status-dot ${status}`}
            ></span>

            <div>
              <small>
                Account Status
              </small>

              <strong>
                {statusLabel}
              </strong>
            </div>

          </div>

        </section>

        {/* =================================
            PROFILE COMPLETION
        ================================= */}

        {completion < 100 && (
          <section className="profile-completion-card">

            <div className="completion-icon">
              ✓
            </div>

            <div className="completion-content">

              <div className="completion-heading">

                <div>
                  <h3>
                    Complete your profile
                  </h3>

                  <p>
                    Complete your membership
                    information to unlock all
                    available benefits.
                  </p>
                </div>

                <strong>
                  {completion}%
                </strong>

              </div>

              <div className="completion-track">

                <div
                  className="completion-progress"
                  style={{
                    width: `${completion}%`,
                  }}
                />

              </div>

            </div>

          </section>
        )}

        {/* =================================
            PROFILE HEADER
        ================================= */}

        <ProfileHeader
          member={member}
        />

        {/* =================================
            MEMBER STATISTICS
        ================================= */}

        <MemberStats
          statistics={statistics}
        />

        {/* =================================
            CONTRIBUTIONS
        ================================= */}

        <ContributionSummary
          statistics={statistics}
          recentContributions={
            recentContributions
          }
        />

        {/* =================================
            MEMBERSHIP + ANNOUNCEMENTS
        ================================= */}

        <div className="member-dashboard-grid">

          <MembershipCard
            member={member}
          />

          <AnnouncementsCard
            announcements={
              announcements
            }
          />

        </div>

        {/* =================================
            BENEFITS
        ================================= */}

        <section className="benefits-section">

          <div className="section-heading">

            <div>
              <span>
                MEMBER BENEFITS
              </span>

              <h2>
                Your benefit access
              </h2>
            </div>

          </div>

          <div className="benefits-grid">

            <BenefitCard
              title="Medical Support"
              icon="🏥"
              eligible={
                benefits?.medicalSupport
              }
            />

            <BenefitCard
              title="Funeral Support"
              icon="🕊️"
              eligible={
                benefits?.funeralSupport
              }
            />

            <BenefitCard
              title="Education Support"
              icon="🎓"
              eligible={
                benefits?.educationSupport
              }
            />

            <BenefitCard
              title="Voting"
              icon="🗳️"
              eligible={
                benefits?.voting
              }
            />

          </div>

        </section>

        {/* =================================
            QUICK ACTIONS
        ================================= */}

        <QuickActions />

      </div>

    </DashboardLayout>
  );
}

// =========================================
// BENEFIT CARD
// =========================================

function BenefitCard({
  title,
  icon,
  eligible,
}) {
  return (
    <div
      className={`benefit-card ${
        eligible
          ? "eligible"
          : "not-eligible"
      }`}
    >

      <div className="benefit-icon">
        {icon}
      </div>

      <div className="benefit-info">

        <h3>
          {title}
        </h3>

        <span>
          {eligible
            ? "Available"
            : "Not currently available"}
        </span>

      </div>

      <div className="benefit-status">

        {eligible
          ? "✓"
          : "—"}

      </div>

    </div>
  );
}

export default MemberDashboard;