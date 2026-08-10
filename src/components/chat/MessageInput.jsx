import { useMemo, useRef, useState } from "react";
import { Camera, Image, Mic, Paperclip, Plus, Send, Smile, Square, X } from "lucide-react";
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
  const [attachmentPreview, setAttachmentPreview] = useState("");
  const [messageType, setMessageType] = useState("text");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMore, setShowMore] = useState(false);
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

  const clearAttachment = () => {
    setAttachment("");
    setAttachmentPreview("");
    setMessageType("text");
  };

  const uploadFile = async (file, autoSend = false) => {
    if (!file || busy || sendingRef.current) return;
    setBusy(true);
    sendingRef.current = true;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await API.post("/messages/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
      const url = data.fileUrl || data.imageUrl || data.assetUrl || "";
      const type = getMessageType(file);
      if (autoSend) {
        await onSend("", url, type);
      } else {
        setAttachment(url);
        setAttachmentPreview(type === "image" ? URL.createObjectURL(file) : "");
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
      clearAttachment();
      setShowEmoji(false);
      setShowMore(false);
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
      recorder.ondataavailable = (event) => { if (event.data?.size) chunksRef.current.push(event.data); };
      recorder.onstop = async () => {
        try {
          (streamRef.current?.getTracks() || []).forEach((track) => track.stop());
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
          const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type });
          await uploadFile(file, true);
        } catch (err) {
          console.error(err);
          alert(err.message || "Could not send voice note.");
        } finally { setRecording(false); }
      };
      recorder.start();
      setRecording(true);
      setShowEmoji(false);
      setShowMore(false);
    } catch (error) {
      alert(error.message || "Microphone access is required for voice notes.");
    }
  };

  const stopRecord = () => { try { recorderRef.current?.stop(); } catch { setRecording(false); } };

  return (
    <form className="message-input-container instagram-composer" onSubmit={(event) => { event.preventDefault(); handleSend(); }}>
      {(attachment || recording) && (
        <div className="composer-preview">
          {attachmentPreview ? <img src={attachmentPreview} alt="Selected attachment preview" /> : <span>{recording ? "Recording voice note…" : `Attachment ready · ${messageType}`}</span>}
          {!recording && <button type="button" onClick={clearAttachment} aria-label="Remove attachment"><X size={14} /></button>}
        </div>
      )}

      {showEmoji && (
        <div className="emoji-popover">
          {EMOJIS.map((emoji) => <button key={emoji} type="button" className="emoji-chip" onClick={() => { setMessage((value) => `${value}${emoji}`); setShowEmoji(false); textareaRef.current?.focus?.(); }}>{emoji}</button>)}
        </div>
      )}

      {showMore && (
        <div className="composer-more-menu">
          <button type="button" onClick={() => { imageInputRef.current?.click(); setShowMore(false); }}><Image size={18} /> Photo or video</button>
          <button type="button" onClick={() => { fileInputRef.current?.click(); setShowMore(false); }}><Paperclip size={18} /> File</button>
        </div>
      )}

      <div className="instagram-composer-row">
        <button className="composer-icon camera-icon" type="button" onClick={() => cameraInputRef.current?.click()} title="Camera" aria-label="Open camera"><Camera size={22} /></button>

        <div className="instagram-message-pill">
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder={recording ? "Recording voice note…" : "Message…"}
            value={message}
            onChange={(event) => { setMessage(event.target.value); socket?.emit("typing", { conversationId: conversation?._id, sender: currentId }); }}
            onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.stopPropagation(); handleSend(); } }}
            disabled={recording}
            aria-label="Send a message"
          />
          <button className="pill-icon" type="button" onClick={() => setShowEmoji((value) => !value)} title="Emoji" aria-label="Emoji picker"><Smile size={21} /></button>
          <button className="pill-icon pill-image-button" type="button" onClick={() => imageInputRef.current?.click()} title="Photo" aria-label="Attach photo"><Image size={20} /></button>
        </div>

        {canSend ? (
          <button className="composer-send" type="submit" disabled={busy || recording} aria-label="Send message"><Send size={20} /></button>
        ) : (
          <button className={`composer-icon voice-icon ${recording ? "recording" : ""}`} type="button" onClick={recording ? stopRecord : startRecord} title={recording ? "Stop recording" : "Record voice note"} aria-label={recording ? "Stop recording" : "Record voice note"}>
            {recording ? <Square size={18} /> : <Mic size={22} />}
          </button>
        )}

        <button className="composer-icon plus-icon" type="button" onClick={() => setShowMore((value) => !value)} title="More attachments" aria-label="More attachments"><Plus size={22} /></button>
      </div>

      <input ref={imageInputRef} hidden type="file" accept="image/*,video/*" onChange={async (event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) await uploadFile(file, false); }} />
      <input ref={cameraInputRef} hidden type="file" accept="image/*" capture="environment" onChange={async (event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) await uploadFile(file, false); }} />
      <input ref={fileInputRef} hidden type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" onChange={async (event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) await uploadFile(file, false); }} />
    </form>
  );
}
