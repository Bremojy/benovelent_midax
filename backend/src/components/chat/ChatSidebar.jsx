import { useMemo } from "react";
import { Search, MessageCircle, Users, Crown, BadgeCheck, SlidersHorizontal, X } from "lucide-react";
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
  showMemberFilters = false,
  filterOptions = {},
  filters = {},
  setFilters,
  filtersOpen = false,
  setFiltersOpen,
  currentUser,
}) {
  const actor = useMemo(() => buildActorIdentity(currentUser), [currentUser]);

  const filteredMembers = useMemo(() => {
    const keyword = String(search || "").trim().toLowerCase();
    const sorted = [...members]
      .filter((member) => String(member?.role || "").toLowerCase() !== "superadmin")
      .filter((member) => !isSameIdentity(member, actor))
      .sort((a, b) => {
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
  }, [members, search, actor]);

  const filteredConversations = useMemo(() => {
    const keyword = String(search || "").trim().toLowerCase();
    const withoutSelf = conversations.filter((conversation) => !isSameIdentity(conversation.partner || {}, actor));
    if (!keyword) return withoutSelf;

    return withoutSelf.filter((conversation) => {
      const partner = conversation.partner || {};
      const haystack = [partner.fullName, partner.username, sanitizePreviewText(conversation.lastMessageText)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [conversations, search, actor]);

  const leaders = filteredMembers.filter((member) => isLeader(member.role));
  const regularMembers = filteredMembers.filter((member) => !isLeader(member.role));

  return (
    <div className="chat-sidebar modern-chat-sidebar">
      <div className="chat-sidebar-top">
        <div>
          <span className="chat-sidebar-eyebrow">Private portal</span>
          <h2>{title}</h2>
        </div>

        <div className="chat-sidebar-actions" aria-label="Chat actions">
          <button type="button" className="chat-new-button" onClick={() => setSearch?.("")} aria-label="Start a new chat">
            <MessageCircle size={17} />
            <span>New chat</span>
          </button>
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


      {showMemberFilters && (
        <div className="chat-filter-panel" aria-label="Member filters">
          <div className="chat-filter-toolbar">
            <button type="button" className="chat-filter-toggle" onClick={() => setFiltersOpen?.((open) => !open)} aria-expanded={filtersOpen}>
              <SlidersHorizontal size={16} />
              <span>Filter members</span>
              {hasActiveFilters(filters) ? <span className="chat-filter-count">Active</span> : null}
            </button>
            {hasActiveFilters(filters) ? (
              <button
                type="button"
                className="chat-filter-clear"
                title="Clear filters"
                aria-label="Clear filters"
                onClick={() => setFilters?.({ siteStation: "all", department: "all", position: "all", status: "all", online: "all", verified: "all" })}
              >
                <X size={15} />
                <span>Clear</span>
              </button>
            ) : null}
          </div>
          {filtersOpen ? (
            <div className="chat-filters">
              <select value={filters.siteStation || "all"} onChange={(e) => setFilters?.((p) => ({ ...p, siteStation: e.target.value }))}>
                <option value="all">All site stations</option>
                {(filterOptions.siteStation || []).map((value) => <option key={`station-${value}`} value={value}>{value}</option>)}
              </select>
              <select value={filters.department || "all"} onChange={(e) => setFilters?.((p) => ({ ...p, department: e.target.value }))}>
                <option value="all">All departments</option>
                {(filterOptions.department || []).map((value) => <option key={`dept-${value}`} value={value}>{value}</option>)}
              </select>
              <select value={filters.position || "all"} onChange={(e) => setFilters?.((p) => ({ ...p, position: e.target.value }))}>
                <option value="all">All positions</option>
                {(filterOptions.position || []).map((value) => <option key={`pos-${value}`} value={value}>{value}</option>)}
              </select>
              <select value={filters.status || "all"} onChange={(e) => setFilters?.((p) => ({ ...p, status: e.target.value }))}>
                <option value="all">All statuses</option>
                {(filterOptions.status || []).map((value) => <option key={`status-${value}`} value={value}>{value}</option>)}
              </select>
              <select value={filters.online || "all"} onChange={(e) => setFilters?.((p) => ({ ...p, online: e.target.value }))}>
                <option value="all">Any presence</option>
                <option value="true">Online now</option>
                <option value="false">Offline</option>
              </select>
              <select value={filters.verified || "all"} onChange={(e) => setFilters?.((p) => ({ ...p, verified: e.target.value }))}>
                <option value="all">Any verification</option>
                <option value="true">Verified only</option>
                <option value="false">Unverified</option>
              </select>
            </div>
          ) : null}
        </div>
      )}

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
                <div className="conversation-topline">
                  <h4>{partner.fullName || "Member"}</h4>
                  <span className="conversation-time">{formatChatTime(conversation.lastMessageTime || conversation.updatedAt || conversation.createdAt)}</span>
                </div>
                <div className="conversation-subline">
                  <p>{sanitizePreviewText(conversation.lastMessageText) || "Tap to start chatting"}</p>
                  {conversation.unreadCount > 0 && <span className="badge">{conversation.unreadCount}</span>}
                </div>
              </div>
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
          {safeDisplayName(member.fullName || member.name || member.username, member)}
          {member.verified ? <BadgeCheck size={14} className="verified-dot" /> : null}
        </h4>
        <p>
          {member.roleLabel || roleLabel(member.role)} · {formatPresence(member)}
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

function hasActiveFilters(filters = {}) {
  return Object.values(filters).some(
    (value) => value && value !== "all"
  );
}

function isLeader(role) {
  return ["admin"].includes(String(role || "").toLowerCase());
}

function roleLabel(role) {
  const value = String(role || "member").toLowerCase();
  if (value === "admin") return "Leader";
  return "Member";
}

function rankRole(role) {
  const value = String(role || "member").toLowerCase();
  if (value === "admin") return 0;
  return 2;
}

function sanitizePreviewText(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const looksLikeUrl = /^(https?:\/\/|www\.)/i.test(raw) || /cloudinary|res\.cloudinary/i.test(raw);
  const looksLikeFilePath = raw.includes("/") && /\b(upload|avatar|photo|image|video|document|file)\b/i.test(raw);
  if (looksLikeUrl || looksLikeFilePath) return "Attachment";
  return raw;
}

function formatPresence(member) {
  if (member?.online) return "Online now";
  if (!member?.lastSeen) return "Offline";
  const date = new Date(member.lastSeen);
  if (Number.isNaN(date.getTime())) return "Offline";
  return `Last seen ${date.toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`;
}

function safeDisplayName(value, fallbackSource = {}) {
  const raw = String(value || "").trim();
  const fallback = String(fallbackSource?.username || fallbackSource?.email || fallbackSource?.memberNumber || fallbackSource?.roleLabel || "Member").trim();
  if (!raw) return fallback || "Member";
  const looksLikeUrl = /^(https?:\/\/|www\.)/i.test(raw) || /cloudinary|res\.cloudinary/i.test(raw);
  const looksLikeFilePath = raw.includes("/") && /\b(upload|avatar|photo|image|video|document|file)\b/i.test(raw);
  if (looksLikeUrl || looksLikeFilePath) return fallback || "Member";
  return raw;
}

function buildActorIdentity(user) {
  return {
    id: String(user?._id || user?.id || user?.chatId || user?.memberId || "").trim(),
    email: String(user?.email || "").trim().toLowerCase(),
    username: String(user?.username || "").trim().toLowerCase(),
    memberNumber: String(user?.memberNumber || "").trim().toLowerCase(),
    phone: normalizePhone(user?.phone || user?.mobile || user?.telephone || ""),
  };
}

function isSameIdentity(candidate, actor) {
  if (!candidate || !actor) return false;
  const candidateId = String(candidate?._id || candidate?.id || candidate?.chatId || candidate?.memberId || "").trim();
  const candidateEmail = String(candidate?.email || "").trim().toLowerCase();
  const candidateUsername = String(candidate?.username || "").trim().toLowerCase();
  const candidateMemberNumber = String(candidate?.memberNumber || "").trim().toLowerCase();
  const candidatePhone = normalizePhone(candidate?.phone || candidate?.mobile || candidate?.telephone || "");

  return Boolean(
    (actor.id && candidateId && actor.id === candidateId) ||
    (actor.email && candidateEmail && actor.email === candidateEmail) ||
    (actor.username && candidateUsername && actor.username === candidateUsername) ||
    (actor.memberNumber && candidateMemberNumber && actor.memberNumber === candidateMemberNumber) ||
    (actor.phone && candidatePhone && actor.phone === candidatePhone)
  );
}

function normalizePhone(value) {
  return String(value || "").replace(/[^\d+]/g, "").trim();
}

function formatChatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const diff = Math.floor((now - date) / 86400000);
  if (diff === 1) return "Yesterday";
  if (diff < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { day: "2-digit", month: "short" });
}

export default ChatSidebar;
