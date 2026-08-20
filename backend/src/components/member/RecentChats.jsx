import { useEffect, useState } from "react";
import { Search, Circle, Send } from "lucide-react";
import { Link } from "react-router-dom";
import API from "../../services/api";
import "./RecentChats.css";

export default function RecentChats() {
  const [chats, setChats] = useState([]);
  useEffect(() => { API.get("/conversations").then(({ data }) => setChats(Array.isArray(data?.conversations) ? data.conversations.slice(0, 5) : [])).catch(() => setChats([])); }, []);
  return <div className="recent-chats"><div className="chat-header"><h2>Messages</h2><Search size={18} /></div><div className="chat-list">{chats.length === 0 ? <div className="portal-empty">No conversations yet.</div> : chats.map((conversation) => { const user = conversation.partner || conversation.participants?.find?.(() => true) || {}; return <div key={conversation._id} className="chat-item"><div className="chat-avatar">{String(user.fullName || "M").charAt(0)}{user.online && <Circle size={10} fill="#22c55e" color="#22c55e" className="online" />}</div><div className="chat-content"><h4>{user.fullName || "Member"}</h4><p>{conversation.lastMessageText || "No messages yet"}</p></div><div className="chat-right"><small>{conversation.updatedAt ? new Date(conversation.updatedAt).toLocaleDateString() : ""}</small></div></div>; })}</div><Link className="new-message-btn" to="/member/messages"><Send size={18}/> New Message</Link></div>;
}
