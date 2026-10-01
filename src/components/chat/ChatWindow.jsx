import { useEffect, useMemo, useRef, useState } from "react";
import ChatHeader from "./ChatHeader";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import TypingIndicator from "./TypingIndicator";
import { BellOff, BellRing, Pin, Trash2, X, Volume2, VolumeX, Search, Archive, ArchiveRestore } from "lucide-react";
import API from "../../services/api";
import toast from "react-hot-toast";
import { isChatSoundEnabled, setChatSoundEnabled, unlockChatSound } from "../../utils/chatSound";
import "./ChatWindow.css";

function ChatWindow({ conversation, socket, currentUser, onBack, onAudioCall, onVideoCall, onConversationDeleted, onConversationArchived, availableConversations = [] }) {
  const currentId = String(currentUser?.chatId || currentUser?._id || currentUser?.id || currentUser?.memberId || "");
  const [messages, setMessages] = useState([]);
  const [typingUserId, setTypingUserId] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [chatError, setChatError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState("");
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [muted, setMuted] = useState(Boolean(conversation?.mutedBy?.some?.((id) => String(id) === currentId)));
  const [pinned, setPinned] = useState(Boolean(conversation?.pinnedBy?.some?.((id) => String(id) === currentId)));
  const [archived, setArchived] = useState(Boolean(conversation?.archivedBy?.some?.((id) => String(id) === currentId)));
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [chatSoundEnabled, setChatSoundEnabledState] = useState(isChatSoundEnabled);
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

  const partner = useMemo(() => {
    if (!conversation) return null;
    const participants = conversation.participants || [];
    return conversation.partner || participants.find((member) => String(member?._id || member) !== currentId) || null;
  }, [conversation, currentId]);

  useEffect(() => {
    unlockChatSound();
    setDetailsOpen(false);
    setReplyTo(null);
    setEditingMessage(null);
    setForwardingMessage(null);
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    setMuted(Boolean(conversation?.mutedBy?.some?.((id) => String(id) === currentId)));
    setPinned(Boolean(conversation?.pinnedBy?.some?.((id) => String(id) === currentId)));
    setArchived(Boolean(conversation?.archivedBy?.some?.((id) => String(id) === currentId)));
  }, [conversation?._id, currentId]);

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
        // Active-chat reads use one realtime acknowledgement plus one
        // authoritative conversation-read request.
        socket.emit("delivered-message", { messageId: normalized._id });
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
    socket.on("message-delivered", handleDelivered);
    socket.on("message-seen", handleSeen);
    socket.on("message-deleted", handleDeleted);
    socket.on("typing", handleTyping);
    socket.on("stop-typing", handleStopTyping);

    return () => {
      socket.emit("leave-conversation", conversationId);
      socket.off("new-message", handleNewMessage);
      socket.off("message-delivered", handleDelivered);
      socket.off("message-seen", handleSeen);
      socket.off("message-deleted", handleDeleted);
      socket.off("typing", handleTyping);
      socket.off("stop-typing", handleStopTyping);
    };
  }, [socket, conversation?._id, currentId, ownIds]);

  async function toggleConversationFlag(kind) {
    if (!conversation?._id) return;
    const endpoint = kind === "pin" ? "pin" : "mute";
    try {
      await API.put(`/conversations/${conversation._id}/${endpoint}`);
      if (kind === "pin") setPinned((value) => !value);
      else setMuted((value) => !value);
      toast.success(kind === "pin" ? (pinned ? "Conversation unpinned." : "Conversation pinned.") : (muted ? "Conversation unmuted." : "Conversation muted."), { id: `chat-${kind}-${conversation._id}` });
    } catch (error) {
      toast.error(error?.response?.data?.message || `Unable to ${kind} this conversation.`);
    }
  }

  async function removeConversation() {
    if (!conversation?._id) return;
    if (typeof window !== "undefined" && !window.confirm("Remove this conversation from your chat list?")) return;
    try {
      await API.delete(`/conversations/${conversation._id}`);
      toast.success("Conversation removed.", { id: `chat-delete-${conversation._id}` });
      onConversationDeleted?.(conversation._id);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to remove this conversation.");
    }
  }

  async function toggleArchive() {
    if (!conversation?._id) return;
    try {
      const { data } = await API.put(`/conversations/${conversation._id}/archive`);
      const nextArchived = Boolean(data?.archived);
      setArchived(nextArchived);
      onConversationArchived?.(conversation._id, nextArchived, data?.conversation);
      toast.success(nextArchived ? "Conversation archived." : "Conversation restored.", { id: `chat-archive-${conversation._id}` });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to update archive state.");
    }
  }

  async function editMessage(messageId, text) {
    if (!messageId) return;
    try {
      const { data } = await API.put(`/messages/${messageId}`, { message: text });
      const updated = normalizeMessage(data?.message || data);
      setMessages((current) => current.map((item) => String(item._id) === String(messageId) ? updated : item));
      setEditingMessage(null);
      toast.success("Message edited.", { id: `chat-edit-${messageId}` });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to edit this message.");
    }
  }

  async function deleteMessageForMe(messageId) {
    try {
      await API.delete(`/messages/${messageId}`);
      setMessages((current) => current.filter((item) => String(item._id) !== String(messageId)));
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to delete this message for you.");
    }
  }

  async function deleteMessageForEveryone(messageId) {
    try {
      const { data } = await API.delete(`/messages/${messageId}/everyone`);
      const updated = normalizeMessage(data?.message || { _id: messageId, deletedForEveryone: true, message: "" });
      setMessages((current) => current.map((item) => String(item._id) === String(messageId) ? { ...item, ...updated, deletedForEveryone: true, message: "", attachment: "" } : item));
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to delete this message for everyone.");
    }
  }

  async function reactToMessage(messageId, emoji, existingEmoji = "") {
    try {
      if (existingEmoji && existingEmoji === emoji) {
        const { data } = await API.delete(`/messages/${messageId}/react`);
        const updated = normalizeMessage(data?.message || data);
        setMessages((current) => current.map((item) => String(item._id) === String(messageId) ? updated : item));
        return;
      }
      const { data } = await API.put(`/messages/${messageId}/react`, { emoji });
      const updated = normalizeMessage(data?.message || data);
      setMessages((current) => current.map((item) => String(item._id) === String(messageId) ? updated : item));
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to update the reaction.");
    }
  }

  async function searchMessages() {
    const query = String(searchQuery || "").trim();
    if (!query || !conversation?._id) { setSearchResults([]); return; }
    try {
      const { data } = await API.get(`/messages/conversation/${conversation._id}/search`, { params: { q: query, limit: 50 } });
      setSearchResults((data?.messages || []).map(normalizeMessage));
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to search this conversation.");
    }
  }

  async function forwardMessage(message, targetConversationId) {
    try {
      const key = `forward-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const { data } = await API.post(`/messages/${message._id}/forward`, { targetConversationId }, { headers: { "X-Idempotency-Key": key } });
      toast.success("Message forwarded.", { id: `chat-forward-${message._id}-${targetConversationId}` });
      setForwardingMessage(null);
      if (String(targetConversationId) === String(conversation?._id)) {
        const forwarded = normalizeMessage(data?.message || data);
        setMessages((current) => current.some((item) => String(item._id) === String(forwarded._id)) ? current : [...current, forwarded]);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to forward this message.");
    }
  }

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
      __retry: { text, attachment, messageType },
    });

    setMessages((previous) => [...previous, optimisticMessage]);
    scrollToBottom();

    try {
      setChatError("");
      const { data } = await API.post("/messages", { conversationId: conversation._id, message: text, attachment, messageType, replyTo: replyTo?._id || undefined }, { headers: { "X-Idempotency-Key": tempId } });
      const created = normalizeMessage(data.message || data);
      setReplyTo(null);
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
      setMessages((previous) => previous.map((item) => String(item._id) === tempId ? { ...item, status: "failed" } : item));
      const message = error.response?.data?.message || error.message || "Message could not be sent. Check your connection and try again.";
      setChatError(message);
      toast.error(message, { id: `chat-send-${conversation._id}` });
      throw error;
    } finally {
      sendLockRef.current = false;
    }
  }

  async function retryMessage(item) {
    const retry = item?.__retry;
    if (!retry) return;
    setMessages((current) => current.filter((message) => String(message._id) !== String(item._id)));
    try {
      await sendMessage(retry.text, retry.attachment, retry.messageType);
    } catch (_) {}
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
        onProfile={() => setDetailsOpen((open) => !open)}
      />

      {detailsOpen && (
        <aside className="chat-details-panel" aria-label="Conversation details">
          <div className="chat-details-head">
            <div>
              <span>Conversation details</span>
              <strong>{partner?.fullName || "Member"}</strong>
            </div>
            <button type="button" onClick={() => setDetailsOpen(false)} aria-label="Close conversation details"><X size={18} /></button>
          </div>
          <div className="chat-details-actions">
            <button type="button" onClick={() => toggleConversationFlag("pin")}><Pin size={17} />{pinned ? "Unpin conversation" : "Pin conversation"}</button>
            <button type="button" onClick={() => toggleConversationFlag("mute")}><>{muted ? <BellRing size={17} /> : <BellOff size={17} />}</>{muted ? "Unmute notifications" : "Mute notifications"}</button>
            <button
              type="button"
              onClick={() => {
                unlockChatSound();
                const next = setChatSoundEnabled(!chatSoundEnabled);
                setChatSoundEnabledState(next);
              }}
              aria-pressed={chatSoundEnabled}
            >
              {chatSoundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
              {chatSoundEnabled ? "Message sound on" : "Message sound off"}
            </button>
            <button type="button" onClick={toggleArchive}>{archived ? <ArchiveRestore size={17} /> : <Archive size={17} />}{archived ? "Restore from archive" : "Archive conversation"}</button>
            <button type="button" onClick={() => { setSearchOpen((open) => !open); setSearchResults([]); }}><Search size={17} />Search messages</button>
            <button type="button" className="danger" onClick={removeConversation}><Trash2 size={17} />Remove conversation</button>
          </div>
          <div className="chat-details-meta">
            {partner?.email ? <span>Email · {partner.email}</span> : null}
            {partner?.phone ? <span>Phone · {partner.phone}</span> : null}
            {partner?.roleLabel ? <span>Role · {partner.roleLabel}</span> : null}
            {partner?.siteStation ? <span>Station · {partner.siteStation}</span> : null}
          </div>
        </aside>
      )}

      {searchOpen && (
        <div className="chat-message-search-panel">
          <form onSubmit={(event) => { event.preventDefault(); searchMessages(); }} className="chat-message-search-row">
            <Search size={16} />
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search this chat" aria-label="Search messages in this chat" autoFocus />
            <button type="submit">Search</button>
          </form>
          {searchResults.length > 0 ? (
            <div className="chat-search-results">
              {searchResults.map((result) => (
                <button key={result._id} type="button" onClick={() => { const node = document.getElementById(`message-${result._id}`); node?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>
                  <strong>{result.sender?.fullName || "Message"}</strong>
                  <span>{String(result.message || "Attachment").slice(0, 140)}</span>
                </button>
              ))}
            </div>
          ) : searchQuery ? <small className="chat-search-no-results">No matching messages.</small> : null}
        </div>
      )}

      {chatError && <div className="chat-error-banner" role="alert"><span>{chatError}</span><button type="button" onClick={() => setChatError("")} aria-label="Dismiss chat error">Dismiss</button></div>}

      <div ref={messagesContainerRef} className="messages-container" role="log" aria-live="polite" aria-label="Chat messages">
        {loadingMessages ? (
          <div className="chat-loading">Loading messages...</div>
        ) : (
          <>
          {hasMore && <button type="button" onClick={loadOlderMessages} disabled={loadingOlder} className="chat-load-older">{loadingOlder ? "Loading older messages…" : "Load older messages"}</button>}
          {messages.map((message, index) => {
            const previous = messages[index - 1];
            const showDate = Boolean(message?.createdAt) && (!previous?.createdAt || new Date(message.createdAt).toDateString() !== new Date(previous.createdAt).toDateString());
            return (
              <div key={message._id}>
                {showDate && <div className="chat-date-separator">{formatDateLabel(message.createdAt)}</div>}
                <MessageBubble
                  message={message}
                  own={String(message.sender?._id || message.sender) === currentId}
                  currentUserId={currentId}
                  onReply={(item) => setReplyTo(item)}
                  onEdit={(item) => { setEditingMessage(item); setReplyTo(null); }}
                  onDeleteForMe={deleteMessageForMe}
                  onDeleteForEveryone={deleteMessageForEveryone}
                  onReact={reactToMessage}
                  onForward={(item) => setForwardingMessage(item)}
                  onRetry={retryMessage}
                />
              </div>
            );
          })}
          </>
        )}
        <TypingIndicator visible={Boolean(typingUserId) && String(typingUserId) !== currentId} user={partner} />
        <div ref={messagesEndRef} />
      </div>

      {(replyTo || editingMessage) && (
        <div className="chat-composer-context">
          <div>
            <strong>{editingMessage ? "Editing message" : `Replying to ${replyTo?.sender?.fullName || "message"}`}</strong>
            <span>{String(editingMessage?.message || replyTo?.message || "Attachment").slice(0, 180)}</span>
          </div>
          <button type="button" onClick={() => { setReplyTo(null); setEditingMessage(null); }} aria-label="Cancel reply or edit"><X size={16} /></button>
        </div>
      )}
      <MessageInput
        onSend={sendMessage}
        onEdit={editMessage}
        editingMessage={editingMessage}
        replyTo={replyTo}
        socket={socket}
        conversation={conversation}
        currentUser={currentUser}
        onCancelContext={() => { setReplyTo(null); setEditingMessage(null); }}
      />

      {forwardingMessage && (
        <div className="chat-forward-modal" role="dialog" aria-modal="true" aria-label="Forward message">
          <div className="chat-forward-card">
            <div className="chat-forward-head"><strong>Forward message</strong><button type="button" onClick={() => setForwardingMessage(null)} aria-label="Close forward dialog"><X size={18} /></button></div>
            <p>{String(forwardingMessage.message || "Attachment").slice(0, 160)}</p>
            <div className="chat-forward-list">
              {availableConversations.filter((item) => String(item._id) !== String(conversation?._id)).map((target) => (
                <button key={target._id} type="button" onClick={() => forwardMessage(forwardingMessage, target._id)}>{target.partner?.fullName || "Member"}</button>
              ))}
              {availableConversations.filter((item) => String(item._id) !== String(conversation?._id)).length === 0 ? <span>No other conversations available.</span> : null}
            </div>
          </div>
        </div>
      )}
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

function formatDateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: date.getFullYear() === today.getFullYear() ? undefined : "numeric" });
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
