import MessageCenterPage from "../../components/chat/MessageCenterPage";
import API from "../../services/api";
import { getAdminColleagues, getAdminMembers } from "../../services/adminService";

export default function AdminMessages() {
  return (
    <MessageCenterPage
      eyebrow="ADMIN MESSAGE CENTRE"
      title="Lead private communication"
      description="Coordinate with members and administrators in one secure space to improve trust and response time."
      searchPlaceholder="Search people or conversations..."
      memberSectionLabel="People"
      emptyMembersLabel="No admins or members found."
      emptyConversationsLabel="No recent conversations yet."
      onRefreshHint="Administration conversations refreshed."
      loadContacts={async ({ currentUser }) => {
        const [membersRes, adminsRes, convRes] = await Promise.allSettled([
          getAdminMembers({ page: 1, limit: 200 }),
          getAdminColleagues(),
          API.get("/conversations"),
        ]);

        const members = membersRes.status === "fulfilled" ? membersRes.value.members || [] : [];
        const admins = adminsRes.status === "fulfilled" ? adminsRes.value.colleagues || [] : [];
        const conversations = convRes.status === "fulfilled" ? convRes.value.data?.conversations || [] : [];

        const safePeople = [...admins, ...members].filter((person) => String(person?._id) !== String(currentUser?._id));

        return {
          members: safePeople,
          conversations,
        };
      }}
    />
  );
}
