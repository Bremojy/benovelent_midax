import DashboardLayout from "../../layouts/DashboardLayout";
import ProfileHeader from "../../components/member/ProfileHeader";
import MembershipCard from "../../components/member/MembershipCard";
import useMemberDashboard from "../../hooks/useMemberDashboard";

export default function Profile() {

  const {
    member,
    loading,
    error,
  } = useMemberDashboard();

  if (loading) {
    return (
      <DashboardLayout>
        <h2>Loading Profile...</h2>
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

      <ProfileHeader member={member} />

      <MembershipCard member={member} />

    </DashboardLayout>

  );

}