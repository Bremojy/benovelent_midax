import MessageCenterPage from "../../components/chat/MessageCenterPage";
import API from "../../services/api";

export default function SuperAdminMessages() {
  return (
    <MessageCenterPage
      eyebrow="SUPERADMIN MESSAGE CENTRE"
      title="Monitor leadership communication"
      description="View the same fast inbox used across portals, with leadership and member contacts grouped clearly."
      searchPlaceholder="Search contacts or chats..."
      memberSectionLabel="Members"
      emptyMembersLabel="No contacts found."
      emptyConversationsLabel="No conversations yet."
      onRefreshHint="Superadmin conversations refreshed."
      showMemberFilters
      loadContacts={async ({ filters = {} } = {}) => {
        const params = { limit: 1000 };
        Object.entries(filters || {}).forEach(([key, value]) => { if (value && value !== "all") params[key] = value; });
        const [membersRes, convRes] = await Promise.allSettled([
          API.get("/member/chat-members", { params }),
          API.get("/conversations"),
        ]);

        const members = membersRes.status === "fulfilled"
          ? (membersRes.value?.data?.members || [])
          : [];
        const conversations = convRes.status === "fulfilled"
          ? (convRes.value?.data?.conversations || [])
          : [];

        return {
          members,
          conversations,
          filterOptions: membersRes.status === "fulfilled" ? (membersRes.value?.data?.filterOptions || {}) : {},
        };
      }}
    />
  );
}
