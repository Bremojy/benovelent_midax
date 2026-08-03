import { useMemo } from "react";
import { Search, MessageCircle, Users, Crown, Circle, BadgeCheck } from "lucide-react";
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
    const sorted = [...members].sort((a, b) => {
      const roleRank = rankRole(a.role) - rankRole(b.role);
      if (roleRank !== 0) return roleRank;
      return String(a.fullName || "").localeCompare(String(b.fullName || ""));
    });

    if (!keyword) return sorted;

    return sorted.filter((member) => {
      const haystack = [member.fullName, member.username, member.department, member.position, member.email, member.roleLabel]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [members, search]);

  const filteredConversations = useMemo(() => {
    const keyword = String(search || "").trim().toLowerCase();
    if (!keyword) return conversations;

    return conversations.filter((conversation) => {
      const partner = conversation.partner || {};
      const haystack = [partner.fullName, partner.username, conversation.lastMessageText]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [conversations, search]);

  const leaders = filteredMembers.filter((member) => isLeader(member.role));
  const regularMembers = filteredMembers.filter((member) => !isLeader(member.role));

  return (
    <div className="chat-sidebar modern-chat-sidebar">
      <div className="chat-sidebar-top">
        <div>
          <span className="chat-sidebar-eyebrow">Private portal</span>
          <h2>{title}</h2>
        </div>

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

      <div className="chat-directory-summary">
        <div><strong>{leaders.length}</strong><span>Leaders</span></div>
        <div><strong>{regularMembers.length}</strong><span>Members</span></div>
        <div><strong>{filteredConversations.length}</strong><span>Chats</span></div>
      </div>

      <Section icon={<MessageCircle size={16} />} label={conversationSectionLabel}>
        {loading && <div className="chat-loading">Loading conversations...</div>}
        {!loading && filteredConversations.length === 0 && <div className="chat-empty">{emptyConversationsLabel}</div>}
        {filteredConversations.map((conversation) => {
          const partner = conversation.partner || {};
          const isActive = selectedConversationId === conversation._id;
          return (
            <button
              key={conversation._id}
              type="button"
              className={isActive ? "conversation active" : "conversation"}
              onClick={() => onSelectConversation?.(conversation)}
            >
              <Avatar user={partner} isOnline={partner.online} />
              <div className="conversation-info">
                <h4>
                  {partner.fullName || "Member"}
                  {partner.roleLabel ? <span className="role-chip small">{partner.roleLabel}</span> : null}
                </h4>
                <p>{conversation.lastMessageText || "Tap to continue the conversation"}</p>
              </div>
              {conversation.unreadCount > 0 && <span className="badge">{conversation.unreadCount}</span>}
            </button>
          );
        })}
      </Section>

      <Section icon={<Crown size={16} />} label="Leaders">
        {leaders.length === 0 && <div className="chat-empty">{emptyMembersLabel}</div>}
        {leaders.map((member) => (
          <ContactRow
            key={member._id}
            member={member}
            onClick={() => onStartConversation?.(member)}
          />
        ))}
      </Section>

      <Section icon={<Users size={16} />} label={memberSectionLabel}>
        {regularMembers.length === 0 && <div className="chat-empty">{emptyMembersLabel}</div>}
        {regularMembers.map((member) => (
          <ContactRow
            key={member._id}
            member={member}
            onClick={() => onStartConversation?.(member)}
          />
        ))}
      </Section>
    </div>
  );
}

function Section({ icon, label, children }) {
  return (
    <section className="chat-section-block">
      <div className="chat-section-label">
        {icon}
        <span>{label}</span>
      </div>
      <div className="member-directory">{children}</div>
    </section>
  );
}

function ContactRow({ member, onClick }) {
  return (
    <button type="button" className="member-row" onClick={onClick}>
      <Avatar user={member} isOnline={member.online} />
      <div className="conversation-info">
        <h4>
          {member.fullName || "Member"}
          {member.verified ? <BadgeCheck size={14} className="verified-dot" /> : null}
        </h4>
        <p>
          {member.roleLabel || roleLabel(member.role)} · {member.online ? "Online now" : member.lastSeen ? `Last seen ${new Date(member.lastSeen).toLocaleDateString()}` : "Offline"}
        </p>
      </div>
      <span className={`member-chat-tag ${member.conversationId ? "" : "muted"}`}>
        {member.conversationId ? "Chat" : "New"}
      </span>
    </button>
  );
}

function Avatar({ user, isOnline }) {
  return (
    <div className="avatar">
      <img src={user.profileImage || "/default-avatar.svg"} alt={user.fullName || "Member"} loading="lazy" decoding="async" />
      <span className={isOnline ? "online-dot" : "offline-dot"} />
    </div>
  );
}

function isLeader(role) {
  return ["admin", "superadmin"].includes(String(role || "").toLowerCase());
}

function roleLabel(role) {
  const value = String(role || "member").toLowerCase();
  if (value === "superadmin") return "Super Admin";
  if (value === "admin") return "Leader";
  return "Member";
}

function rankRole(role) {
  const value = String(role || "member").toLowerCase();
  if (value === "superadmin") return 0;
  if (value === "admin") return 1;
  return 2;
}

export default ChatSidebar;
