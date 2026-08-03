import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Phone, Video } from "lucide-react";
import { io } from "socket.io-client";

import DashboardLayout from "../../layouts/DashboardLayout";
import ChatSidebar from "../../components/chat/ChatSidebar";
import ChatWindow from "../../components/chat/ChatWindow";
import API from "../../services/api";
import { useAuth } from "../../context/AuthContext";

import "./messages.css";

const SOCKET_URL = import.meta.env.VITE_API_URL || "https://benovelent-midax.onrender.com";

function Messages() {
  const { user } = useAuth();

  const [selectedConversation, setSelectedConversation] = useState(null);
  const [currentUser, setCurrentUser] = useState(user || null);
  const [socket, setSocket] = useState(null);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState("");
  const [loadingSidebar, setLoadingSidebar] = useState(true);
  const [callBanner, setCallBanner] = useState("");

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (!currentUser?._id) return;

    const newSocket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      auth: {
        token: localStorage.getItem("memberToken"),
      },
      query: {
        token: localStorage.getItem("memberToken"),
      },
    });

    newSocket.on("connect", () => {
      console.log("💬 Chat socket connected:", newSocket.id);
      newSocket.emit("user-online", currentUser._id);
    });

    newSocket.on("connect_error", (error) => {
      console.error("Chat socket connection error:", error);
    });

    newSocket.on("disconnect", (reason) => {
      console.log("Chat socket disconnected:", reason);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, [currentUser?._id]);

  useEffect(() => {
    if (!currentUser?._id) return;
    loadChatData();
  }, [currentUser?._id]);

  async function loadCurrentUser() {
    try {
      const response = await API.get("/auth/me");
      const me = response.data?.user || response.data?.member || response.data?.data || null;
      setCurrentUser(me || user || null);
    } catch (error) {
      console.error("Load current user error:", error);
    }
  }

  async function loadChatData() {
    try {
      setLoadingSidebar(true);
      const [membersResponse, conversationsResponse] = await Promise.allSettled([
        API.get("/member/chat-members"),
        API.get("/conversations"),
      ]);

      if (membersResponse.status === "fulfilled") {
        setMembers(normalizeMembers(membersResponse.value.data?.members || []));
      }

      if (conversationsResponse.status === "fulfilled") {
        setConversations(
          normalizeConversations(
            conversationsResponse.value.data?.conversations || conversationsResponse.value.data || [],
            currentUser?._id
          )
        );
      }
    } catch (error) {
      console.error("Load chat data error:", error);
    } finally {
      setLoadingSidebar(false);
    }
  }

  const selectConversation = (conversation) => {
    setSelectedConversation(conversation);
    setMobileChatOpen(true);
  };

  const startConversation = async (member) => {
    try {
      const existing = conversations.find(
        (conversation) => String(conversation.partner?._id) === String(member._id)
      );
      if (existing) {
        selectConversation(existing);
        return;
      }

      const response = await API.post("/conversations", {
        participantId: member._id,
      });

      const conversation = normalizeConversation(
        response.data?.conversation || response.data,
        currentUser?._id
      );

      setConversations((previous) => [conversation, ...previous.filter((item) => String(item._id) !== String(conversation._id))]);
      selectConversation(conversation);
    } catch (error) {
      console.error("Unable to open conversation:", error);
    }
  };

  const handleBackToConversations = () => {
    setMobileChatOpen(false);
  };

  const handleAudioCall = () => {
    if (!selectedConversation?.partner) return;
    setCallBanner(`Audio call request started with ${selectedConversation.partner.fullName}.`);
    window.alert("Audio calling will activate once WebRTC signaling is connected.");
  };

  const handleVideoCall = () => {
    if (!selectedConversation?.partner) return;
    setCallBanner(`Video call request started with ${selectedConversation.partner.fullName}.`);
    window.alert("Video calling will activate once WebRTC signaling is connected.");
  };

  const sidebarConversations = useMemo(
    () => normalizeConversations(conversations, currentUser?._id),
    [conversations, currentUser?._id]
  );

  const sidebarMembers = useMemo(
    () => normalizeMembers(members),
    [members]
  );

  return (
    <DashboardLayout>
      <div className={`messages-page ${mobileChatOpen ? "mobile-chat-open" : ""}`}>
        <div className="messages-summary-bar">
          <div><strong>{sidebarMembers.length}</strong><span>Members available</span></div>
          <div><strong>{sidebarConversations.length}</strong><span>Conversations live</span></div>
        </div>
        <div className="messages-sidebar-container">
          <ChatSidebar
            title="Member Messages"
            searchPlaceholder="Search members or conversations..."
            members={sidebarMembers}
            conversations={sidebarConversations}
            selectedConversationId={selectedConversation?._id}
            onSelectConversation={selectConversation}
            onStartConversation={startConversation}
            search={search}
            setSearch={setSearch}
            loading={loadingSidebar}
            emptyMembersLabel="No members found"
            emptyConversationsLabel="No conversations yet"
          />
        </div>

        <div className="messages-chat-container">
          <div className="messages-top-mobile-actions">
            <button type="button" onClick={handleBackToConversations}>
              <ArrowLeft size={18} />
              Back
            </button>
            <button type="button" onClick={handleAudioCall} disabled={!selectedConversation}>
              <Phone size={18} />
              Audio
            </button>
            <button type="button" onClick={handleVideoCall} disabled={!selectedConversation}>
              <Video size={18} />
              Video
            </button>
          </div>

          {callBanner && <div className="messages-call-banner">{callBanner}</div>}

          <ChatWindow
            conversation={selectedConversation}
            socket={socket}
            currentUser={currentUser}
            onBack={handleBackToConversations}
            onAudioCall={handleAudioCall}
            onVideoCall={handleVideoCall}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}

function normalizeMembers(items) {
  return (items || []).map((member) => ({
    ...member,
    online: Boolean(member.online),
  }));
}

function normalizeConversation(conversation, currentUserId) {
  if (!conversation) return null;

  const participants = Array.isArray(conversation.participants) ? conversation.participants : [];
  const partner =
    conversation.partner ||
    participants.find((member) => String(member?._id || member) !== String(currentUserId)) ||
    null;

  return {
    ...conversation,
    partner,
    lastMessageText: conversation.lastMessageText || conversation.lastMessage?.message || "",
  };
}

function normalizeConversations(items, currentUserId) {
  return (items || [])
    .map((conversation) => {
      const participants = Array.isArray(conversation.participants) ? conversation.participants : [];
      const partner =
        participants.find((member) => String(member?._id || member) !== String(currentUserId)) ||
        conversation.partner ||
        null;

      return {
        ...conversation,
        partner,
        lastMessageText:
          conversation.lastMessageText ||
          conversation.lastMessage?.message ||
          conversation.lastMessage?.text ||
          "",
      };
    })
    .sort((a, b) => new Date(b.lastMessageTime || b.updatedAt || b.createdAt) - new Date(a.lastMessageTime || a.updatedAt || a.createdAt));
}

export default Messages;
