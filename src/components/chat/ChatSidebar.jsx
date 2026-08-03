import { useMemo } from "react";
import { Search, MessageCircle, Users, Circle } from "lucide-react";
import "./ChatSidebar.css";

function ChatSidebar({
  title = "Messages",
  searchPlaceholder = "Search people...",
  members = [],
  conversations = [],
  selectedConversationId,
  onSelectConversation,
  onStartConversation,
  search,
  setSearch,
  loading,
  emptyConversationsLabel = "No conversations yet",
  emptyMembersLabel = "No people found",
  memberSectionLabel = "All people",
  conversationSectionLabel = "Recent chats",
}) {
  const filteredMembers = useMemo(() => {
    const keyword = String(search || "").trim().toLowerCase();
    if (!keyword) return members;

    return members.filter((member) => {
      const name = String(member.fullName || "").toLowerCase();
      const username = String(member.username || "").toLowerCase();
      const department = String(member.department || "").toLowerCase();
      return name.includes(keyword) || username.includes(keyword) || department.includes(keyword);
    });
  }, [members, search]);

  const filteredConversations = useMemo(() => {
    const keyword = String(search || "").trim().toLowerCase();
    if (!keyword) return conversations;

    return conversations.filter((conversation) => {
      const partner = conversation.partner || {};
      const name = String(partner.fullName || "").toLowerCase();
      const lastMessage = String(conversation.lastMessageText || "").toLowerCase();
      return name.includes(keyword) || lastMessage.includes(keyword);
    });
  }, [conversations, search]);

  return (
    <div className="chat-sidebar">
      <div className="chat-sidebar-top">
        <h2>{title}</h2>

        <div className="chat-search">
          <Search size={18} />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch?.(e.target.value)}
          />
        </div>
      </div>

      <div className="chat-section-label">
        <MessageCircle size={16} />
        <span>{conversationSectionLabel}</span>
      </div>

      <div className="conversation-list">
        {loading && (
          <div className="chat-loading">Loading conversations...</div>
        )}

        {!loading && filteredConversations.length === 0 && (
          <div className="chat-empty">{emptyConversationsLabel}</div>
        )}

        {filteredConversations.map((conversation) => {
          const partner = conversation.partner || {};
          const isActive = selectedConversationId === conversation._id;

          return (
            <div
              key={conversation._id}
              className={isActive ? "conversation active" : "conversation"}
              onClick={() => onSelectConversation?.(conversation)}
            >
              <div className="avatar">
                <img
                  src={partner.profileImage || "/default-avatar.svg"}
                  alt={partner.fullName || "Member"}
                />
                {partner.online && <span className="online-dot" />}
              </div>

              <div className="conversation-info">
                <h4>{partner.fullName || "Member"}</h4>
                <p>{conversation.lastMessageText || "No messages yet"}</p>
              </div>

              {conversation.unreadCount > 0 && (
                <span className="badge">{conversation.unreadCount}</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="chat-section-label">
        <Users size={16} />
        <span>{memberSectionLabel}</span>
      </div>

      <div className="member-directory">
        {filteredMembers.length === 0 && (
          <div className="chat-empty">{emptyMembersLabel}</div>
        )}

        {filteredMembers.map((member) => (
          <button
            type="button"
            key={member._id}
            className="member-row"
            onClick={() => onStartConversation?.(member)}
          >
            <div className="avatar">
              <img
                src={member.profileImage || "/default-avatar.svg"}
                alt={member.fullName || "Member"}
              />
              <span className={member.online ? "online-dot" : "offline-dot"} />
            </div>

            <div className="conversation-info">
              <h4>{member.fullName || "Member"}</h4>
              <p>
                {member.online ? "Online now" : member.lastSeen ? `Last seen ${new Date(member.lastSeen).toLocaleDateString()}` : "Offline"}
              </p>
            </div>

            {member.conversationId ? (
              <span className="member-chat-tag">Chat</span>
            ) : (
              <span className="member-chat-tag muted">New</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default ChatSidebar;
