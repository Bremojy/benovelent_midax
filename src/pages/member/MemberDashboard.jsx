import DashboardLayout from "../../layouts/DashboardLayout";
import ProfileHeader from "../../components/member/ProfileHeader";
import RecentChats from "../../components/member/RecentChats";
import MemberStats from "../../components/member/MemberStats";
import CommunityFeed from "../../components/member/CommunityFeed";
import NotificationCenter from "../../components/member/NotificationCenter";
import MembershipCard from "../../components/member/MembershipCard";
import AnnouncementsCard from "../../components/member/AnnouncementsCard";
import ContributionHistory from "../../components/member/ContributionHistory";
import QuickActions from "../../components/member/QuickActions";
import ContributionSummary from "../../components/member/ContributionSummary";
import useMemberDashboard from "../../hooks/useMemberDashboard";

import "./MemberDashboard.css";

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
        <div className="dashboard-loading">
          Loading Dashboard...
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="dashboard-error">
          {error}
        </div>
      </DashboardLayout>
    );
  }

return (

<DashboardLayout>

<div className="member-dashboard">

<section className="member-hero">

<div>

<h1>

Welcome back,

{" "}

<span>

{member?.fullName || "Member"}

</span>

👋

</h1>

<p>

Stay connected with your Benevolent Midax family.

Receive announcements, messages,

claim updates and contribution reports

in one place.

</p>

</div>

<div className="status-pill">

🟢

{statistics?.activeStatus || "Active"}

</div>

</section>

<ProfileHeader

member={member}

/>

<ContributionSummary

statistics={statistics}

/>

<MemberStats

statistics={statistics}

/>

<div className="member-grid">

<MembershipCard />

<AnnouncementsCard />

</div>

<NotificationCenter />

<CommunityFeed />

<ContributionHistory />

<RecentChats />

<QuickActions />

</div>

</DashboardLayout>

);

}

export default MemberDashboard;