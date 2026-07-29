import DashboardLayout from "../../layouts/DashboardLayout";

import ContributionSummary from "../../components/member/ContributionSummary";
import ContributionHistory from "../../components/member/ContributionHistory";

import useMemberDashboard from "../../hooks/useMemberDashboard";

export default function Contributions() {

  const {
    statistics,
  } = useMemberDashboard();

  return (

    <DashboardLayout>

      <ContributionSummary
        statistics={statistics}
      />

      <ContributionHistory />

    </DashboardLayout>

  );

}