import MessageCenterPage from "../../components/chat/MessageCenterPage";
import API from "../../services/api";
import { getAdminMembers } from "../../services/adminService";

export default function AdminMessages() {
  return (
    <MessageCenterPage
      eyebrow="ADMIN MESSAGE CENTRE"
      title="Lead private communication"
      description="Coordinate with members in one secure space to improve trust and response time."
      searchPlaceholder="Search members or conversations..."
      memberSectionLabel="Member directory"
      emptyMembersLabel="No members found."
      emptyConversationsLabel="No recent conversations yet."
      onRefreshHint="Administration conversations refreshed."
      loadContacts={async ({ currentUser }) => {
        const [membersRes, convRes] = await Promise.allSettled([
          getAdminMembers({ page: 1, limit: 500 }),
          API.get("/conversations"),
        ]);

        const members = membersRes.status === "fulfilled"
          ? (membersRes.value?.members || membersRes.value?.data?.members || [])
          : [];
        const conversations = convRes.status === "fulfilled"
          ? (convRes.value?.data?.conversations || [])
          : [];

        const safePeople = members
          .filter((person) => String(person?._id) !== String(currentUser?._id))
          .map((person) => ({
            ...person,
            roleLabel: person.roleLabel || "Member",
          }));

        return {
          members: safePeople,
          conversations,
        };
      }}
    />
  );
}
