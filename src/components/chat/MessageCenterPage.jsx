import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, RefreshCw, Search, MessageSquare, ShieldCheck } from "lucide-react";
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
  const [call, setCall] = useState(null);
  const [query, setQuery] = useState("");
  const actorId = String(currentUser?.chatId || currentUser?._id || "");
  const loadContactsRef = useRef(loadContacts);
  const selectedConversationRef = useRef(null);

  useEffect(() => {
    loadContactsRef.current = loadContacts;
  }, [loadContacts]);

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

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
      setBanner("Chat connection failed. Calls require the Socket.IO server to be reachable.");
    });

    const handleIncomingCall = (payload) => {
      if (!payload?.offer || !payload?.from) return;
      setCall((current) => current || {
        direction: "incoming",
        incomingCall: payload,
        callType: payload.callType === "video" ? "video" : "audio",
        partner:
          normalizedPeople.find((person) => String(person._id) === String(payload.callerUserId)) ||
          selectedConversationRef.current?.partner ||
          {
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
      const peopleList = Array.isArray(result?.members)
        ? result.members
        : Array.isArray(result?.data?.members)
          ? result.data.members
          : [];
      const conversationList = Array.isArray(result?.conversations)
        ? result.conversations
        : Array.isArray(result?.data?.conversations)
          ? result.data.conversations
          : [];
      setPeople(peopleList.filter((person) => String(person?.role || "").toLowerCase() !== "superadmin"));
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

  const chatOptions = useMemo(() => {
    const byId = new Map();
    normalizedConversations.forEach((conversation) => {
      const partner = conversation.partner;
      if (partner?._id) {
        byId.set(String(partner._id), {
          ...partner,
          conversationId: conversation._id,
          lastMessageText: conversation.lastMessageText || "",
          lastMessageTime: conversation.lastMessageTime || conversation.updatedAt || conversation.createdAt,
          roleLabel: partner.roleLabel || (String(partner.role) === "admin" ? "Leader" : "Member"),
        });
      }
    });

    normalizedPeople.forEach((person) => {
      if (!byId.has(String(person._id))) {
        byId.set(String(person._id), person);
      }
    });

    return Array.from(byId.values()).sort((a, b) => {
      const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      if (aTime !== bTime) return bTime - aTime;
      return String(a.fullName || "").localeCompare(String(b.fullName || ""));
    });
  }, [normalizedConversations, normalizedPeople]);

  useEffect(() => {
    if (!selectedConversation && normalizedConversations.length > 0) {
      setSelectedConversation(normalizedConversations[0]);
    }
  }, [normalizedConversations, selectedConversation]);

  const filteredContacts = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return chatOptions;
    return chatOptions.filter((person) => {
      const haystack = [person.fullName, person.memberNumber, person.email, person.phone, person.roleLabel]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [chatOptions, query]);

  const startConversation = async (person) => {
    try {
      if (!person?._id) return;
      if (String(person._id) === String(actorId)) {
        setBanner("You cannot chat with yourself.");
        return;
      }
      if (String(person?.role || "").toLowerCase() === "superadmin") {
        setBanner("SuperAdmin chat is disabled.");
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
        return;
      }

      if (person.conversationId) {
        const response = await API.get(`/conversations/${person.conversationId}`);
        const conversation = normalizeConversation(response.data?.conversation || response.data, actorId);
        if (conversation) {
          setConversations((previous) => [conversation, ...previous.filter((item) => String(item._id) !== String(conversation._id))]);
          setSelectedConversation(conversation);
          return;
        }
      }

      const response = await API.post("/conversations", { participantId: person._id });
      const conversation = normalizeConversation(response.data?.conversation || response.data, actorId);

      if (conversation) {
        setConversations((previous) => [conversation, ...previous.filter((item) => String(item._id) !== String(conversation._id))]);
        setSelectedConversation(conversation);
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

  const startCall = (type) => {
    if (!socket?.connected) {
      setBanner("Call cannot start because the chat server is offline.");
      return;
    }
    if (!selectedConversation?.partner?._id) {
      setBanner("Select a contact before starting a call.");
      return;
    }
    setCall({
      direction: "outgoing",
      callType: type,
      partner: selectedConversation.partner,
      incomingCall: null,
    });
  };

  const selectFromDropdown = (value) => {
    const person = chatOptions.find((x) => String(x._id) === String(value));
    if (person) startConversation(person);
  };

  const selectedLabel = selectedConversation?.partner?.fullName || selectedConversation?.title || "Choose a person";

  return (
    <DashboardLayout>
      <div className="message-center instagram-message-center">
        <section className="message-center-hero instagram-message-hero">
          <div className="message-center-hero-copy instagram-message-copy">
            <span className="message-center-kicker">{eyebrow}</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>

          <div className="message-center-quickbar">
            <div className="message-center-chat-picker compact-picker">
              <label htmlFor="chat-person-picker">{memberSectionLabel || "Choose who to chat with"}</label>
              <div className="message-center-chat-picker-row">
                <div className="message-select-wrap">
                  <select
                    id="chat-person-picker"
                    value={selectedConversation?.partner?._id || ""}
                    onChange={(e) => selectFromDropdown(e.target.value)}
                  >
                    <option value="">Select a contact</option>
                    {chatOptions.map((person) => (
                      <option key={person._id} value={person._id}>
                        {person.fullName}{person.roleLabel ? ` • ${person.roleLabel}` : ""}{person.online ? " • Online" : ""}
                      </option>
                    ))}
                  </select>
                  <MessageSquare size={18} className="message-select-icon" />
                </div>

                <button type="button" className="portal-chip-action" onClick={refreshChat}>
                  <RefreshCw size={16} />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </section>

        {banner && <div className="messages-call-banner">{banner}</div>}

        <div className="messages-page message-center-shell instagram-shell">
          <aside className="messages-sidebar-container messages-contacts-panel">
            <div className="messages-contacts-head">
              <div>
                <span className="contacts-kicker">Active chats</span>
                <h2>{selectedLabel}</h2>
              </div>
              <button type="button" className="contacts-refresh" onClick={refreshChat} aria-label="Refresh chats">
                <RefreshCw size={17} />
              </button>
            </div>

            <div className="messages-search-box">
              <Search size={17} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder || "Search chats..."}
                aria-label="Search chats"
              />
            </div>

            <div className="messages-contacts-list">
              {loadingSidebar ? (
                <div className="portal-empty">Loading chats...</div>
              ) : filteredContacts.length > 0 ? (
                filteredContacts.map((person) => {
                  const active = String(selectedConversation?.partner?._id || selectedConversation?.partner?._id || "") === String(person._id);
                  return (
                    <button
                      key={person._id}
                      type="button"
                      className={`chat-contact-item ${active ? "active" : ""}`}
                      onClick={() => startConversation(person)}
                    >
                      <div className="chat-contact-avatar">
                        {person.profileImage ? (
                          <img src={person.profileImage} alt={person.fullName || "Contact"} />
                        ) : (
                          <span>{(person.fullName || "U").charAt(0)}</span>
                        )}
                        {person.online && <span className="online-dot" />}
                      </div>

                      <div className="chat-contact-copy">
                        <div className="chat-contact-topline">
                          <strong>{person.fullName || "Contact"}</strong>
                          <small>{person.online ? "Online" : person.lastMessageTime ? timeAgo(person.lastMessageTime) : ""}</small>
                        </div>
                        <p>
                          {person.lastMessageText || person.roleLabel || emptyConversationsLabel || "Tap to open chat"}
                        </p>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="portal-empty">{emptyMembersLabel || "No contacts available."}</div>
              )}
            </div>
          </aside>

          <section className="messages-chat-container full-width-chat">
            <div className="messages-top-mobile-actions compact-top-actions">
              <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                <ArrowLeft size={18} />
                Chats
              </button>
            </div>

            <ChatWindow
              conversation={selectedConversation}
              socket={socket}
              currentUser={currentUser}
              onBack={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              onAudioCall={() => startCall("audio")}
              onVideoCall={() => startCall("video")}
            />
          </section>
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
    const id = String(member?._id || "").trim();
    if (!id || id === String(actorId)) return;

    const role = String(member?.role || "").toLowerCase();
    if (role === "superadmin") return;

    const roleLabel = role === "admin" ? "Leader" : "Member";
    const email = String(member?.email || "").trim().toLowerCase();
    const phone = String(member?.phone || "").trim();
    const memberNumber = String(member?.memberNumber || "").trim();
    const dedupeKey = [role, email || phone || memberNumber || id].filter(Boolean).join("|");

    if (unique.has(dedupeKey)) return;

    unique.set(dedupeKey, {
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
    .filter((conversation) => {
      if (!conversation) return false;
      const partnerRole = String(conversation.partner?.role || "").toLowerCase();
      return partnerRole !== "superadmin";
    })
    .sort((a, b) => new Date(b.lastMessageTime || b.updatedAt || b.createdAt) - new Date(a.lastMessageTime || a.updatedAt || a.createdAt));
}

function timeAgo(dateValue) {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  if (hrs < 24) return `${hrs}h`;
  return `${days}d`;
}

export default MessageCenterPage;
