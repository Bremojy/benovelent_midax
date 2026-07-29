import DashboardLayout from "../../layouts/DashboardLayout";

import ClaimsOverview from "../../components/member/ClaimsOverview";
import ClaimTimeline from "../../components/member/ClaimTimeline";

export default function Claims() {

  return (

    <DashboardLayout>

      <ClaimsOverview />

      <ClaimTimeline />

    </DashboardLayout>

  );

}