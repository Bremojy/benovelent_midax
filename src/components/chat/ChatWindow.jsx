import { useEffect, useMemo, useRef, useState } from "react";
import ChatHeader from "./ChatHeader";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import TypingIndicator from "./TypingIndicator";
import API from "../../services/api";
import "./ChatWindow.css";

function ChatWindow({
  conversation,
  socket,
  currentUser,
  onBack,
  onAudioCall,
  onVideoCall,
}) {
  const [messages, setMessages] = useState([]);
  const [typingUserId, setTypingUserId] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef(null);

  const partner = useMemo(() => {
    if (!conversation) return null;
    const participants = conversation.participants || [];
    const currentId = currentUser?.chatId?.toString?.() || currentUser?._id?.toString?.() || String(currentUser?._id || "");
    return conversation.partner || participants.find((member) => String(member?._id || member) !== currentId) || null;
  }, [conversation, currentUser]);

  useEffect(() => {
    if (!conversation?._id) {
      setMessages([]);
      return;
    }

    loadMessages(conversation._id);
  }, [conversation?._id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUserId]);

  useEffect(() => {
    if (!socket || !conversation?._id) return;

    socket.emit("join-conversation", conversation._id);

    const handleNewMessage = (incoming) => {
      const incomingConversationId = incoming?.conversation?._id || incoming?.conversation || incoming?.conversationId;
      if (String(incomingConversationId) !== String(conversation._id)) return;

      const normalized = normalizeMessage(incoming);
      setMessages((previous) => {
        if (previous.some((item) => String(item._id) === String(normalized._id))) {
          return previous;
        }
        return [...previous, normalized];
      });
    };

    const handleTyping = (senderId) => {
      const actorId = String(currentUser?.chatId || currentUser?._id || "");
      if (String(senderId) !== actorId) {
        setTypingUserId(String(senderId || ""));
      }
    };

    const handleStopTyping = (senderId) => {
      if (!senderId || String(senderId) === String(typingUserId)) {
        setTypingUserId("");
      }
    };

    socket.on("new-message", handleNewMessage);
    socket.on("typing", handleTyping);
    socket.on("stop-typing", handleStopTyping);

    return () => {
      socket.off("new-message", handleNewMessage);
      socket.off("typing", handleTyping);
      socket.off("stop-typing", handleStopTyping);
    };
  }, [socket, conversation?._id, currentUser?._id, typingUserId]);


  async function loadMessages(conversationId) {
  try {
    setLoadingMessages(true);
    const { data } = await API.get(`/messages/conversation/${conversationId}`);
    const items = Array.isArray(data) ? data : data.messages || [];
    setMessages(items.map(normalizeMessage));
  } catch (error) {
    console.error(error);
  } finally {
    setLoadingMessages(false);
  }
}


async function sendMessage(text, attachment, messageType = "text") {
  if (!conversation?._id) return;
  if (!String(text || "").trim() && !attachment) return;

  try {
    const { data } = await API.post("/messages", {
      conversationId: conversation._id,
      message: text,
      attachment,
      messageType,
    });

    const created = normalizeMessage(data.message || data);
    socket?.emit("send-message", { conversationId: conversation._id, sender: currentUser?.chatId || currentUser?._id, text, file: attachment, messageType, messageId: created._id });
    setMessages((previous) => {
      if (previous.some((item) => String(item._id) === String(created._id))) {
        return previous;
      }
      return [...previous, created];
    });
  } catch (error) {
    console.error(error);
    throw error;
  }
}

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  if (!conversation) {
    return (
      <div className="chat-window-empty">
        Select a member to begin chatting.
      </div>
    );
  }

  return (
    <div className="chat-window">
      <ChatHeader
        conversation={conversation}
        partner={partner}
        typingUser={typingUserId}
        onAudioCall={onAudioCall}
        onVideoCall={onVideoCall}
      />

      <div className="messages-container">
        {loadingMessages ? (
          <div className="chat-loading">Loading messages...</div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message._id}
              message={message}
              own={String(message.sender?._id || message.sender) === String(currentUser?.chatId || currentUser?._id)}
            />
          ))
        )}

        <TypingIndicator
          visible={Boolean(typingUserId) && String(typingUserId) !== String(currentUser?.chatId || currentUser?._id || "")}
          user={partner}
        />
        <div ref={messagesEndRef} />
      </div>

      <MessageInput
        onSend={sendMessage}
        socket={socket}
        conversation={conversation}
        currentUser={currentUser}
      />
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

export default ChatWindow;
