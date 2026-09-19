import { useLocation } from "react-router-dom";
import MessageCenterPage from "../../components/chat/MessageCenterPage";
import API from "../../services/api";

export default function Messages() {
  const location = useLocation();
  const conversationId = location.state?.conversationId || "";

  return (
    <MessageCenterPage
      eyebrow="MEMBER MESSAGE CENTRE"
      title="Chat with members and leaders"
      description="Start private conversations with fellow members and the leadership team inside one fast, secure inbox."
      searchPlaceholder="Search members or leaders..."
      memberSectionLabel="Members"
      emptyMembersLabel="No members or leaders found right now."
      emptyConversationsLabel="No conversations yet - choose a contact to start."
      onRefreshHint="Member conversations refreshed."
      initialConversationId={conversationId}
      loadContacts={async () => {
        const [membersResponse, conversationsResponse] = await Promise.all([
          API.get("/member/chat-members", { params: { limit: 400 } }),
          API.get("/conversations"),
        ]);

        if (!membersResponse?.data?.success && membersResponse?.data?.success !== undefined) {
          throw new Error(membersResponse?.data?.message || "Unable to load members for chat.");
        }
        if (!conversationsResponse?.data?.success && conversationsResponse?.data?.success !== undefined) {
          throw new Error(conversationsResponse?.data?.message || "Unable to load conversations.");
        }

        return {
          members: membersResponse?.data?.members || membersResponse?.members || [],
          conversations: conversationsResponse?.data?.conversations || conversationsResponse?.conversations || [],
        };
      }}
    />
  );
}
