import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

import API from "../../services/api";
import "./ChatPreview.css";

function ChatPreview() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    try {
      const { data } = await API.get("/conversations");
      const next = Array.isArray(data)
        ? data
        : data?.conversations || data?.data?.conversations || [];
      setConversations(Array.isArray(next) ? next : []);
    } catch (error) {
      console.warn(
        "Chat preview unavailable:",
        error?.response?.data?.message || error?.message || error
      );
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="chat-preview">Loading conversations...</div>;
  }

  return (
    <div className="chat-preview">
      <div className="chat-preview-header">
        <div>
          <MessageCircle size={26} />
          <h2>Recent Chats</h2>
        </div>

        <button className="view-chat-btn" onClick={() => navigate("/member/messages")}>
          Open Chat
        </button>
      </div>

      {conversations.length === 0 && <div className="empty-chat">No conversations yet.</div>}

      {conversations.slice(0, 5).map((conversation) => (
        <button
          key={conversation._id}
          type="button"
          className="chat-item"
          onClick={() => navigate("/member/messages", { state: { conversationId: conversation._id } })}
        >
          <div className="chat-avatar">
            <img
              src={conversation.user?.profileImage || "/default-avatar.svg"}
              alt="avatar"
            />
            {conversation.user?.online && <span className="online-status" />}
          </div>

          <div className="chat-info">
            <h4>{conversation.user?.fullName || "Member"}</h4>
            <p>{conversation.lastMessage || "Start chatting..."}</p>
          </div>

          <div className="chat-meta">
            <small>
              {conversation.updatedAt ? new Date(conversation.updatedAt).toLocaleTimeString() : ""}
            </small>
          </div>
        </button>
      ))}
    </div>
  );
}

export default ChatPreview;
