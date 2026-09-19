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
        const [membersRes, convRes] = await Promise.all([
          API.get("/member/chat-members", { params }),
          API.get("/conversations"),
        ]);

        if (!membersRes?.data?.success && membersRes?.data?.success !== undefined) {
          throw new Error(membersRes?.data?.message || "Unable to load members for chat.");
        }
        if (!convRes?.data?.success && convRes?.data?.success !== undefined) {
          throw new Error(convRes?.data?.message || "Unable to load conversations.");
        }

        return {
          members: membersRes?.data?.members || [],
          conversations: convRes?.data?.conversations || [],
          filterOptions: membersRes?.data?.filterOptions || {},
        };
      }}
    />
  );
}
