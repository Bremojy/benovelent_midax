import { useEffect, useMemo, useRef, useState } from "react";
import ChatHeader from "./ChatHeader";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import TypingIndicator from "./TypingIndicator";
import API from "../../services/api";
import "./ChatWindow.css";

function ChatWindow({ conversation, socket, currentUser, onBack, onAudioCall, onVideoCall }) {
  const [messages, setMessages] = useState([]);
  const [typingUserId, setTypingUserId] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef(null);
  const sendLockRef = useRef(false);
  const ownIds = useMemo(() => new Set([currentUser?.chatId, currentUser?._id, currentUser?.id, currentUser?.memberId].filter(Boolean).map((value) => String(value))), [currentUser]);
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
        const { data } = await API.get(`/messages/conversation/${conversation._id}`);
        if (cancelled) return;
        const items = Array.isArray(data) ? data : data.messages || [];
        setMessages(items.map(normalizeMessage));
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [conversation?._id]);

  useEffect(() => { scrollToBottom(); }, [messages, typingUserId]);

  useEffect(() => {
    if (!socket || !conversation?._id) return;
    socket.emit("join-conversation", conversation._id);

    const handleNewMessage = (incoming) => {
      const incomingConversationId = incoming?.conversation?._id || incoming?.conversation || incoming?.conversationId;
      if (String(incomingConversationId) !== String(conversation._id)) return;

      const senderId = String(incoming?.sender?._id || incoming?.sender || incoming?.senderId || "");
      if (senderId && ownIds.has(senderId)) {
        return;
      }

      const normalized = normalizeMessage(incoming);
      setMessages((previous) => {
        const id = String(normalized._id || "");
        const fingerprint = messageFingerprint(normalized);
        if (previous.some((item) => String(item._id) === id || messageFingerprint(item) === fingerprint)) {
          return previous;
        }
        return [...previous, normalized];
      });
    };

    const handleTyping = (senderId) => {
      if (String(senderId) !== currentId) setTypingUserId(String(senderId || ""));
    };

    const handleStopTyping = (senderId) => {
      if (!senderId || String(senderId) === String(typingUserId)) setTypingUserId("");
    };

    socket.on("new-message", handleNewMessage);
    socket.on("typing", handleTyping);
    socket.on("stop-typing", handleStopTyping);

    return () => {
      socket.off("new-message", handleNewMessage);
      socket.off("typing", handleTyping);
      socket.off("stop-typing", handleStopTyping);
    };
  }, [socket, conversation?._id, currentId, typingUserId, ownIds]);

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
      const { data } = await API.post("/messages", { conversationId: conversation._id, message: text, attachment, messageType });
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
      throw error;
    } finally {
      sendLockRef.current = false;
    }
  }

  function scrollToBottom() { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }

  if (!conversation) {
    return <div className="chat-window-empty">Select a conversation to begin chatting.</div>;
  }

  return (
    <div className="chat-window">
      <ChatHeader conversation={conversation} partner={partner} typingUser={typingUserId} onAudioCall={onAudioCall} onVideoCall={onVideoCall} />
      <div className="messages-container" role="log" aria-live="polite" aria-label="Chat messages">
        {loadingMessages ? <div className="chat-loading">Loading messages...</div> : messages.map((message) => (
          <MessageBubble key={message._id} message={message} own={String(message.sender?._id || message.sender) === currentId} />
        ))}
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
