import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ArrowLeft, RefreshCw, SlidersHorizontal, X } from "lucide-react";
import socketClient from "../../sockets/socket";
import DashboardLayout from "../../layouts/DashboardLayout";
import ChatSidebar from "./ChatSidebar";
import ChatWindow from "./ChatWindow";
import CallOverlay from "./CallOverlay";
import API from "../../services/api";
import toast from "react-hot-toast";
import { getPendingCall, removePendingCall } from "../../utils/pushCallStore";
import { startNativeIncomingCall } from "../../utils/nativeCallBridge";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
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
  initialConversationId = "",
  showMemberFilters = false,
}) {
  const { user: authUser } = useAuth();
  const contextSocket = useSocket();
  const location = useLocation();

  const [currentUser, setCurrentUser] = useState(authUser || null);
  const [socket, setSocket] = useState(contextSocket || socketClient);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [people, setPeople] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loadingSidebar, setLoadingSidebar] = useState(true);
  const [banner, setBanner] = useState("");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [call, setCall] = useState(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ siteStation: "all", department: "all", position: "all", status: "all", online: "all" });
  const [filterOptions, setFilterOptions] = useState({ siteStation: [], department: [], position: [], status: [], verified: [] });
  const [filtersOpen, setFiltersOpen] = useState(Boolean(showMemberFilters));
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 900 : false));

  const loadContactsRef = useRef(loadContacts);
  const peopleRef = useRef([]);
  const selectedConversationRef = useRef(null);
  const initialSelectionAppliedRef = useRef(false);

  const actor = useMemo(() => buildActorProfile(currentUser || authUser), [currentUser, authUser]);
  const actorId = actor.id;
  const showChooserOnMobile = isMobile && !mobileChatOpen;
  const hidePageIntroOnMobile = isMobile && mobileChatOpen;
  const isFullscreenChat = isMobile && mobileChatOpen && Boolean(selectedConversation);

  useEffect(() => {
    loadContactsRef.current = loadContacts;
  }, [loadContacts]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!isMobile && mobileChatOpen) {
      setMobileChatOpen(false);
    }
  }, [isMobile, mobileChatOpen]);

  useEffect(() => {
    if (!isFullscreenChat) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFullscreenChat]);

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
    if (!actorId) return undefined;

    const activeSocket = contextSocket || socketClient;
    const handleConnectError = (error) => {
      console.warn("Chat socket connection error:", error?.message || error);
      setBanner("Chat is reconnecting. Messaging stays available; calls will work once the secure call connection is ready.");
    };

    const handleConnect = () => {
      activeSocket.emit("user-online", {
        userId: actorId,
        role: currentUser?.role || authUser?.role || "member",
      });
      activeSocket.emit("presence-heartbeat");
      setBanner((current) =>
        current === "Chat is reconnecting. Messaging stays available; calls will work once the secure call connection is ready."
          ? ""
          : current
      );
    };

    const handleCallNotification = (payload) => {
      const title = payload?.title || "Incoming call";
      const body = payload?.message || "Someone is calling you.";
      toast(`${title}: ${body}`, { icon: "📞", duration: 5500, id: "incoming-call-notice" });
      if (typeof document !== "undefined" && document.visibilityState !== "visible" && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try { new Notification(title, { body, tag: `call-${payload?.callerUserId || Date.now()}` }); } catch {}
      }
    };

    const handlePresence = (payload) => {
      const onlineIds = new Set((payload?.users || []).map((item) => String(item.userId)));
      setPeople((prev) => prev.map((person) => ({ ...person, online: onlineIds.has(String(person._id)) })));
      setConversations((prev) => prev.map((conversation) => ({ ...conversation, partner: conversation.partner ? { ...conversation.partner, online: onlineIds.has(String(conversation.partner._id)) } : conversation.partner })));
    };

    const handleSidebarMessage = (incoming) => {
      const conversationId = String(incoming?.conversation?._id || incoming?.conversation || incoming?.conversationId || "");
      if (!conversationId) return;
      const senderId = String(incoming?.sender?._id || incoming?.sender || incoming?.senderId || "");
      if (senderId && senderId === String(actorId)) return;

      setConversations((previous) => {
        let touched = false;
        const updated = previous.map((conversation) => {
          if (String(conversation?._id) !== conversationId) return conversation;
          touched = true;
          const isOpen = String(selectedConversationRef.current?._id || "") === conversationId;
          const preview = sanitizePreviewText(incoming?.message || incoming?.text || incoming?.attachment || "New message");
          return {
            ...conversation,
            lastMessageText: preview || "New message",
            lastMessageTime: incoming?.createdAt || new Date().toISOString(),
            updatedAt: incoming?.createdAt || new Date().toISOString(),
            unreadCount: isOpen ? 0 : Number(conversation?.unreadCount || 0) + 1,
          };
        });
        return touched ? updated.sort((a, b) => new Date(b.lastMessageTime || b.updatedAt || 0) - new Date(a.lastMessageTime || a.updatedAt || 0)) : previous;
      });
    };

    const handleIncomingCall = (payload) => {
      if (!payload?.offer || !payload?.from) return;
      startNativeIncomingCall({
        callerName: payload.callerName || "Member",
        callType: payload.callType === "video" ? "video" : "audio",
        callId: payload.callId || "",
        callerUserId: payload.callerUserId || "",
        role: currentUser?.role || authUser?.role || "member",
      });
      const currentPeople = peopleRef.current || [];
      const currentConversation = selectedConversationRef.current;
      setCall({
        direction: "incoming",
        incomingCall: payload,
        callType: payload.callType === "video" ? "video" : "audio",
        partner:
          currentPeople.find((person) => String(person._id) === String(payload.callerUserId)) ||
          currentConversation?.partner ||
          { _id: payload.callerUserId, fullName: payload.callerName || "Member" },
      });
    };

    const handleMissedCall = (payload) => {
      const title = payload?.callType === "video" ? "Missed video call" : "Missed audio call";
      const body = `${payload?.callerName || "A member"} tried to call you.`;
      toast(`${title}: ${body}`, { icon: "☎️", duration: 5000, id: `missed-call-${payload?.callId || "latest"}` });
      if (typeof document !== "undefined" && document.visibilityState !== "visible" && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try { new Notification(title, { body, tag: `missed-call-${payload?.callId || Date.now()}` }); } catch {}
      }
    };

    const handleCallError = (payload) => {
      const code = String(payload?.code || payload?.error || "");
      const message = code === "SELF_CALL_BLOCKED"
        ? "You cannot call yourself. Choose another member."
        : payload?.message || "The call could not be started.";
      toast.error(message, { id: "call-error", duration: 5000 });
      setCall(null);
    };

    activeSocket.on("connect", handleConnect);
    activeSocket.on("connect_error", handleConnectError);
    activeSocket.on("new-message", handleSidebarMessage);
    activeSocket.on("incoming-call", handleIncomingCall);
    activeSocket.on("new-call-notification", handleCallNotification);
    activeSocket.on("missed-call", handleMissedCall);
    activeSocket.on("call-error", handleCallError);
    activeSocket.on("online-users", handlePresence);
    activeSocket.on("presence-required", handleConnect);
    setSocket(activeSocket);

    if (!activeSocket.connected) activeSocket.connect();
    else handleConnect();

    return () => {
      activeSocket.off("connect", handleConnect);
      activeSocket.off("connect_error", handleConnectError);
      activeSocket.off("new-message", handleSidebarMessage);
      activeSocket.off("incoming-call", handleIncomingCall);
      activeSocket.off("new-call-notification", handleCallNotification);
      activeSocket.off("missed-call", handleMissedCall);
      activeSocket.off("call-error", handleCallError);
      activeSocket.off("online-users", handlePresence);
      activeSocket.off("presence-required", handleConnect);
    };
  }, [actorId, currentUser?.role, authUser?.role, contextSocket]);

  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const callId = params.get("incomingPushCall") || params.get("incomingNativeCall");
    if (!callId) return undefined;

    let active = true;
    (async () => {
      const pending = await getPendingCall(callId);
      if (!active || !pending?.data) return;
      const action = String(params.get("callAction") || "open").toLowerCase();
      const payload = pending.data;
      const activeSocket = socket || contextSocket || socketClient;

      if (action === "decline") {
        if (!activeSocket.connected) activeSocket.connect?.();
        if (payload.from) activeSocket.emit("call-rejected", { to: payload.from, callId });
        await removePendingCall(callId);
        window.history.replaceState({}, "", location.pathname);
        return;
      }

      setCall({
        direction: "incoming",
        incomingCall: payload,
        autoAccept: action === "answer",
        callType: payload.callType === "video" ? "video" : "audio",
        conversationId: payload.conversationId || "",
        partner: {
          _id: payload.callerUserId,
          fullName: payload.callerName || "Member",
          profileImage: payload.callerProfileImage || payload.profileImage || "",
        },
      });
      await removePendingCall(callId);
      window.history.replaceState({}, "", location.pathname);
    })().catch((error) => {
      console.warn("Incoming push call handling failed:", error);
    });

    return () => { active = false; };
  }, [location.pathname, location.search, socket, contextSocket]);

  const loadChatData = async () => {
    try {
      setLoadingSidebar(true);
      const result = await loadContactsRef.current({ currentUser: currentUser || authUser, filters });
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

      setPeople(peopleList);
      setConversations(conversationList);
      if (result?.filterOptions) setFilterOptions(result.filterOptions);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actorId, currentUser?._id, authUser?._id, filters.siteStation, filters.department, filters.position, filters.status, filters.online, filters.verified]);

  const normalizedPeople = useMemo(() => normalizeMembers(people, actor), [people, actor]);
  const normalizedConversations = useMemo(() => normalizeConversations(conversations, actor), [conversations, actor]);

  useEffect(() => {
    peopleRef.current = normalizedPeople;
    selectedConversationRef.current = selectedConversation;
  }, [normalizedPeople, selectedConversation]);

  useEffect(() => {
    if (!isMobile && !selectedConversation && normalizedConversations.length > 0) {
      setSelectedConversation(normalizedConversations[0]);
    }
  }, [normalizedConversations, selectedConversation, isMobile]);

  useEffect(() => {
    initialSelectionAppliedRef.current = false;
  }, [initialConversationId]);

  useEffect(() => {
    if (!initialConversationId || initialSelectionAppliedRef.current) return;
    const match = normalizedConversations.find((conversation) => String(conversation._id) === String(initialConversationId));
    if (!match) return;
    setSelectedConversation(match);
    initialSelectionAppliedRef.current = true;
    if (isMobile) {
      setMobileChatOpen(true);
    }
  }, [initialConversationId, normalizedConversations, isMobile]);

  const selectConversation = (conversation) => {
    if (!conversation?._id) return;
    if (conversation.partner && isSameUser(normalizeContact(conversation.partner, conversation.partner?.role || "member"), actor)) {
      toast.error("You cannot open a chat with yourself.");
      return;
    }
    const opened = { ...conversation, unreadCount: 0 };
    setConversations((previous) => previous.map((item) => String(item?._id) === String(conversation._id) ? opened : item));
    setSelectedConversation(opened);
    selectedConversationRef.current = opened;
    setMobileChatOpen(isMobile);
  };

  const startConversation = async (person) => {
    try {
      if (!person?._id) return;
      if (isSameUser(person, actor)) {
        toast.error("You cannot chat with yourself.");
        return;
      }
      const existingConversation =
        normalizedConversations.find((conversation) => String(conversation.partner?._id) === String(person._id)) ||
        normalizedConversations.find((conversation) =>
          (conversation.participants || []).some((participant) => String(participant?._id || participant) === String(person._id))
        );

      if (existingConversation) {
        setSelectedConversation(existingConversation);
        setMobileChatOpen(isMobile);
        return;
      }

      if (person.conversationId) {
        try {
          const response = await API.get(`/conversations/${person.conversationId}`);
          const conversation = normalizeConversation(response.data?.conversation || response.data, actor.id);
          if (conversation) {
            setConversations((previous) => [conversation, ...previous.filter((item) => String(item._id) !== String(conversation._id))]);
            setSelectedConversation(conversation);
            setMobileChatOpen(isMobile);
            return;
          }
        } catch (staleConversationError) {
          // A contact can carry an old conversation id after database cleanup.
          // Do not make the chat button appear dead; resolve/create the current thread below.
          console.warn("Stale conversation id; resolving current chat:", staleConversationError?.response?.status || staleConversationError?.message);
        }
      }

      const response = await API.post("/conversations", { participantId: person._id });
      const conversation = normalizeConversation(response.data?.conversation || response.data, actor.id);
      if (conversation) {
        setConversations((previous) => [conversation, ...previous.filter((item) => String(item._id) !== String(conversation._id))]);
        setSelectedConversation(conversation);
        setMobileChatOpen(isMobile);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Unable to start conversation.");
    }
  };

  const refreshChat = async () => {
    try {
      toast.success(onRefreshHint || "Messages refreshed.");
      await loadChatData();
    } catch (error) {
      console.error("Refresh chat error:", error);
      toast.error(error?.message || "Unable to refresh conversations.");
    }
  };

  const mobileBack = () => {
    setMobileChatOpen(false);
  };

  const ensureCallNotifications = async () => {
    try {
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
      }
    } catch (_) {}
  };

  const startCall = async (type) => {
    const partner = selectedConversation?.partner;
    if (!partner?._id) {
      toast.error("Select a member before starting a call.");
      return;
    }
    if (isSameUser(normalizeContact(partner, partner?.role || "member"), actor)) {
      toast.error("Calling yourself is not available.");
      setSelectedConversation(null);
      setMobileChatOpen(false);
      return;
    }

    const activeSocket = socket || contextSocket || socketClient;
    try {
      await ensureCallNotifications();
      if (!activeSocket.connected) {
        toast("Connecting to secure calling…", { icon: "🔒", duration: 2500, id: "secure-call-connect" });
        if (activeSocket.connect) activeSocket.connect();
        await waitForSocketConnection(activeSocket, 9000);
      }

      setBanner("");
      setCall({
        direction: "outgoing",
        callType: type === "video" ? "video" : "audio",
        partner: selectedConversation.partner,
        conversationId: selectedConversation._id,
        incomingCall: null,
      });
    } catch (error) {
      console.warn("Unable to start call:", error);
      toast.error("Secure calling is temporarily unavailable. Check your connection and try again.", { id: "secure-call-error", duration: 5000 });
    }
  };

  if (isFullscreenChat) {
    return (
      <div className="message-center compact-message-center chat-focus-mode mobile-chat-page">
        {banner && <div className="messages-call-banner mobile-chat-banner">{banner}</div>}
        <div className="mobile-chat-overlay" role="dialog" aria-modal="true" aria-label="Chat conversation">
          <ChatWindow
            conversation={selectedConversation}
            socket={socket}
            currentUser={currentUser || authUser}
            onBack={mobileBack}
            onAudioCall={() => startCall("audio")}
            onVideoCall={() => startCall("video")}
          />
        </div>
        {call && (
          <CallOverlay
            socket={socket}
            currentUser={currentUser || authUser}
            partner={call.partner}
            callType={call.callType}
            incomingCall={call.incomingCall}
            conversationId={call.conversationId || call.incomingCall?.conversationId || selectedConversation?._id || ""}
            autoAccept={Boolean(call.autoAccept)}
            onClose={() => setCall(null)}
          />
        )}
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className={`message-center compact-message-center ${mobileChatOpen ? "chat-focus-mode" : ""}`}>
        <div className="chat-focused-toolbar">
          <div>
            <span className="message-center-kicker">{eyebrow}</span>
            <h1>{title}</h1>
          </div>
          <button type="button" className="portal-chip-action ghost" onClick={refreshChat} title="Refresh conversations">
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {banner && <div className="messages-call-banner">{banner}</div>}

        {!isFullscreenChat && (
          <div className={`message-center-shell ${mobileChatOpen ? "chat-open" : ""}`}>
            <aside className="messages-sidebar-container desktop-chat-sidebar">
              <ChatSidebar
                title="Chats"
                currentUser={currentUser || authUser}
                searchPlaceholder={searchPlaceholder}
                members={normalizedPeople}
                conversations={normalizedConversations}
                selectedConversationId={selectedConversation?._id}
                onSelectConversation={selectConversation}
                onStartConversation={startConversation}
                search={search}
                setSearch={setSearch}
                loading={loadingSidebar}
                emptyConversationsLabel={emptyConversationsLabel}
                emptyMembersLabel={emptyMembersLabel}
                memberSectionLabel={memberSectionLabel}
                conversationSectionLabel="Recent chats"
                showMemberFilters={showMemberFilters}
                filterOptions={filterOptions}
                filters={filters}
                setFilters={setFilters}
                filtersOpen={filtersOpen}
                setFiltersOpen={setFiltersOpen}
              />
            </aside>

            <div className="messages-chat-container full-width-chat">
              <div className="messages-top-mobile-actions compact-top-actions">
                <button type="button" onClick={mobileBack} disabled={!mobileChatOpen}>
                  <ArrowLeft size={18} />
                  Back
                </button>
                <button type="button" className="portal-chip-action ghost" onClick={refreshChat}>
                  <RefreshCw size={16} />
                  Refresh
                </button>
              </div>

              <div className={`mobile-chat-chooser ${showChooserOnMobile ? "show" : "hide"}`}>
                <div className="mobile-chat-chooser-head">
                  <label htmlFor="chat-person-picker">Choose a chat</label>
                </div>

                <div className="message-center-chat-picker compact-picker">
                  <select
                    id="chat-person-picker"
                    value={selectedConversation?.partner?._id || ""}
                    onChange={(e) => {
                      const value = String(e.target.value || "");
                      const conversation = normalizedConversations.find((item) => String(item.partner?._id || "") === value || String(item._id || "") === value);
                      const person = normalizedPeople.find((x) => String(x._id) === value);
                      if (conversation) selectConversation(conversation);
                      else if (person) startConversation(person);
                    }}
                  >
                    <option value="">Select from dropdown</option>
                    {normalizedConversations.filter((conversation) => !isSameUser(buildActorProfile(conversation.partner), actor)).map((conversation) => (
                      <option key={conversation._id} value={conversation.partner?._id || conversation._id}>
                        {formatDisplayName(conversation.partner)}
                        {conversation.lastMessageText ? ` • ${truncateText(conversation.lastMessageText, 42)}` : ""}
                      </option>
                    ))}
                    {normalizedPeople
                      .filter((person) => !isSameUser(buildActorProfile(person), actor))
                      .filter((person) => !normalizedConversations.some((conversation) => String(conversation.partner?._id) === String(person._id)))
                      .map((person) => (
                        <option key={person._id} value={person._id}>
                          {formatDisplayName(person)}
                          {person.roleLabel ? ` • ${person.roleLabel}` : ""}
                          {person.online ? " • Online" : ""}
                        </option>
                      ))}
                  </select>
                </div>
                {showMemberFilters ? (
                  <div className="mobile-chat-filter-box">
                    <div className="mobile-chat-filter-header">
                      <strong>Filter members</strong>
                      <button type="button" onClick={() => setFiltersOpen?.((open) => !open)}>
                        <SlidersHorizontal size={15} />
                        {filtersOpen ? "Hide" : "Show"}
                      </button>
                    </div>
                    {filtersOpen ? (
                      <div className="mobile-chat-filter-grid">
                        <select value={filters.siteStation || "all"} onChange={(e) => setFilters((p) => ({ ...p, siteStation: e.target.value }))}>
                          <option value="all">All site stations</option>
                          {(filterOptions.siteStation || []).map((value) => <option key={value} value={value}>{value}</option>)}
                        </select>
                        <select value={filters.department || "all"} onChange={(e) => setFilters((p) => ({ ...p, department: e.target.value }))}>
                          <option value="all">All departments</option>
                          {(filterOptions.department || []).map((value) => <option key={value} value={value}>{value}</option>)}
                        </select>
                        <select value={filters.position || "all"} onChange={(e) => setFilters((p) => ({ ...p, position: e.target.value }))}>
                          <option value="all">All positions</option>
                          {(filterOptions.position || []).map((value) => <option key={value} value={value}>{value}</option>)}
                        </select>
                        <select value={filters.status || "all"} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}>
                          <option value="all">All statuses</option>
                          {(filterOptions.status || []).map((value) => <option key={value} value={value}>{value}</option>)}
                        </select>
                        <select value={filters.online || "all"} onChange={(e) => setFilters((p) => ({ ...p, online: e.target.value }))}>
                          <option value="all">Any presence</option>
                          <option value="true">Online now</option>
                          <option value="false">Offline</option>
                        </select>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="mobile-chat-list">
                  {loadingSidebar ? (
                    <div className="chat-loading">Loading chats...</div>
                  ) : normalizedConversations.length > 0 ? (
                    normalizedConversations.map((conversation) => (
                      <button key={conversation._id} type="button" className="mobile-chat-row" onClick={() => selectConversation(conversation)}>
                        <span className="mobile-chat-row-avatar">
                          <img src={conversation.partner?.profileImage || "/default-avatar.svg"} alt="" />
                        </span>
                        <span className="mobile-chat-row-body">
                          <strong>{formatDisplayName(conversation.partner)}</strong>
                          <small>{sanitizePreviewText(conversation.lastMessageText) || "Tap to open chat"}</small>
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="chat-empty">{emptyConversationsLabel}</div>
                  )}
                </div>
              </div>

              <div className={`messages-page message-center-shell-inner ${showChooserOnMobile ? "chooser-mode" : "chat-mode"}`}>
                {(!isMobile || mobileChatOpen) && (
                  <ChatWindow
                    conversation={selectedConversation}
                    socket={socket}
                    currentUser={currentUser || authUser}
                    onBack={mobileBack}
                    onAudioCall={() => startCall("audio")}
                    onVideoCall={() => startCall("video")}
                  />
                )}
                {isMobile && !mobileChatOpen && <div className="chat-window-empty choose-chat-empty">Select a chat above to open the conversation.</div>}
              </div>
            </div>
          </div>
        )}

      </div>

      {call && (
        <CallOverlay
          socket={socket}
          currentUser={currentUser || authUser}
          partner={call.partner}
          callType={call.callType}
          incomingCall={call.incomingCall}
          conversationId={call.conversationId || call.incomingCall?.conversationId || selectedConversation?._id || ""}
          autoAccept={Boolean(call.autoAccept)}
          onClose={() => setCall(null)}
        />
      )}
    </DashboardLayout>
  );
}

function waitForSocketConnection(activeSocket, timeout = 9000) {
  if (activeSocket.connected) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = window.setTimeout(() => finish(new Error("SOCKET_TIMEOUT")), timeout);
    const finish = (error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      activeSocket.off("connect", onConnect);
      activeSocket.off("connect_error", onError);
      error ? reject(error) : resolve();
    };
    const onConnect = () => finish();
    const onError = (error) => {
      if (String(error?.message || "").includes("AUTH_")) finish(error);
    };
    activeSocket.on("connect", onConnect);
    activeSocket.on("connect_error", onError);
  });
}

function buildActorProfile(user) {
  // Admin/SuperAdmin accounts have a mirrored Member chat profile. The
  // chatId is therefore the canonical identity for contacts/conversations;
  // portal id remains useful for account-level data but must not win here.
  const id = String(user?.chatId || user?._id || user?.id || user?.memberId || "").trim();
  const portalId = String(user?.portalOwnerId || user?._id || user?.id || "").trim();
  return {
    id,
    portalId,
    email: String(user?.email || "").trim().toLowerCase(),
    username: String(user?.username || "").trim().toLowerCase(),
    phone: normalizePhone(user?.phone || user?.mobile || user?.telephone || ""),
    memberNumber: String(user?.memberNumber || "").trim().toLowerCase(),
    fullName: String(user?.fullName || user?.name || "").trim().toLowerCase(),
  };
}

function normalizeMembers(items, actor) {
  const unique = new Map();

  (items || []).forEach((member) => {
    if (!member) return;

    const id = String(member?._id || "").trim();
    if (!id) return;

    const role = String(member?.role || "").toLowerCase();
    if (role === "superadmin") return;

    const contact = normalizeContact(member, role === "admin" ? "admin" : "member");
    if (isSameUser(contact, actor)) return;
    if (actor.portalId && String(contact?.portalOwnerId || "") === String(actor.portalId)) return;

    const dedupeKey = [contact.role, contact.email || contact.phone || contact.memberNumber || contact.username || id].filter(Boolean).join("|");
    if (unique.has(dedupeKey)) return;

    unique.set(dedupeKey, contact);
  });

  return Array.from(unique.values()).sort((a, b) => {
    const order = { admin: 0, leader: 0, member: 1 };
    const aRank = order[String(a.role || "member").toLowerCase()] ?? 2;
    const bRank = order[String(b.role || "member").toLowerCase()] ?? 2;
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

  const safePartner = partner
    ? { ...partner, fullName: safeDisplayName(partner.fullName || partner.name || partner.username, partner) }
    : null;
  if (safePartner?._id && String(safePartner._id) === String(currentUserId)) return null;

  return {
    ...conversation,
    partner: safePartner,
    lastMessageText: sanitizePreviewText(
      conversation.lastMessageText ||
        conversation.lastMessage?.message ||
        conversation.lastMessage?.text ||
        ""
    ),
    unreadCount: Number(conversation.unreadCount ?? conversation.unreadCounts?.[String(currentUserId)] ?? conversation.unreadCounts?.get?.(String(currentUserId)) ?? 0),
  };
}

function normalizeConversations(items, actor) {
  const unique = new Map();

  (items || [])
    .map((conversation) => normalizeConversation(conversation, actor.id))
    .filter((conversation) => {
      if (!conversation) return false;
      if (!conversation.partner?._id) return false;
      const partner = normalizeContact(conversation.partner, conversation.partner?.role || "member");
      if (isSameUser(partner, actor)) return false;
      if (actor.portalId && String(partner?.portalOwnerId || "") === String(actor.portalId)) return false;
      return true;
    })
    .sort((a, b) =>
      new Date(b.lastMessageTime || b.updatedAt || b.createdAt) -
      new Date(a.lastMessageTime || a.updatedAt || a.createdAt)
    )
    .forEach((conversation) => {
      const partner = normalizeContact(conversation.partner, conversation.partner?.role || "member");
      const keys = [
        `id:${String(partner._id)}`,
        partner.email ? `email:${partner.email}` : "",
        partner.username ? `username:${partner.username}` : "",
        partner.memberNumber ? `member:${partner.memberNumber}` : "",
        (!partner.email && !partner.username && !partner.memberNumber && partner.phone)
          ? `phone:${normalizePhone(partner.phone)}`
          : "",
      ].filter(Boolean);

      if (!keys.some((key) => unique.has(key))) {
        keys.forEach((key) => unique.set(key, conversation));
      }
    });

  return Array.from(new Set(unique.values())).sort((a, b) =>
    new Date(b.lastMessageTime || b.updatedAt || b.createdAt) -
    new Date(a.lastMessageTime || a.updatedAt || a.createdAt)
  );
}

function normalizeContact(user, defaultRole) {
  const role = String(user?.role || defaultRole || "member").toLowerCase();
  const fullName = safeDisplayName(user?.fullName || user?.name || user?.username, user);

  return {
    ...user,
    _id: String(user?._id || "").trim(),
    fullName,
    role,
    roleLabel: role === "superadmin" ? "SuperAdmin" : role === "admin" ? "Leader" : "Member",
    online: Boolean(user?.online),
    email: String(user?.email || "").trim().toLowerCase(),
    username: String(user?.username || "").trim().toLowerCase(),
    memberNumber: String(user?.memberNumber || "").trim().toLowerCase(),
    phone: normalizePhone(user?.phone || user?.mobile || user?.telephone || ""),
  };
}

function isSameUser(contact, actor) {
  if (!contact || !actor) return false;
  const contactId = String(contact?._id || "").trim();
  const values = [
    contactId && actor.id && contactId === actor.id,
    actor.email && String(contact.email || "").trim().toLowerCase() === actor.email,
    actor.username && String(contact.username || "").trim().toLowerCase() === actor.username,
    actor.memberNumber && String(contact.memberNumber || "").trim().toLowerCase() === actor.memberNumber,
    actor.phone && normalizePhone(contact.phone || "") === actor.phone,
  ];
  return values.some(Boolean);
}

function normalizePhone(value) {
  return String(value || "").replace(/[^\d+]/g, "").trim();
}

function safeDisplayName(value, fallbackSource = {}) {
  const raw = String(value || "").trim();
  const fallback = String(fallbackSource?.username || fallbackSource?.email || fallbackSource?.memberNumber || fallbackSource?.roleLabel || "Member").trim();
  if (!raw) return fallback || "Member";
  const looksLikeUrl = /^(https?:\/\/|www\.)/i.test(raw) || /cloudinary|res\.cloudinary/i.test(raw);
  const looksLikeFilePath = raw.includes("/") && /\b(upload|avatar|photo|image|video|document|file)\b/i.test(raw);
  if (looksLikeUrl || looksLikeFilePath) return fallback || "Member";
  if (raw.length > 34 && /https?:|www\.|cloudinary|\/{2,}/i.test(raw)) return fallback || "Member";
  return raw;
}

function sanitizePreviewText(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const looksLikeUrl = /^(https?:\/\/|www\.)/i.test(raw) || /cloudinary|res\.cloudinary/i.test(raw);
  const looksLikeFilePath = raw.includes("/") && /\b(upload|avatar|photo|image|video|document|file)\b/i.test(raw);
  if (looksLikeUrl || looksLikeFilePath) return "Attachment";
  return raw;
}

function formatDisplayName(person) {
  return safeDisplayName(person?.fullName || person?.name || person?.username, person);
}

function truncateText(text, max = 42) {
  const value = sanitizePreviewText(text);
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

export default MessageCenterPage;
