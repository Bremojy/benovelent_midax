import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { io } from "socket.io-client";
import DashboardLayout from "../../layouts/DashboardLayout";
import ChatSidebar from "./ChatSidebar";
import ChatWindow from "./ChatWindow";
import CallOverlay from "./CallOverlay";
import API from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import "../../pages/member/messages.css";

function MessageCenterPage({ title, eyebrow, description, searchPlaceholder, memberSectionLabel, emptyMembersLabel, emptyConversationsLabel, loadContacts, onRefreshHint }) {
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
  const [search, setSearch] = useState("");
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 900 : false));
  const loadContactsRef = useRef(loadContacts);
  const peopleRef = useRef([]);
  const selectedConversationRef = useRef(null);
  const actorId = String(currentUser?.chatId || currentUser?._id || "");

  useEffect(() => { loadContactsRef.current = loadContacts; }, [loadContacts]);
  useEffect(() => { const onResize = () => setIsMobile(window.innerWidth < 900); onResize(); window.addEventListener("resize", onResize); return () => window.removeEventListener("resize", onResize); }, []);

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
    return () => { active = false; };
  }, [authUser]);

  useEffect(() => {
    if (!actorId) return;
    const token = getToken(currentUser?.role);
    const newSocket = io(import.meta.env.VITE_API_URL || "https://benovelent-midax.onrender.com", { transports: ["websocket", "polling"], auth: { token }, query: { token } });
    newSocket.on("connect", () => { newSocket.emit("user-online", actorId); });
    newSocket.on("connect_error", (error) => { console.error("Chat socket connection error:", error); setBanner("Chat connection failed. Calls require the live Socket.IO server to be reachable."); });
    const handleIncomingCall = (payload) => {
      if (!payload?.offer || !payload?.from) return;
      const currentPeople = peopleRef.current || [];
      const currentConversation = selectedConversationRef.current;
      setCall({ direction: "incoming", incomingCall: payload, callType: payload.callType === "video" ? "video" : "audio", partner: currentPeople.find((person) => String(person._id) === String(payload.callerUserId)) || currentConversation?.partner || { _id: payload.callerUserId, fullName: payload.callerName || "Member" } });
    };
    newSocket.on("incoming-call", handleIncomingCall);
    setSocket(newSocket);
    return () => { newSocket.off("incoming-call", handleIncomingCall); newSocket.disconnect(); setSocket(null); };
  }, [actorId, currentUser?.role]);

  const loadChatData = async () => {
    try {
      setLoadingSidebar(true);
      const result = await loadContactsRef.current({ currentUser });
      const peopleList = Array.isArray(result?.members) ? result.members : Array.isArray(result?.data?.members) ? result.data.members : [];
      const conversationList = Array.isArray(result?.conversations) ? result.conversations : Array.isArray(result?.data?.conversations) ? result.data.conversations : [];
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

  useEffect(() => { if (!actorId) return; loadChatData(); }, [actorId, currentUser?._id]);

  const normalizedConversations = useMemo(() => normalizeConversations(conversations, actorId), [conversations, actorId]);
  const normalizedPeople = useMemo(() => normalizeMembers(people, actorId), [people, actorId]);

  useEffect(() => {
    peopleRef.current = normalizedPeople;
    selectedConversationRef.current = selectedConversation;
  }, [normalizedPeople, selectedConversation]);

  useEffect(() => { if (!isMobile && !selectedConversation && normalizedConversations.length > 0) setSelectedConversation(normalizedConversations[0]); }, [normalizedConversations, selectedConversation, isMobile]);

  const selectConversation = (conversation) => { if (!conversation?._id) return; setSelectedConversation(conversation); setMobileChatOpen(true); };

  const startConversation = async (person) => {
    try {
      if (!person?._id) return;
      if (String(person._id) === String(actorId)) { setBanner("You cannot chat with yourself."); return; }
      if (String(person?.role || "").toLowerCase() === "superadmin") { setBanner("No one can communicate with SuperAdmin."); return; }
      const existingConversation = normalizedConversations.find((conversation) => String(conversation.partner?._id) === String(person._id)) || normalizedConversations.find((conversation) => (conversation.participants || []).some((participant) => String(participant?._id || participant) === String(person._id)));
      if (existingConversation) { setSelectedConversation(existingConversation); setMobileChatOpen(true); return; }
      if (person.conversationId) {
        const response = await API.get(`/conversations/${person.conversationId}`);
        const conversation = normalizeConversation(response.data?.conversation || response.data, actorId);
        if (conversation) { setConversations((previous) => [conversation, ...previous.filter((item) => String(item._id) !== String(conversation._id))]); setSelectedConversation(conversation); setMobileChatOpen(true); return; }
      }
      const response = await API.post("/conversations", { participantId: person._id });
      const conversation = normalizeConversation(response.data?.conversation || response.data, actorId);
      if (conversation) { setConversations((previous) => [conversation, ...previous.filter((item) => String(item._id) !== String(conversation._id))]); setSelectedConversation(conversation); setMobileChatOpen(true); }
    } catch (error) {
      setBanner(error.response?.data?.message || error.message || "Unable to start conversation.");
    }
  };

  const refreshChat = async () => { try { setBanner(onRefreshHint || "Messages refreshed."); await loadChatData(); } catch (error) { console.error("Refresh chat error:", error); setBanner(error?.message || "Unable to refresh conversations."); } };
  const mobileBack = () => setMobileChatOpen(false);
  const startCall = (type) => {
    if (!socket?.connected) { setBanner("Call cannot start because the chat server is offline."); return; }
    if (!selectedConversation?.partner?._id) { setBanner("Select a member before starting a call."); return; }
    setCall({ direction: "outgoing", callType: type, partner: selectedConversation.partner, incomingCall: null });
  };
  const showChooserOnMobile = isMobile && !mobileChatOpen;

  return (
    <DashboardLayout>
      <div className="message-center compact-message-center">
        <section className="message-center-hero compact-message-center-hero">
          <div className="message-center-hero-copy">
            <span className="message-center-kicker">{eyebrow}</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          <div className="message-center-hero-actions">
            <button type="button" className="portal-chip-action ghost" onClick={refreshChat}><RefreshCw size={16} />Refresh</button>
          </div>
        </section>

        {banner && <div className="messages-call-banner">{banner}</div>}

        <div className="message-center-shell">
          <aside className="messages-sidebar-container desktop-chat-sidebar">
            <ChatSidebar title="Chats" searchPlaceholder={searchPlaceholder} members={normalizedPeople} conversations={normalizedConversations} selectedConversationId={selectedConversation?._id} onSelectConversation={selectConversation} onStartConversation={startConversation} search={search} setSearch={setSearch} loading={loadingSidebar} emptyConversationsLabel={emptyConversationsLabel} emptyMembersLabel={emptyMembersLabel} memberSectionLabel={memberSectionLabel} conversationSectionLabel="Recent chats" />
          </aside>

          <div className="messages-chat-container full-width-chat">
            <div className="messages-top-mobile-actions compact-top-actions">
              <button type="button" onClick={mobileBack} disabled={!mobileChatOpen}><ArrowLeft size={18} />Back</button>
              <button type="button" className="portal-chip-action ghost" onClick={refreshChat}><RefreshCw size={16} />Refresh</button>
            </div>

            <div className={`mobile-chat-chooser ${showChooserOnMobile ? "show" : "hide"}`}>
              <div className="mobile-chat-chooser-head">
                <label htmlFor="chat-person-picker">Choose a chat</label>
                <p>Pick a conversation or member from the list below.</p>
              </div>
              <div className="message-center-chat-picker compact-picker">
                <select id="chat-person-picker" value={selectedConversation?.partner?._id || ""} onChange={(e) => { const conversation = normalizedConversations.find((item) => String(item.partner?._id) === String(e.target.value)); const person = normalizedPeople.find((x) => String(x._id) === String(e.target.value)); if (conversation) selectConversation(conversation); else if (person) startConversation(person); }}>
                  <option value="">Select from dropdown</option>
                  {normalizedConversations.map((conversation) => (<option key={conversation._id} value={conversation.partner?._id || conversation._id}>{formatDisplayName(conversation.partner)}{conversation.lastMessageText ? ` • ${truncateText(conversation.lastMessageText, 42)}` : ""}</option>))}
                  {normalizedPeople.filter((person) => !normalizedConversations.some((conversation) => String(conversation.partner?._id) === String(person._id))).map((person) => (<option key={person._id} value={person._id}>{formatDisplayName(person)}{person.roleLabel ? ` • ${person.roleLabel}` : ""}{person.online ? " • Online" : ""}</option>))}
                </select>
              </div>
              <div className="mobile-chat-list">
                {loadingSidebar ? <div className="chat-loading">Loading chats...</div> : normalizedConversations.length > 0 ? normalizedConversations.map((conversation) => (<button key={conversation._id} type="button" className="mobile-chat-row" onClick={() => selectConversation(conversation)}><span className="mobile-chat-row-avatar"><img src={conversation.partner?.profileImage || "/default-avatar.svg"} alt="" /></span><span className="mobile-chat-row-body"><strong>{formatDisplayName(conversation.partner)}</strong><small>{conversation.lastMessageText || "Tap to open chat"}</small></span></button>)) : <div className="chat-empty">{emptyConversationsLabel}</div>}
              </div>
            </div>

            <div className={`messages-page message-center-shell-inner ${showChooserOnMobile ? "chooser-mode" : "chat-mode"}`}>
              {(!isMobile || mobileChatOpen) && (<ChatWindow conversation={selectedConversation} socket={socket} currentUser={currentUser} onBack={mobileBack} onAudioCall={() => startCall("audio")} onVideoCall={() => startCall("video")} />)}
              {isMobile && !mobileChatOpen && <div className="chat-window-empty choose-chat-empty">Select a chat above to open the conversation.</div>}
            </div>
          </div>
        </div>
      </div>

      {call && (<CallOverlay socket={socket} currentUser={currentUser} partner={call.partner} callType={call.callType} incomingCall={call.incomingCall} onClose={() => setCall(null)} />)}
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

    const displayName = safeDisplayName(member?.fullName || member?.name || member?.username, member);
    unique.set(dedupeKey, { ...member, _id: id, role, roleLabel, fullName: displayName, online: Boolean(member.online) });
  });
  return Array.from(unique.values()).sort((a, b) => { const order = { superadmin: 0, admin: 1, member: 2 }; const aRank = order[String(a.role || "member").toLowerCase()] ?? 3; const bRank = order[String(b.role || "member").toLowerCase()] ?? 3; return aRank - bRank || String(a.fullName || "").localeCompare(String(b.fullName || "")); });
}

function normalizeConversation(conversation, currentUserId) {
  if (!conversation) return null;
  const participants = Array.isArray(conversation.participants) ? conversation.participants : [];
  const partner = conversation.partner || participants.find((member) => String(member?._id || member) !== String(currentUserId)) || null;
  const safePartner = partner ? { ...partner, fullName: safeDisplayName(partner.fullName || partner.name || partner.username, partner) } : null;
  return { ...conversation, partner: safePartner, lastMessageText: conversation.lastMessageText || conversation.lastMessage?.message || conversation.lastMessage?.text || "" };
}

function normalizeConversations(items, currentUserId) {
  return (items || []).map((conversation) => normalizeConversation(conversation, currentUserId)).filter((conversation) => { if (!conversation) return false; return String(conversation.partner?.role || "").toLowerCase() !== "superadmin"; }).sort((a, b) => new Date(b.lastMessageTime || b.updatedAt || b.createdAt) - new Date(a.lastMessageTime || a.updatedAt || a.createdAt));
}

function safeDisplayName(value, fallbackSource = {}) {
  const raw = String(value || "").trim();
  const fallback = String(fallbackSource?.username || fallbackSource?.email || fallbackSource?.memberNumber || fallbackSource?.roleLabel || "Member").trim();
  if (!raw) return fallback || "Member";
  const looksLikeUrl = /^https?:\/\//i.test(raw) || raw.includes("cloudinary.com") || raw.includes("/");
  if (looksLikeUrl) return fallback || "Member";
  if (raw.length > 34 && /https?:|www\.|cloudinary|\/{1,}/i.test(raw)) return fallback || "Member";
  return raw;
}

function formatDisplayName(person) {
  return safeDisplayName(person?.fullName || person?.name || person?.username, person);
}

function truncateText(text, max = 42) {
  const value = String(text || "").trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

export default MessageCenterPage;
