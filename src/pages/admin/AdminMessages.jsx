
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Phone, RefreshCw, Video } from "lucide-react";
import { io } from "socket.io-client";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../services/api";
import { getAdminColleagues, getAdminMembers } from "../../services/adminService";
import ChatSidebar from "../../components/chat/ChatSidebar";
import ChatWindow from "../../components/chat/ChatWindow";
import "../../pages/member/messages.css";

const SOCKET_URL = import.meta.env.VITE_API_URL || "https://benovelent-midax.onrender.com";

export default function AdminMessages() {
  const [currentUser, setCurrentUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [people, setPeople] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState("");
  const [loadingSidebar, setLoadingSidebar] = useState(true);
  const [banner, setBanner] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const me = await API.get("/auth/me");
        if (!active) return;
        setCurrentUser(me.data?.user || me.data?.member || me.data?.data || null);
      } catch {
        // ignore
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!currentUser?._id) return;
    const s = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      auth: { token: getToken() },
      query: { token: getToken() },
    });
    s.on("connect", () => s.emit("user-online", currentUser._id));
    setSocket(s);
    return () => s.disconnect();
  }, [currentUser?._id]);

  useEffect(() => {
    if (!currentUser?._id) return;
    loadPeople();
  }, [currentUser?._id]);

  const loadPeople = async () => {
    try {
      setLoadingSidebar(true);
      const [membersRes, adminsRes, convRes] = await Promise.allSettled([
        getAdminMembers({ page: 1, limit: 200 }),
        getAdminColleagues(),
        API.get("/conversations"),
      ]);

      const members = membersRes.status === "fulfilled" ? membersRes.value.members || [] : [];
      const admins = adminsRes.status === "fulfilled" ? adminsRes.value.colleagues || [] : [];
      const merged = [...admins, ...members].map(normalizePerson);
      setPeople(merged);

      if (convRes.status === "fulfilled") {
        setConversations(normalizeConversations(convRes.value.data?.conversations || convRes.value.data || [], currentUser?._id));
      }
    } finally {
      setLoadingSidebar(false);
    }
  };

  const startConversation = async (person) => {
    try {
      const existing = conversations.find((conversation) => String(conversation.partner?._id) === String(person._id));
      if (existing) {
        setSelectedConversation(existing);
        return;
      }
      const response = await API.post("/conversations", { participantId: person._id });
      const next = normalizeConversation(response.data?.conversation || response.data, currentUser?._id);
      setConversations((previous) => [next, ...previous.filter((item) => String(item._id) !== String(next._id))]);
      setSelectedConversation(next);
    } catch (error) {
      setBanner(error.response?.data?.message || error.message || "Unable to start conversation.");
    }
  };

  const selectConversation = (conversation) => setSelectedConversation(conversation);

  const sidebarConversations = useMemo(() => normalizeConversations(conversations, currentUser?._id), [conversations, currentUser?._id]);

  return (
    <DashboardLayout>
      <div className="messages-page">
        <div className="messages-sidebar-container">
          <ChatSidebar
            title="Admin Message Center"
            searchPlaceholder="Search admins or members..."
            memberSectionLabel="People"
            conversationSectionLabel="Recent chats"
            members={people}
            conversations={sidebarConversations}
            selectedConversationId={selectedConversation?._id}
            onSelectConversation={selectConversation}
            onStartConversation={startConversation}
            search={search}
            setSearch={setSearch}
            loading={loadingSidebar}
            emptyMembersLabel="No admins or members found"
          />
        </div>

        <div className="messages-chat-container">
          <div className="messages-top-mobile-actions">
            <button type="button" onClick={() => setSelectedConversation(null)}>
              <ArrowLeft size={18} />
              Back
            </button>
            <button type="button" onClick={() => setBanner("Audio call center is ready for future WebRTC integration.")}>
              <Phone size={18} />
              Audio
            </button>
            <button type="button" onClick={() => setBanner("Video call center is ready for future WebRTC integration.")}>
              <Video size={18} />
              Video
            </button>
            <button type="button" onClick={loadPeople}>
              <RefreshCw size={18} />
              Refresh
            </button>
          </div>

          {banner && <div className="messages-call-banner">{banner}</div>}

          <ChatWindow
            conversation={selectedConversation}
            socket={socket}
            currentUser={currentUser}
            onBack={() => setSelectedConversation(null)}
            onAudioCall={() => setBanner("Audio call center is ready for future WebRTC integration.")}
            onVideoCall={() => setBanner("Video call center is ready for future WebRTC integration.")}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}

function getToken() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const role = String(user?.role || "").toLowerCase();
  if (role === "superadmin") return localStorage.getItem("superAdminToken");
  if (role === "admin") return localStorage.getItem("adminToken");
  return localStorage.getItem("memberToken");
}

function normalizePerson(item) {
  return {
    ...item,
    fullName: item.fullName || item.name || "User",
    profileImage: item.profileImage || "",
    online: Boolean(item.online),
  };
}

function normalizeConversation(conversation, currentUserId) {
  if (!conversation) return null;
  const participants = Array.isArray(conversation.participants) ? conversation.participants : [];
  const partner = conversation.partner || participants.find((member) => String(member?._id || member) !== String(currentUserId)) || null;
  return {
    ...conversation,
    partner,
    lastMessageText: conversation.lastMessageText || conversation.lastMessage?.message || "",
  };
}

function normalizeConversations(items, currentUserId) {
  return (items || [])
    .map((conversation) => normalizeConversation(conversation, currentUserId))
    .sort((a, b) => new Date(b.lastMessageTime || b.updatedAt || b.createdAt) - new Date(a.lastMessageTime || a.updatedAt || a.createdAt));
}
