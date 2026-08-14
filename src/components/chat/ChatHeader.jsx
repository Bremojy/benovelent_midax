import { ArrowLeft, Phone, Video, Info, BadgeCheck } from "lucide-react";
import "./ChatHeader.css";

function formatLastSeen(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "offline";
  return date.toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function ChatHeader({ conversation, partner, typingUser, onAudioCall, onVideoCall, onBack }) {
  const user =
    partner ||
    conversation?.partner ||
    conversation?.user ||
    conversation?.participants?.find((member) => member?._id !== conversation?.currentUserId) ||
    {};

  if (!conversation) {
    return <div className="chat-header empty">Select a conversation</div>;
  }

  const role = String(user.roleLabel || user.role || "member");

  return (
    <div className="chat-header modern-chat-header">
      <div className="chat-user">
        {onBack ? (
          <button type="button" className="chat-back-button" onClick={onBack} aria-label="Back to chats">
            <ArrowLeft size={20} />
          </button>
        ) : null}

        <div className="chat-avatar">
          <img src={user.profileImage || "/default-avatar.svg"} alt={user.fullName || "Member"} loading="lazy" decoding="async" />
          {user.online && <span className="online-indicator" />}
        </div>

        <div className="chat-user-info" title={`${user.fullName || "Member"}${user.email ? ` • ${user.email}` : ""}`}>
          <div className="chat-name-row">
            <h3>{user.fullName || "Member"}</h3>
            {user.verified ? <BadgeCheck size={16} className="verified-dot" /> : null}
            {role ? <span className="role-chip">{role}</span> : null}
          </div>
          {typingUser ? <p className="typing-status">Typing...</p> : <p>{user.online ? "Online now" : user.lastSeen ? `Last seen ${formatLastSeen(user.lastSeen)}` : "Offline"}</p>}
          {user.siteStation ? <span className="chat-profile-meta">{user.siteStation}{user.department ? ` • ${user.department}` : ""}</span> : null}
        </div>
      </div>

      {(onAudioCall || onVideoCall) && (
        <div className="chat-actions">
          {onAudioCall && (
            <button type="button" title="Audio call" aria-label="Audio call" onClick={onAudioCall}>
              <Phone size={20} />
            </button>
          )}
          {onVideoCall && (
            <button type="button" title="Video call" aria-label="Video call" onClick={onVideoCall}>
              <Video size={20} />
            </button>
          )}
          <button type="button" title="Profile" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <Info size={20} />
          </button>
        </div>
      )}
    </div>
  );
}

export default ChatHeader;
