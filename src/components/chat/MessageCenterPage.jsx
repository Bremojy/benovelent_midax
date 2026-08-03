import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, MessageCircleMore, RefreshCw, ShieldCheck, UserRound, Users, Video, Phone } from "lucide-react";
import { io } from "socket.io-client";
import DashboardLayout from "../../layouts/DashboardLayout";
import ChatSidebar from "./ChatSidebar";
import ChatWindow from "./ChatWindow";
import API from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import "../../pages/member/messages.css";

function MessageCenterPage({
  title,
  eyebrow,
  description,
  searchPlaceholder,
  memberSectionLabel,
  emptyMembersLabel,
  emptyConversationsLabel,
  loadContacts,
  onRefreshHint,
}) {
  const { user: authUser } = useAuth();

  const [currentUser, setCurrentUser] = useState(authUser || null);
  const [socket, setSocket] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [people, setPeople] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState("");
  const [loadingSidebar, setLoadingSidebar] = useState(true);
  const [banner, setBanner] = useState("");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const loadContactsRef = useRef(loadContacts);

  useEffect(() => {
    loadContactsRef.current = loadContacts;
  }, [loadContacts]);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const response = await API.get("/auth/me");
        if (!active) return;
        const me = response.data?.user || response.data?.member || response.data?.data || authUser || null;
        setCurrentUser(me);
      } catch {
        setCurrentUser(authUser || null);
      }
    })();

    return () => {
      active = false;
    };
  }, [authUser]);

  useEffect(() => {
    if (!currentUser?._id) return;

    const token = getToken(currentUser?.role);
    const newSocket = io(import.meta.env.VITE_API_URL || "https://benovelent-midax.onrender.com", {
      transports: ["websocket", "polling"],
      auth: { token },
      query: { token },
    });

    newSocket.on("connect", () => {
      newSocket.emit("user-online", currentUser._id);
    });

    newSocket.on("connect_error", (error) => {
      console.error("Chat socket connection error:", error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, [currentUser?._id, currentUser?.role]);

  useEffect(() => {
    if (!currentUser?._id) return;

    let active = true;

    const load = async () => {
      try {
        setLoadingSidebar(true);
        const result = await loadContactsRef.current({ currentUser });
        if (!active) return;

        const peopleList = Array.isArray(result?.members) ? result.members : Array.isArray(result?.data?.members) ? result.data.members : [];
        const conversationList = Array.isArray(result?.conversations) ? result.conversations : Array.isArray(result?.data?.conversations) ? result.data.conversations : [];
        setPeople(peopleList);
        setConversations(conversationList);
      } catch (error) {
        console.error("Load chat data error:", error);
        if (active) {
          setPeople([]);
          setConversations([]);
        }
      } finally {
        if (active) setLoadingSidebar(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [currentUser?._id]);

  const normalizedConversations = useMemo(
    () => normalizeConversations(conversations, currentUser?._id),
    [conversations, currentUser?._id]
  );

  const normalizedPeople = useMemo(
    () => normalizeMembers(people),
    [people]
  );

  useEffect(() => {
    if (!selectedConversation && normalizedConversations.length > 0) {
      setSelectedConversation(normalizedConversations[0]);
      setMobileChatOpen(true);
    }
  }, [normalizedConversations, selectedConversation]);

  const selectConversation = (conversation) => {
    if (!conversation) return;
    setSelectedConversation(conversation);
    setMobileChatOpen(true);
  };

  const startConversation = async (person) => {
    try {
      if (!person?._id) return;

      const existingConversation =
        normalizedConversations.find(
          (conversation) => String(conversation.partner?._id) === String(person._id)
        ) ||
        normalizedConversations.find((conversation) =>
          (conversation.participants || []).some((participant) => String(participant?._id || participant) === String(person._id))
        );

      if (existingConversation) {
        selectConversation(existingConversation);
        return;
      }

      if (person.conversationId) {
        const response = await API.get(`/conversations/${person.conversationId}`);
        const conversation = normalizeConversation(response.data?.conversation || response.data, currentUser?._id);
        if (conversation) {
          setConversations((previous) => [conversation, ...previous.filter((item) => String(item._id) !== String(conversation._id))]);
          selectConversation(conversation);
          return;
        }
      }

      const response = await API.post("/conversations", { participantId: person._id });
      const conversation = normalizeConversation(response.data?.conversation || response.data, currentUser?._id);

      if (conversation) {
        setConversations((previous) => [conversation, ...previous.filter((item) => String(item._id) !== String(conversation._id))]);
        selectConversation(conversation);
      }
    } catch (error) {
      setBanner(error.response?.data?.message || error.message || "Unable to start conversation.");
    }
  };

  const refreshChat = async () => {
    try {
      setBanner(onRefreshHint || "Messages refreshed.");
      const result = await loadContactsRef.current({ currentUser });
      const peopleList = Array.isArray(result?.members) ? result.members : Array.isArray(result?.data?.members) ? result.data.members : [];
      const conversationList = Array.isArray(result?.conversations) ? result.conversations : Array.isArray(result?.data?.conversations) ? result.data.conversations : [];
      setPeople(peopleList);
      setConversations(conversationList);
    } catch (error) {
      console.error("Refresh chat error:", error);
      setBanner(error?.message || "Unable to refresh conversations.");
    }
  };

  const handleAudioCall = () => {
    if (!selectedConversation?.partner) return;
    setBanner(`Audio call started with ${selectedConversation.partner.fullName}.`);
  };

  const handleVideoCall = () => {
    if (!selectedConversation?.partner) return;
    setBanner(`Video call started with ${selectedConversation.partner.fullName}.`);
  };

  const mobileBack = () => setMobileChatOpen(false);

  const summary = useMemo(() => {
    return {
      people: normalizedPeople.length,
      conversations: normalizedConversations.length,
      online: normalizedPeople.filter((person) => person.online).length,
    };
  }, [normalizedPeople, normalizedConversations]);

  return (
    <DashboardLayout>
      <div className="message-center">
        <section className="message-center-hero">
          <div className="message-center-hero-copy">
            <span className="message-center-kicker">{eyebrow}</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>

          <div className="message-center-hero-actions">
            <button type="button" className="portal-chip-action" onClick={refreshChat}>
              <RefreshCw size={16} />
              Refresh
            </button>
            <button type="button" className="portal-chip-action ghost" onClick={() => setBanner("Communication remains private and encrypted inside the portal.")}>
              <ShieldCheck size={16} />
              Privacy
            </button>
          </div>
        </section>

        <section className="message-center-metrics">
          <Metric icon={<Users size={20} />} label="People available" value={summary.people} />
          <Metric icon={<MessageCircleMore size={20} />} label="Active chats" value={summary.conversations} />
          <Metric icon={<UserRound size={20} />} label="Online now" value={summary.online} />
        </section>

        {banner && <div className="messages-call-banner">{banner}</div>}

        <div className={`messages-page message-center-shell ${mobileChatOpen ? "mobile-chat-open" : ""}`}>
          <div className="messages-sidebar-container">
            <ChatSidebar
              title={title}
              searchPlaceholder={searchPlaceholder}
              memberSectionLabel={memberSectionLabel}
              conversationSectionLabel="Recent conversations"
              members={normalizedPeople}
              conversations={normalizedConversations}
              selectedConversationId={selectedConversation?._id}
              onSelectConversation={selectConversation}
              onStartConversation={startConversation}
              search={search}
              setSearch={setSearch}
              loading={loadingSidebar}
              emptyMembersLabel={emptyMembersLabel}
              emptyConversationsLabel={emptyConversationsLabel}
            />
          </div>

          <div className="messages-chat-container">
            <div className="messages-top-mobile-actions">
              <button type="button" onClick={mobileBack}>
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
              <button type="button" onClick={refreshChat}>
                <RefreshCw size={18} />
                Refresh
              </button>
            </div>

            <ChatWindow
              conversation={selectedConversation}
              socket={socket}
              currentUser={currentUser}
              onBack={mobileBack}
              onAudioCall={handleAudioCall}
              onVideoCall={handleVideoCall}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Metric({ icon, label, value }) {
  return (
    <div className="message-center-metric">
      <div className="message-center-metric-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function getToken(role) {
  const normalized = String(role || "").toLowerCase();
  if (normalized === "superadmin") return localStorage.getItem("superAdminToken");
  if (normalized === "admin") return localStorage.getItem("adminToken");
  return localStorage.getItem("memberToken");
}

function normalizeMembers(items) {
  return (items || []).map((member) => ({
    ...member,
    fullName: member.fullName || member.name || "User",
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
    lastMessageText:
      conversation.lastMessageText ||
      conversation.lastMessage?.message ||
      conversation.lastMessage?.text ||
      "",
  };
}

function normalizeConversations(items, currentUserId) {
  return (items || [])
    .map((conversation) => normalizeConversation(conversation, currentUserId))
    .filter(Boolean)
    .sort((a, b) => new Date(b.lastMessageTime || b.updatedAt || b.createdAt) - new Date(a.lastMessageTime || a.updatedAt || a.createdAt));
}

export default MessageCenterPage;
