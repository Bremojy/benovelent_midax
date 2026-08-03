import { useMemo, useRef, useState } from "react";
import {
  Send,
  Image,
  Paperclip,
  Smile,
  Mic,
  X,
} from "lucide-react";

import "./MessageInput.css";

import API from "../../services/api";

const QUICK_EMOJIS = ["😊", "😂", "❤️", "🙏", "👍", "🎉", "😎", "😢", "🔥", "🥰", "🤝", "✨", "💬", "📎", "📷"];

function getCurrentUserId(currentUser) {
  if (currentUser?._id) return currentUser._id;
  try {
    return JSON.parse(localStorage.getItem("user") || "null")?._id || "";
  } catch {
    return "";
  }
}

function MessageInput({
  onSend,
  socket,
  conversation,
  currentUser,
}) {
  const [message, setMessage] = useState("");
  const [image, setImage] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const fileInput = useRef(null);

  const canSend = useMemo(() => Boolean(String(message).trim() || image), [message, image]);

  async function uploadImage(file) {
    const formData = new FormData();
    formData.append("image", file);

    try {

const { data } = await API.post("/messages/upload", formData, {
  headers: { "Content-Type": "multipart/form-data" },
});

setImage(data.imageUrl || data.fileUrl || "");
    } catch (error) {
      console.error(error);
      alert(error.message || "Unable to upload file.");
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  async function send() {
    if (!canSend) return;

    try {
      await onSend(message, image, image ? "image" : "text");
      socket?.emit("stop-typing", {
        conversationId: conversation._id,
        sender: getCurrentUserId(currentUser),
      });
      setMessage("");
      setImage("");
      setEmojiOpen(false);
    } catch (error) {
      console.error(error);
    }
  }

  function typing() {
    socket?.emit("typing", {
      conversationId: conversation._id,
      sender: getCurrentUserId(currentUser),
    });
  }

  function addEmoji(emoji) {
    setMessage((previous) => `${previous}${emoji}`);
    setEmojiOpen(false);
  }

  return (
    <div className="message-input-container">
      {image && (
        <div className="preview-image">
          <img src={image} alt="" />
          <button type="button" onClick={() => setImage("")}>
            <X size={14} />
          </button>
        </div>
      )}

      {emojiOpen && (
        <div className="emoji-popover">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="emoji-chip"
              onClick={() => addEmoji(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div className="message-toolbar">
        <button
          type="button"
          title="Emoji"
          onClick={() => setEmojiOpen((open) => !open)}
        >
          <Smile size={21} />
        </button>

        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          title="Image"
        >
          <Image size={21} />
        </button>

        <button type="button" title="Attachment" onClick={() => fileInput.current?.click()}>
          <Paperclip size={21} />
        </button>

        <button type="button" title="Voice note (coming soon)">
          <Mic size={21} />
        </button>

        <input
          ref={fileInput}
          hidden
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              uploadImage(file);
            }
          }}
        />

        <textarea
          placeholder="Write a private message..."
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            typing();
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            socket?.emit("stop-typing", {
              conversationId: conversation._id,
              sender: getCurrentUserId(currentUser),
            });
          }}
        />

        <button
          type="button"
          className="send-button"
          onClick={send}
          disabled={!canSend}
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}

export default MessageInput;
