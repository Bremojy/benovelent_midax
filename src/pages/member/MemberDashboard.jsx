import DashboardLayout from "../../layouts/DashboardLayout";

import MemberStats from "../../components/member/MemberStats";
import MembershipCard from "../../components/member/MembershipCard";
import AnnouncementsCard from "../../components/member/AnnouncementsCard";
import ContributionHistory from "../../components/member/ContributionHistory";
import QuickActions from "../../components/member/QuickActions";

import useMemberDashboard from "../../hooks/useMemberDashboard";

function MemberDashboard() {
  const {
    member,
    statistics,
    loading,
    error,
  } = useMemberDashboard();

  if (loading) {
    return (
      <DashboardLayout>
        <h2>Loading dashboard...</h2>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <h2>{error}</h2>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="member-header">
        <h1>
          Welcome back, {member?.fullName || "Member"} 👋
        </h1>

        <p>
          Membership Status:{" "}
          <strong>
            {statistics?.activeStatus || "Active"}
          </strong>
        </p>
      </div>

      <MemberStats
        totalContributions={
          statistics?.totalContribution || 0
        }
        unreadMessages={
          statistics?.unreadMessages || 0
        }
      />

      <div className="member-grid">
        <MembershipCard />
        <AnnouncementsCard />
      </div>

      <ContributionHistory />

      <QuickActions />
    </DashboardLayout>
  );
}

export default MemberDashboard;