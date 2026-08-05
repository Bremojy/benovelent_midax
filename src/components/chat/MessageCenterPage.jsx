import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, RefreshCw, ShieldCheck } from "lucide-react";
import { io } from "socket.io-client";
import DashboardLayout from "../../layouts/DashboardLayout";
import ChatWindow from "./ChatWindow";
import CallOverlay from "./CallOverlay";
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
  const [loadingSidebar, setLoadingSidebar] = useState(true);
  const [banner, setBanner] = useState("");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [call, setCall] = useState(null);
  const actorId = String(currentUser?.chatId || currentUser?._id || "");
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
    if (!actorId) return;

    const token = getToken(currentUser?.role);
    const newSocket = io(import.meta.env.VITE_API_URL || "https://benovelent-midax.onrender.com", {
      transports: ["websocket", "polling"],
      auth: { token },
      query: { token },
    });

    newSocket.on("connect", () => {
      newSocket.emit("user-online", actorId);
    });

    newSocket.on("connect_error", (error) => {
      console.error("Chat socket connection error:", error);
      setBanner("Chat connection failed. Calls require the live Socket.IO server to be reachable.");
    });

    const handleIncomingCall = (payload) => {
      if (!payload?.offer || !payload?.from) return;
      if (call) return;
      setCall({
        direction: "incoming",
        incomingCall: payload,
        callType: payload.callType === "video" ? "video" : "audio",
        partner: normalizedPeople.find((person) => String(person._id) === String(payload.callerUserId)) || selectedConversation?.partner || {
          _id: payload.callerUserId,
          fullName: payload.callerName || "Member",
        },
      });
    };

    newSocket.on("incoming-call", handleIncomingCall);
    setSocket(newSocket);

    return () => {
      newSocket.off("incoming-call", handleIncomingCall);
      newSocket.disconnect();
      setSocket(null);
    };
  }, [actorId, currentUser?.role]);

  const loadChatData = async () => {
    try {
      setLoadingSidebar(true);
      const result = await loadContactsRef.current({ currentUser });
      const peopleList = Array.isArray(result?.members) ? result.members : Array.isArray(result?.data?.members) ? result.data.members : [];
      const conversationList = Array.isArray(result?.conversations) ? result.conversations : Array.isArray(result?.data?.conversations) ? result.data.conversations : [];
      setPeople(peopleList);
      setConversations(conversationList);
    } catch (error) {
      console.error("Load chat data error:", error);
      setPeople([]);
      setConversations([]);
    } finally {
      setLoadingSidebar(false);
    }
  };

  useEffect(() => {
    if (!actorId) return;
    loadChatData();
  }, [actorId, currentUser?._id]);

  const normalizedConversations = useMemo(
    () => normalizeConversations(conversations, actorId),
    [conversations, actorId]
  );

  const normalizedPeople = useMemo(
    () => normalizeMembers(people, actorId),
    [people, actorId]
  );

  useEffect(() => {
    if (!selectedConversation && normalizedConversations.length > 0) {
      setSelectedConversation(normalizedConversations[0]);
      setMobileChatOpen(true);
    }
  }, [normalizedConversations, selectedConversation]);

  const startConversation = async (person) => {
    try {
      if (!person?._id) return;
      if (String(person._id) === String(actorId)) {
        setBanner("You cannot chat with yourself.");
        return;
      }
      
      const existingConversation =
        normalizedConversations.find(
          (conversation) => String(conversation.partner?._id) === String(person._id)
        ) ||
        normalizedConversations.find((conversation) =>
          (conversation.participants || []).some((participant) => String(participant?._id || participant) === String(person._id))
        );

      if (existingConversation) {
        setSelectedConversation(existingConversation);
        setMobileChatOpen(true);
        return;
      }

      if (person.conversationId) {
        const response = await API.get(`/conversations/${person.conversationId}`);
        const conversation = normalizeConversation(response.data?.conversation || response.data, actorId);
        if (conversation) {
          setConversations((previous) => [conversation, ...previous.filter((item) => String(item._id) !== String(conversation._id))]);
          setSelectedConversation(conversation);
          setMobileChatOpen(true);
          return;
        }
      }

      const response = await API.post("/conversations", { participantId: person._id });
      const conversation = normalizeConversation(response.data?.conversation || response.data, actorId);

      if (conversation) {
        setConversations((previous) => [conversation, ...previous.filter((item) => String(item._id) !== String(conversation._id))]);
        setSelectedConversation(conversation);
        setMobileChatOpen(true);
      }
    } catch (error) {
      setBanner(error.response?.data?.message || error.message || "Unable to start conversation.");
    }
  };

  const refreshChat = async () => {
    try {
      setBanner(onRefreshHint || "Messages refreshed.");
      await loadChatData();
    } catch (error) {
      console.error("Refresh chat error:", error);
      setBanner(error?.message || "Unable to refresh conversations.");
    }
  };

  const mobileBack = () => setMobileChatOpen(false);

  const startCall = (type) => {
    if (!socket?.connected) {
      setBanner("Call cannot start because the chat server is offline.");
      return;
    }
    if (!selectedConversation?.partner?._id) {
      setBanner("Select a member before starting a call.");
      return;
    }
    setCall({
      direction: "outgoing",
      callType: type,
      partner: selectedConversation.partner,
      incomingCall: null,
    });
  };

  return (
    <DashboardLayout>
      <div className="message-center compact-message-center">
        <section className="message-center-hero compact-message-center-hero">
          <div className="message-center-hero-copy">
            <span className="message-center-kicker">{eyebrow}</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>

          <div className="message-center-chat-picker compact-picker">
            <label htmlFor="chat-person-picker">Choose a person to chat with</label>
            <div className="message-center-chat-picker-row">
              <select
                id="chat-person-picker"
                value={selectedConversation?.partner?._id || ""}
                onChange={(e) => {
                  const person = normalizedPeople.find((x) => String(x._id) === String(e.target.value));
                  if (person) startConversation(person);
                }}
              >
                <option value="">{searchPlaceholder || "Select from dropdown"}</option>
                {normalizedPeople.map((person) => (
                  <option key={person._id} value={person._id}>
                    {person.fullName}{person.roleLabel ? ` • ${person.roleLabel}` : ""}{person.online ? " • Online" : ""}
                  </option>
                ))}
              </select>

              <button type="button" className="portal-chip-action" onClick={refreshChat}>
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>
          </div>
        </section>

        {banner && <div className="messages-call-banner">{banner}</div>}

        <div className={`messages-page message-center-shell ${mobileChatOpen ? "mobile-chat-open" : ""}`}>
          <div className="messages-chat-container full-width-chat">
            <div className="messages-top-mobile-actions compact-top-actions">
              <button type="button" onClick={mobileBack}>
                <ArrowLeft size={18} />
                Back
              </button>
            </div>

            <ChatWindow
              conversation={selectedConversation}
              socket={socket}
              currentUser={currentUser}
              onBack={mobileBack}
              onAudioCall={() => startCall("audio")}
              onVideoCall={() => startCall("video")}
            />
          </div>
        </div>
      </div>

      {call && (
        <CallOverlay
          socket={socket}
          currentUser={currentUser}
          partner={call.partner}
          callType={call.callType}
          incomingCall={call.incomingCall}
          onClose={() => setCall(null)}
        />
      )}
    </DashboardLayout>
  );
}

function getToken(role) {
  const normalized = String(role || "").toLowerCase();
  if (normalized === "superadmin") return localStorage.getItem("superAdminToken");
  if (normalized === "admin") return localStorage.getItem("adminToken");
  return localStorage.getItem("memberToken");
}

function normalizeMembers(items, actorId) {
  const unique = new Map();
  (items || []).forEach((member) => {
    const id = String(member?._id || "");
    if (!id || id === String(actorId)) return;

    const role = String(member?.role || "").toLowerCase();
    const roleLabel =
      role === "superadmin" ? "SuperAdmin" :
      role === "admin" ? "Leader" :
      "Member";

    unique.set(id, {
      ...member,
      _id: id,
      role,
      roleLabel,
      fullName: member.fullName || member.name || "User",
      online: Boolean(member.online),
    });
  });

  return Array.from(unique.values()).sort((a, b) => {
    const order = { superadmin: 0, admin: 1, member: 2 };
    const aRank = order[String(a.role || "member").toLowerCase()] ?? 3;
    const bRank = order[String(b.role || "member").toLowerCase()] ?? 3;
    if (aRank !== bRank) return aRank - bRank;
    return String(a.fullName || "").localeCompare(String(b.fullName || ""));
  });
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
