import { useEffect, useMemo, useRef, useState } from "react";
import ChatHeader from "./ChatHeader";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import TypingIndicator from "./TypingIndicator";
import API from "../../services/api";
import toast from "react-hot-toast";
import "./ChatWindow.css";

function ChatWindow({ conversation, socket, currentUser, onBack, onAudioCall, onVideoCall }) {
  const [messages, setMessages] = useState([]);
  const [typingUserId, setTypingUserId] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [chatError, setChatError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState("");
  const [loadingOlder, setLoadingOlder] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingUserRef = useRef("");
  const stickToBottomRef = useRef(true);
  const sendLockRef = useRef(false);

  const ownIds = useMemo(
    () =>
      new Set(
        [currentUser?.chatId, currentUser?._id, currentUser?.id, currentUser?.memberId]
          .filter(Boolean)
          .map((value) => String(value))
      ),
    [currentUser]
  );

  const currentId = String(currentUser?.chatId || currentUser?._id || currentUser?.id || currentUser?.memberId || "");

  const partner = useMemo(() => {
    if (!conversation) return null;
    const participants = conversation.participants || [];
    return conversation.partner || participants.find((member) => String(member?._id || member) !== currentId) || null;
  }, [conversation, currentId]);

  useEffect(() => {
    if (!conversation?._id) {
      setMessages([]);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoadingMessages(true);
        setChatError("");
        const { data } = await API.get(`/messages/conversation/${conversation._id}`, { params: { limit: 50 } });
        if (cancelled) return;
        const items = Array.isArray(data) ? data : data.messages || [];
        setMessages(items.map(normalizeMessage));
        setHasMore(Boolean(data?.hasMore));
        setNextCursor(String(data?.nextCursor || ""));
        stickToBottomRef.current = true;
        try { await API.put(`/conversations/${conversation._id}/read`); } catch (_) {}
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          const message = error.response?.data?.message || error.message || "Unable to load this conversation.";
          setChatError(message);
          toast.error(message, { id: `chat-load-${conversation._id}` });
        }
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [conversation?._id]);

  useEffect(() => {
    if (stickToBottomRef.current) messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [messages, typingUserId]);

  useEffect(() => {
    if (!socket || !conversation?._id) return;
    const conversationId = String(conversation._id);
    socket.emit("join-conversation", conversationId);

    const handleNewMessage = (incoming) => {
      const incomingConversationId = incoming?.conversation?._id || incoming?.conversation || incoming?.conversationId;
      if (String(incomingConversationId) !== String(conversation._id)) return;

      const senderId = String(incoming?.sender?._id || incoming?.sender || incoming?.senderId || "");
      if (senderId && ownIds.has(senderId)) {
        return;
      }

      const normalized = normalizeMessage(incoming);
      stickToBottomRef.current = true;
      setMessages((previous) => {
        const id = String(normalized._id || "");
        const fingerprint = messageFingerprint(normalized);
        if (previous.some((item) => String(item._id) === id || messageFingerprint(item) === fingerprint)) {
          return previous;
        }
        return [...previous, normalized];
      });

      if (normalized?._id) {
        void API.put(`/messages/${normalized._id}/read`).catch(() => {});
        socket.emit("seen-message", { messageId: normalized._id });
        void API.put(`/conversations/${conversation._id}/read`).catch(() => {});
      }
    };

    const handleSeen = (payload) => {
      const messageId = String(payload?.messageId || payload || "");
      if (!messageId) return;
      setMessages((previous) => previous.map((item) => String(item._id) === messageId ? { ...item, seenBy: [...new Set([...(item.seenBy || []), payload?.userId].filter(Boolean))], seenAt: payload?.seenAt || new Date().toISOString() } : item));
    };
    const handleDeleted = (payload) => {
      const messageId = String(payload?.messageId || payload || "");
      if (!messageId) return;
      setMessages((previous) => previous.map((item) => String(item._id) === messageId ? { ...item, deletedForEveryone: true, message: "This message was deleted", attachment: "" } : item));
    };

    const handleTyping = (senderId) => {
      const id = String(senderId || "");
      if (id && id !== currentId) { typingUserRef.current = id; setTypingUserId(id); }
    };

    const handleStopTyping = (senderId) => {
      const id = String(senderId || "");
      if (!id || id === typingUserRef.current) { typingUserRef.current = ""; setTypingUserId(""); }
    };

    socket.on("new-message", handleNewMessage);
    socket.on("message-seen", handleSeen);
    socket.on("message-deleted", handleDeleted);
    socket.on("typing", handleTyping);
    socket.on("stop-typing", handleStopTyping);

    return () => {
      socket.emit("leave-conversation", conversationId);
      socket.off("new-message", handleNewMessage);
      socket.off("message-seen", handleSeen);
      socket.off("message-deleted", handleDeleted);
      socket.off("typing", handleTyping);
      socket.off("stop-typing", handleStopTyping);
    };
  }, [socket, conversation?._id, currentId, ownIds]);

  async function sendMessage(text, attachment, messageType = "text") {
    if (!conversation?._id) return;
    if (!String(text || "").trim() && !attachment) return;
    if (sendLockRef.current) return;

    sendLockRef.current = true;

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticMessage = normalizeMessage({
      _id: tempId,
      conversation: conversation._id,
      sender: { _id: currentId, fullName: currentUser?.fullName || currentUser?.name || "You" },
      message: text,
      attachment,
      messageType,
      createdAt: new Date().toISOString(),
      status: "sending",
      __optimistic: true,
    });

    setMessages((previous) => [...previous, optimisticMessage]);
    scrollToBottom();

    try {
      setChatError("");
      const { data } = await API.post("/messages", { conversationId: conversation._id, message: text, attachment, messageType }, { headers: { "X-Idempotency-Key": tempId } });
      const created = normalizeMessage(data.message || data);
      setMessages((previous) => {
        const withoutTemp = previous.filter((item) => String(item._id) !== tempId);
        if (!created?._id) return withoutTemp;
        if (withoutTemp.some((item) => String(item._id) === String(created._id) || messageFingerprint(item) === messageFingerprint(created))) {
          return withoutTemp;
        }
        return [...withoutTemp, created];
      });
    } catch (error) {
      console.error(error);
      setMessages((previous) => previous.filter((item) => String(item._id) !== tempId));
      const message = error.response?.data?.message || error.message || "Message could not be sent. Check your connection and try again.";
      setChatError(message);
      toast.error(message, { id: `chat-send-${conversation._id}` });
      throw error;
    } finally {
      sendLockRef.current = false;
    }
  }

  async function loadOlderMessages() {
    if (!conversation?._id || !nextCursor || loadingOlder) return;
    const container = messagesContainerRef.current;
    const previousHeight = container?.scrollHeight || 0;
    const previousTop = container?.scrollTop || 0;
    setLoadingOlder(true);
    try {
      const { data } = await API.get(`/messages/conversation/${conversation._id}`, { params: { limit: 50, before: nextCursor } });
      const older = (Array.isArray(data) ? data : data?.messages || []).map(normalizeMessage);
      setMessages((current) => {
        const existing = new Set(current.map((item) => String(item._id)));
        return [...older.filter((item) => !existing.has(String(item._id))), ...current];
      });
      setHasMore(Boolean(data?.hasMore));
      setNextCursor(String(data?.nextCursor || ""));
      stickToBottomRef.current = false;
      requestAnimationFrame(() => {
        const nextHeight = container?.scrollHeight || previousHeight;
        if (container) container.scrollTop = previousTop + (nextHeight - previousHeight);
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load older messages.", { id: `chat-older-${conversation._id}` });
    } finally {
      setLoadingOlder(false);
    }
  }

  function scrollToBottom() {
    stickToBottomRef.current = true;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }

  if (!conversation) {
    return <div className="chat-window-empty">Select a conversation to begin chatting.</div>;
  }

  return (
    <div className="chat-window">
      <ChatHeader
        conversation={conversation}
        partner={partner}
        typingUser={typingUserId}
        onAudioCall={onAudioCall}
        onVideoCall={onVideoCall}
        onBack={onBack}
      />

      {chatError && <div className="chat-error-banner" role="alert"><span>{chatError}</span><button type="button" onClick={() => setChatError("")} aria-label="Dismiss chat error">Dismiss</button></div>}

      <div ref={messagesContainerRef} className="messages-container" role="log" aria-live="polite" aria-label="Chat messages">
        {loadingMessages ? (
          <div className="chat-loading">Loading messages...</div>
        ) : (
          <>
          {hasMore && <button type="button" onClick={loadOlderMessages} disabled={loadingOlder} className="chat-load-older">{loadingOlder ? "Loading older messages…" : "Load older messages"}</button>}
          {messages.map((message) => (
            <MessageBubble key={message._id} message={message} own={String(message.sender?._id || message.sender) === currentId} />
          ))}
          </>
        )}
        <TypingIndicator visible={Boolean(typingUserId) && String(typingUserId) !== currentId} user={partner} />
        <div ref={messagesEndRef} />
      </div>

      <MessageInput onSend={sendMessage} socket={socket} conversation={conversation} currentUser={currentUser} />
    </div>
  );
}

function normalizeMessage(message) {
  if (!message) return message;
  return {
    ...message,
    message: message.message ?? message.text ?? "",
    attachment: message.attachment ?? message.image ?? "",
    messageType: message.messageType || (message.attachment ? "image" : "text"),
  };
}

function messageFingerprint(message) {
  if (!message) return "";
  const senderId = String(message?.sender?._id || message?.sender || message?.senderId || "");
  const body = String(message?.message || message?.text || "").trim();
  const attachment = String(message?.attachment || message?.image || "").trim();
  const type = String(message?.messageType || "").trim();
  const createdAt = String(message?.createdAt || "").slice(0, 19);
  return [senderId, body, attachment, type, createdAt].join("|");
}

export default ChatWindow;
