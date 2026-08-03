import {
  Phone,
  Video,
  Info,
  Circle,
} from "lucide-react";

import "./ChatHeader.css";

function ChatHeader({
  conversation,
  partner,
  typingUser,
  onAudioCall,
  onVideoCall,
}) {
  const user = partner || conversation?.partner || conversation?.user || conversation?.participants?.find((member) => member?._id !== conversation?.currentUserId) || {};

  if (!conversation) {
    return (
      <div className="chat-header empty">
        Select a conversation
      </div>
    );
  }

  return (
    <div className="chat-header">
      <div className="chat-user">
        <div className="chat-avatar">
          <img
            src={user.profileImage || "/default-avatar.svg"}
            alt={user.fullName || "Member"}
          />
          {user.online && (
            <span className="online-indicator">
              <Circle size={10} fill="#22c55e" stroke="#22c55e" />
            </span>
          )}
        </div>

        <div className="chat-user-info">
          <h3>{user.fullName || "Member"}</h3>
          {typingUser ? (
            <p className="typing-status">Typing...</p>
          ) : (
            <p>{user.online ? "Online" : "Offline"}</p>
          )}
        </div>
      </div>

      <div className="chat-actions">
        <button type="button" title="Audio call" aria-label="Audio call" onClick={onAudioCall}>
          <Phone size={20} />
        </button>
        <button type="button" title="Video call" aria-label="Video call" onClick={onVideoCall}>
          <Video size={20} />
        </button>
        <button type="button" title="Profile" onClick={() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}>
          <Info size={20} />
        </button>
      </div>
    </div>
  );
}

export default ChatHeader;
