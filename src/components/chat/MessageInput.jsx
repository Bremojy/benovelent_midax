
import { useMemo, useRef, useState } from "react";
import { Camera, Image, Mic, Paperclip, Send, Smile, Square, X } from "lucide-react";
import API from "../../services/api";
import "./MessageInput.css";

const EMOJIS = ["😊", "😂", "❤️", "🙏", "👍", "🎉", "😎", "😢", "🔥", "🥰", "🤝", "✨"];

function getMessageType(file) {
  const type = String(file?.type || "").toLowerCase();
  if (type.startsWith("audio/")) return "audio";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("image/")) return "image";
  return "document";
}

export default function MessageInput({ onSend, socket, conversation, currentUser }) {
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState("");
  const [messageType, setMessageType] = useState("text");
  const [showEmoji, setShowEmoji] = useState(false);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);

  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const sendingRef = useRef(false);
  const textareaRef = useRef(null);

  const currentId = String(currentUser?.chatId || currentUser?._id || currentUser?.id || currentUser?.memberId || "");
  const canSend = useMemo(() => Boolean(String(message).trim()) || Boolean(attachment), [message, attachment]);

  const uploadFile = async (file, autoSend = false) => {
    if (!file) return;
    if (busy || sendingRef.current) return;

    setBusy(true);
    sendingRef.current = true;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data } = await API.post("/messages/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const url = data.fileUrl || data.imageUrl || data.assetUrl || "";
      const type = getMessageType(file);

      if (autoSend) {
        await onSend("", url, type);
      } else {
        setAttachment(url);
        setMessageType(type);
      }
    } finally {
      sendingRef.current = false;
      setBusy(false);
      textareaRef.current?.focus?.();
    }
  };

  const handleSend = async () => {
    const cleanMessage = String(message || "").trim();
    if ((!cleanMessage && !attachment) || busy || sendingRef.current || recording) return;

    sendingRef.current = true;
    setBusy(true);

    try {
      await onSend(cleanMessage, attachment, messageType);
      setMessage("");
      setAttachment("");
      setMessageType("text");
      setShowEmoji(false);
      socket?.emit("stop-typing", { conversationId: conversation?._id, sender: currentId });
    } finally {
      sendingRef.current = false;
      setBusy(false);
      textareaRef.current?.focus?.();
    }
  };

  const startRecord = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      streamRef.current = stream;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        try {
          const tracks = streamRef.current?.getTracks() || [];
          tracks.forEach((track) => track.stop());
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
          const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type });
          await uploadFile(file, true);
        } catch (err) {
          console.error(err);
          alert(err.message || "Could not send voice note.");
        } finally {
          setRecording(false);
        }
      };

      recorder.start();
      setRecording(true);
      setShowEmoji(false);
    } catch (error) {
      alert(error.message || "Microphone access is required for voice notes.");
    }
  };

  const stopRecord = () => {
    try {
      recorderRef.current?.stop();
    } catch {
      setRecording(false);
    }
  };

  return (
    <form
      className="message-input-container instagram-composer"
      onSubmit={(event) => {
        event.preventDefault();
        handleSend();
      }}
    >
      {attachment && (
        <div className="preview-image attachment-preview">
          <a href={attachment} target="_blank" rel="noreferrer">
            Attachment ready ({messageType})
          </a>
          <button
            type="button"
            onClick={() => {
              setAttachment("");
              setMessageType("text");
            }}
            aria-label="Remove attachment"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {showEmoji && (
        <div className="emoji-popover">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="emoji-chip"
              onClick={() => {
                setMessage((value) => `${value}${emoji}`);
                setShowEmoji(false);
                textareaRef.current?.focus?.();
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div className="message-toolbar">
        <div className="message-toolbar-actions">
          <button type="button" onClick={() => setShowEmoji((value) => !value)} title="Emoji" aria-label="Emoji picker">
            <Smile size={21} />
          </button>
          <button type="button" onClick={() => imageInputRef.current?.click()} title="Image" aria-label="Attach image">
            <Image size={21} />
          </button>
          <button type="button" onClick={() => fileInputRef.current?.click()} title="Attachment" aria-label="Attach file">
            <Paperclip size={21} />
          </button>
          <button type="button" onClick={() => cameraInputRef.current?.click()} title="Camera" aria-label="Open camera">
            <Camera size={21} />
          </button>
          <button
            type="button"
            onClick={recording ? stopRecord : startRecord}
            title={recording ? "Stop recording" : "Record voice note"}
            aria-label={recording ? "Stop recording voice note" : "Record voice note"}
          >
            {recording ? <Square size={19} /> : <Mic size={21} />}
          </button>
        </div>

        <textarea
          ref={textareaRef}
          placeholder={recording ? "Recording voice note..." : "Message..."}
          value={message}
          onChange={(event) => {
            setMessage(event.target.value);
            socket?.emit("typing", { conversationId: conversation?._id, sender: currentId });
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.stopPropagation();
              handleSend();
            }
          }}
          disabled={recording}
          aria-label="Send a message"
        />

        <button type="submit" className="send-button" disabled={!canSend || busy || recording} aria-label="Send message">
          <Send size={20} />
        </button>
      </div>

      <input
        ref={imageInputRef}
        hidden
        type="file"
        accept="image/*"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) await uploadFile(file, false);
        }}
      />
      <input
        ref={cameraInputRef}
        hidden
        type="file"
        accept="image/*"
        capture="environment"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) await uploadFile(file, false);
        }}
      />
      <input
        ref={fileInputRef}
        hidden
        type="file"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) await uploadFile(file, false);
        }}
      />
    </form>
  );
}
