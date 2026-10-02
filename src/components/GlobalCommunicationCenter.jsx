import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, Phone, PhoneCall, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import API from "../services/api";
import { isChatSoundEnabled, playIncomingMessageSound, unlockChatSound } from "../utils/chatSound";
import { removePendingCall, getPendingCall } from "../utils/pushCallStore";
import { startNativeIncomingCall as startNativeBridgeCall } from "../utils/nativeCallBridge";
import CallOverlay from "./chat/CallOverlay";
import "./GlobalCommunicationCenter.css";

const MAX_MESSAGE_POPUPS = 3;
const MESSAGE_POPUP_LIFETIME = 6500;
const MISSED_CALL_LIFETIME = 7500;
const DEDUPE_LIMIT = 600;

function GlobalCommunicationCenter() {
  const { user } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  const [messagePopups, setMessagePopups] = useState([]);
  const [missedCalls, setMissedCalls] = useState([]);
  const [activeCall, setActiveCall] = useState(null);
  const [conversationPrefs, setConversationPrefs] = useState({});

  const activeConversationIdRef = useRef("");
  const processedIdsRef = useRef(new Set());
  const popupTimersRef = useRef(new Map());
  const missedCallTimersRef = useRef(new Map());
  const pendingCallIdsRef = useRef(new Set());
  const conversationPrefsRef = useRef({});

  const role = String(user?.role || "member").toLowerCase();
  const actorId = String(user?.chatId || user?._id || user?.id || user?.memberId || "");
  const messagesPath = useMemo(() => {
    if (role === "member") return "/member/messages";
    if (role === "admin") return "/admin/messages";
    return "";
  }, [role]);

  const remember = useCallback((key) => {
    const normalized = String(key || "").trim();
    if (!normalized || processedIdsRef.current.has(normalized)) return false;
    processedIdsRef.current.add(normalized);
    if (processedIdsRef.current.size > DEDUPE_LIMIT) {
      const oldest = processedIdsRef.current.values().next().value;
      processedIdsRef.current.delete(oldest);
    }
    return true;
  }, []);

  const clearMessagePopup = useCallback((popupId) => {
    setMessagePopups((current) => current.filter((item) => String(item.id) !== String(popupId)));
    const timer = popupTimersRef.current.get(String(popupId));
    if (timer) window.clearTimeout(timer);
    popupTimersRef.current.delete(String(popupId));
  }, []);

  const clearMissedCall = useCallback((callId) => {
    setMissedCalls((current) => current.filter((item) => String(item.callId) !== String(callId)));
    const timer = missedCallTimersRef.current.get(String(callId));
    if (timer) window.clearTimeout(timer);
    missedCallTimersRef.current.delete(String(callId));
  }, []);

  const markNotificationRead = useCallback(async (notificationId) => {
    if (!notificationId) return;
    try {
      await API.put(`/notifications/${notificationId}/read`);
    } catch {
      // Navigation/call handling must not depend on notification persistence succeeding.
    }
  }, []);

  const openConversation = useCallback(async ({ conversationId, notificationId = "" }) => {
    if (!conversationId || !messagesPath) return;
    await markNotificationRead(notificationId);
    navigate(`${messagesPath}?conversationId=${encodeURIComponent(conversationId)}`);
  }, [markNotificationRead, messagesPath, navigate]);

  const loadConversationPrefs = useCallback(async () => {
    if (!user || !["member", "admin"].includes(role)) return;
    try {
      const { data } = await API.get("/conversations");
      const conversations = Array.isArray(data?.conversations) ? data.conversations : [];
      const prefs = {};
      for (const conversation of conversations) {
        if (!conversation?._id) continue;
        const muted = Boolean(conversation?.mutedBy?.some?.((id) => String(id) === actorId));
        prefs[String(conversation._id)] = { muted };
      }
      conversationPrefsRef.current = prefs;
      setConversationPrefs(prefs);
    } catch {
      // Conversation loading is already owned by portal/chat pages; popup delivery must stay non-blocking.
    }
  }, [actorId, role, user]);

  useEffect(() => {
    activeConversationIdRef.current = "";
    const handleActiveChat = (event) => {
      activeConversationIdRef.current = String(event?.detail?.conversationId || "");
    };
    window.addEventListener("benevolent:active-chat-change", handleActiveChat);
    return () => window.removeEventListener("benevolent:active-chat-change", handleActiveChat);
  }, []);

  useEffect(() => {
    conversationPrefsRef.current = conversationPrefs;
  }, [conversationPrefs]);

  useEffect(() => {
    const handleMuteState = (event) => {
      const conversationId = String(event?.detail?.conversationId || "");
      if (!conversationId) return;
      const muted = Boolean(event?.detail?.muted);
      const next = { ...conversationPrefsRef.current, [conversationId]: { ...(conversationPrefsRef.current[conversationId] || {}), muted } };
      conversationPrefsRef.current = next;
      setConversationPrefs(next);
    };
    window.addEventListener("benevolent:chat-mute-state", handleMuteState);
    return () => window.removeEventListener("benevolent:chat-mute-state", handleMuteState);
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    void loadConversationPrefs();
    return undefined;
  }, [loadConversationPrefs, user]);

  useEffect(() => () => {
    for (const timer of popupTimersRef.current.values()) window.clearTimeout(timer);
    popupTimersRef.current.clear();
    for (const timer of missedCallTimersRef.current.values()) window.clearTimeout(timer);
    missedCallTimersRef.current.clear();
  }, []);

  useEffect(() => {
    if (!user || !socket) return undefined;

    const onConnect = () => {
      socket.emit("notification-register");
      socket.emit("get-notification-count");
    };

    const onNotification = (notification) => {
      if (!notification?._id) return;
      const type = String(notification?.type || "system").toLowerCase();
      const metadata = notification?.metadata || {};
      const notificationId = String(notification._id);

      if (type === "message") {
        const conversationId = String(metadata?.conversationId || "");
        const messageId = String(metadata?.messageId || notification?.referenceId || "");
        if (!conversationId || !messageId || !messagesPath) return;

        const popupKey = `message:${messageId}`;
        if (!remember(popupKey)) return;
        const senderId = String(notification?.sender?._id || notification?.sender || "");
        if (senderId && actorId && senderId === actorId) return;
        if (activeConversationIdRef.current === conversationId) return;
        if (conversationPrefsRef.current[conversationId]?.muted) return;

        const title = String(notification?.sender?.fullName || notification?.title || "New message").replace(/^New message from\s+/i, "").trim() || "New message";
        const body = String(notification?.message || "You received a new message.").trim();
        const popup = {
          id: notificationId,
          conversationId,
          messageId,
          notificationId,
          title,
          body,
          avatar: notification?.sender?.profileImage || metadata?.senderProfileImage || "",
          createdAt: notification?.createdAt || new Date().toISOString(),
        };

        setMessagePopups((current) => [popup, ...current.filter((item) => String(item.id) !== notificationId)].slice(0, MAX_MESSAGE_POPUPS));
        if (isChatSoundEnabled()) {
          unlockChatSound();
          playIncomingMessageSound();
        }
        const timer = window.setTimeout(() => clearMessagePopup(notificationId), MESSAGE_POPUP_LIFETIME);
        popupTimersRef.current.set(notificationId, timer);
        return;
      }

      if (type === "call" && metadata?.missed) {
        const callId = String(metadata?.callId || notification?.eventId || notificationId);
        const conversationId = String(metadata?.conversationId || "");
        if (!remember(`missed-call:${callId}`)) return;
        const popup = {
          callId,
          notificationId,
          conversationId,
          title: String(notification?.title || "Missed call"),
          body: String(notification?.message || "You missed a call."),
          callType: metadata?.callType === "video" ? "video" : "audio",
          avatar: notification?.sender?.profileImage || metadata?.senderProfileImage || "",
        };
        setMissedCalls((current) => [popup, ...current.filter((item) => String(item.callId) !== callId)].slice(0, MAX_MESSAGE_POPUPS));
        const timer = window.setTimeout(() => clearMissedCall(callId), MISSED_CALL_LIFETIME);
        missedCallTimersRef.current.set(callId, timer);
      }
    };

    const onIncomingCall = (payload) => {
      const callId = String(payload?.callId || "");
      if (!callId || !payload?.offer || !payload?.from) return;
      if (!remember(`incoming-call:${callId}`)) return;
      if (pendingCallIdsRef.current.has(callId)) return;
      pendingCallIdsRef.current.add(callId);
      startNativeBridgeCall({
        callerName: payload?.callerName || "Member",
        callType: payload?.callType === "video" ? "video" : "audio",
        callId,
        callerUserId: payload?.callerUserId || "",
        role,
      });
      setActiveCall({
        direction: "incoming",
        incomingCall: payload,
        callType: payload?.callType === "video" ? "video" : "audio",
        conversationId: String(payload?.conversationId || ""),
        partner: {
          _id: payload?.callerUserId,
          fullName: payload?.callerName || "Member",
          profileImage: payload?.callerProfileImage || payload?.profileImage || "",
        },
      });
    };

    const onMissedCall = (payload) => {
      const callId = String(payload?.callId || "");
      if (!callId || !remember(`missed-call:${callId}`)) return;
      const notification = payload?.notification || {};
      const metadata = notification?.metadata || {};
      const item = {
        callId,
        notificationId: String(notification?._id || ""),
        conversationId: String(payload?.conversationId || metadata?.conversationId || ""),
        title: String(notification?.title || (payload?.callType === "video" ? "Missed video call" : "Missed audio call")),
        body: String(notification?.message || `${payload?.callerName || "A member"} tried to call you.`),
        callType: payload?.callType === "video" ? "video" : "audio",
        avatar: payload?.callerProfileImage || notification?.sender?.profileImage || "",
      };
      setMissedCalls((current) => [item, ...current.filter((entry) => String(entry.callId) !== callId)].slice(0, MAX_MESSAGE_POPUPS));
      const timer = window.setTimeout(() => clearMissedCall(callId), MISSED_CALL_LIFETIME);
      missedCallTimersRef.current.set(callId, timer);
    };

    if (!socket.connected) socket.connect();
    else onConnect();
    socket.on("connect", onConnect);
    socket.on("new-notification", onNotification);
    socket.on("incoming-call", onIncomingCall);
    socket.on("missed-call", onMissedCall);

    return () => {
      socket.off("connect", onConnect);
      socket.off("new-notification", onNotification);
      socket.off("incoming-call", onIncomingCall);
      socket.off("missed-call", onMissedCall);
      for (const timer of popupTimersRef.current.values()) window.clearTimeout(timer);
      popupTimersRef.current.clear();
      pendingCallIdsRef.current.clear();
    };
  }, [actorId, clearMessagePopup, clearMissedCall, loadConversationPrefs, markNotificationRead, messagesPath, remember, role, socket, user]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const params = new URLSearchParams(location.search);
        const pending = await getPendingCall(params.get("incomingPushCall") || params.get("incomingNativeCall") || "");
        const pendingPayload = pending?.data || pending || null;
        if (!active || !pendingPayload?.offer) return;
        const callId = String(pendingPayload?.callId || "");
        if (!callId || pendingCallIdsRef.current.has(callId)) return;
        pendingCallIdsRef.current.add(callId);
        const action = String(params.get("callAction") || "open").toLowerCase();
        if (action === "decline") {
          const activeSocket = socket;
          if (activeSocket && !activeSocket.connected) activeSocket.connect();
          if (activeSocket && pendingPayload?.from) activeSocket.emit("call-rejected", { to: pendingPayload.from, callId });
          await removePendingCall(callId);
          pendingCallIdsRef.current.delete(callId);
          const url = new URL(window.location.href);
          url.searchParams.delete("incomingPushCall");
          url.searchParams.delete("incomingNativeCall");
          url.searchParams.delete("callAction");
          window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
          return;
        }
        setActiveCall({
          direction: "incoming",
          incomingCall: pendingPayload,
          autoAccept: String(new URLSearchParams(location.search).get("callAction") || "").toLowerCase() === "answer",
          callType: pendingPayload?.callType === "video" ? "video" : "audio",
          conversationId: String(pendingPayload?.conversationId || ""),
          partner: {
            _id: pendingPayload?.callerUserId,
            fullName: pendingPayload?.callerName || "Member",
            profileImage: pendingPayload?.callerProfileImage || "",
          },
        });
        if (location.search) {
          const url = new URL(window.location.href);
          url.searchParams.delete("incomingPushCall");
          url.searchParams.delete("incomingNativeCall");
          url.searchParams.delete("callAction");
          window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
        }
      } catch {
        // A stale push payload must never block normal portal rendering.
      }
    })();
    return () => { active = false; };
  }, [location.search]);

  const closeActiveCall = useCallback(async () => {
    const pendingId = String(activeCall?.incomingCall?.callId || "");
    setActiveCall(null);
    pendingCallIdsRef.current.delete(pendingId);
    if (pendingId) await removePendingCall(pendingId).catch(() => {});
  }, [activeCall?.incomingCall?.callId]);

  if (!user) return null;

  return (
    <>
      <div className="global-communication-center" aria-live="polite" aria-atomic="false">
        <div className="global-message-popup-stack">
          {messagePopups.map((popup) => (
            <article
              key={popup.id}
              className="global-message-popup"
              role="status"
              tabIndex={0}
              onClick={() => { void openConversation({ conversationId: popup.conversationId, notificationId: popup.notificationId }); clearMessagePopup(popup.id); }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  void openConversation({ conversationId: popup.conversationId, notificationId: popup.notificationId });
                  clearMessagePopup(popup.id);
                }
              }}
              aria-label={`Open new message from ${popup.title}`}
            >
              <div className="global-popup-avatar">
                {popup.avatar ? <img src={popup.avatar} alt="" /> : <Bell size={18} aria-hidden="true" />}
              </div>
              <div className="global-popup-copy">
                <div className="global-popup-title-row"><strong>{popup.title}</strong><span>New message</span></div>
                <p>{popup.body}</p>
                <time dateTime={popup.createdAt}>{formatTime(popup.createdAt)}</time>
              </div>
              <button type="button" className="global-popup-close" aria-label="Dismiss new message" onClick={(event) => { event.stopPropagation(); clearMessagePopup(popup.id); }}>
                <X size={16} />
              </button>
            </article>
          ))}
        </div>

        <div className="global-missed-call-stack">
          {missedCalls.map((call) => (
            <article key={call.callId} className="global-missed-call-popup" role="status">
              <div className="global-popup-avatar call-avatar">
                {call.avatar ? <img src={call.avatar} alt="" /> : <PhoneCall size={18} aria-hidden="true" />}
              </div>
              <div className="global-popup-copy">
                <div className="global-popup-title-row"><strong>{call.title}</strong><span>{call.callType === "video" ? "Video" : "Audio"}</span></div>
                <p>{call.body}</p>
              </div>
              <button type="button" className="global-popup-close" aria-label="Dismiss missed call" onClick={() => clearMissedCall(call.callId)}>
                <X size={16} />
              </button>
              {call.conversationId && messagesPath ? (
                <button type="button" className="global-missed-call-open" onClick={() => { void openConversation({ conversationId: call.conversationId, notificationId: call.notificationId }); clearMissedCall(call.callId); }}>
                  <Phone size={15} /> Open chat
                </button>
              ) : null}
            </article>
          ))}
        </div>
      </div>

      {activeCall ? (
        <CallOverlay
          socket={socket}
          currentUser={user}
          partner={activeCall.partner}
          callType={activeCall.callType}
          incomingCall={activeCall.incomingCall}
          conversationId={activeCall.conversationId || activeCall.incomingCall?.conversationId || ""}
          autoAccept={Boolean(activeCall.autoAccept)}
          onClose={closeActiveCall}
        />
      ) : null}
    </>
  );
}

function formatTime(value) {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default GlobalCommunicationCenter;
