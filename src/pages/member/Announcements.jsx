import DashboardLayout from "../../layouts/DashboardLayout";

import AnnouncementsCard from "../../components/member/AnnouncementsCard";
import CommunityFeed from "../../components/member/CommunityFeed";

export default function Announcements() {

  return (

    <DashboardLayout>

      <AnnouncementsCard />

      <CommunityFeed />

    </DashboardLayout>

  );

}