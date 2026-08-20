import MessageCenterPage from "../../components/chat/MessageCenterPage";
import API from "../../services/api";

export default function AdminMessages() {
  return (
    <MessageCenterPage
      eyebrow="ADMIN MESSAGE CENTRE"
      title="Coordinate with members and leaders"
      description="Use one modern inbox to respond faster, resolve support matters and keep portal communication organized."
      searchPlaceholder="Search members, leaders or chats..."
      memberSectionLabel="Members"
      emptyMembersLabel="No members or leaders found."
      emptyConversationsLabel="No recent conversations yet."
      onRefreshHint="Administration conversations refreshed."
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
