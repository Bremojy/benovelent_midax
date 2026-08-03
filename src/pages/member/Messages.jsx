import MessageCenterPage from "../../components/chat/MessageCenterPage";
import API from "../../services/api";

export default function Messages() {
  return (
    <MessageCenterPage
      eyebrow="MEMBER MESSAGE CENTRE"
      title="Connect with other members"
      description="Start private conversations, follow up on support matters and keep your communication inside the portal."
      searchPlaceholder="Search members or conversations..."
      memberSectionLabel="All members"
      emptyMembersLabel="No other members are available right now."
      emptyConversationsLabel="No conversations yet — choose a member to start."
      onRefreshHint="Member conversations refreshed."
      loadContacts={async () => {
        const [membersResponse, conversationsResponse] = await Promise.allSettled([
          API.get("/member/chat-members"),
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
