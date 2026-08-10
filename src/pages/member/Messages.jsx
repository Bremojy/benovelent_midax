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
        const [membersResponse, conversationsResponse] = await Promise.allSettled([
          API.get("/member/chat-members", { params: { limit: 400 } }),
          API.get("/conversations"),
        ]);

        const members = membersResponse.status === "fulfilled"
          ? (membersResponse.value?.data?.members || membersResponse.value?.members || [])
          : [];
        const conversations = conversationsResponse.status === "fulfilled"
          ? (conversationsResponse.value?.data?.conversations || conversationsResponse.value?.conversations || [])
          : [];

        return { members, conversations };
      }}
    />
  );
}
