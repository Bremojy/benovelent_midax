import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Image, MapPin, Mic, Paperclip, Plus, Send, Smile, Square, X } from "lucide-react";
import API from "../../services/api";
import toast from "react-hot-toast";
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
  const typingTimerRef = useRef(null);
  const previewUrlRef = useRef("");

  const currentId = String(currentUser?.chatId || currentUser?._id || currentUser?.id || currentUser?.memberId || "");
  const canSend = useMemo(() => Boolean(String(message).trim()) || Boolean(attachment), [message, attachment]);

  const clearAttachment = () => {
    if (previewUrlRef.current) { URL.revokeObjectURL(previewUrlRef.current); previewUrlRef.current = ""; }
    setAttachment("");
    setAttachmentPreview("");
    setMessageType("text");
  };

  useEffect(() => () => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    socket?.emit("stop-typing", { conversationId: conversation?._id });
    (streamRef.current?.getTracks() || []).forEach((track) => track.stop());
  }, [socket, conversation?._id]);

  const uploadFile = async (file, autoSend = false) => {
    if (!file || busy || sendingRef.current) return;
    setBusy(true);
    sendingRef.current = true;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await API.post("/messages/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
      const url = data.fileUrl || data.imageUrl || data.assetUrl || "";
      if (!url) throw new Error("The attachment could not be uploaded. Please try again.");
      const type = getMessageType(file);
      if (autoSend) {
        await onSend("", url, type);
        toast.success("Voice note sent.", { id: "chat-voice-sent", duration: 2200 });
      } else {
        setAttachment(url);
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = type === "image" ? URL.createObjectURL(file) : "";
        setAttachmentPreview(previewUrlRef.current);
        setMessageType(type);
        toast.success("Attachment ready to send.", { id: "chat-attachment-ready", duration: 2200 });
      }
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || "Attachment upload failed. Please try again.";
      toast.error(message, { id: "chat-upload-error", duration: 4500 });
      throw error;
    } finally {
      sendingRef.current = false;
      setBusy(false);
      textareaRef.current?.focus?.();
    }
  };

  const handleSend = async () => {
    const cleanMessage = String(message || "").trim();
    const draftMessage = cleanMessage;
    const draftAttachment = attachment;
    const draftAttachmentPreview = attachmentPreview;
    const draftType = messageType;
    if ((!cleanMessage && !attachment) || busy || sendingRef.current || recording) return;
    sendingRef.current = true;
    setBusy(true);

    // Match WhatsApp/Instagram composer behaviour: clear the draft as soon
    // as the user taps Send, while keeping a local copy for failure recovery.
    setMessage("");
    clearAttachment();
    setShowEmoji(false);
    setShowMore(false);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    socket?.emit("stop-typing", { conversationId: conversation?._id });

    try {
      await onSend(cleanMessage, attachment, messageType);
    } catch (error) {
      // Put unsent text back so a temporary network error never destroys a draft.
      setMessage((current) => current || draftMessage);
      if (draftAttachment) {
        setAttachment(draftAttachment);
        setAttachmentPreview(draftAttachmentPreview);
        setMessageType(draftType);
      }
      throw error;
    } finally {
      sendingRef.current = false;
      setBusy(false);
      requestAnimationFrame(() => textareaRef.current?.focus?.());
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
          toast.error(err.message || "Could not send voice note.", { id: "chat-voice-error" });
        } finally { setRecording(false); }
      };
      recorder.start();
      setRecording(true);
      setShowEmoji(false);
      setShowMore(false);
    } catch (error) {
      toast.error(error.message || "Microphone access is required for voice notes.", { id: "chat-mic-error", duration: 4500 });
    }
  };

  const shareLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Location sharing is not supported on this device or browser.", { id: "chat-location-error" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const link = `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`;
        setMessage(link);
        setShowMore(false);
        textareaRef.current?.focus?.();
      },
      (error) => {
        toast.error(error.message || "Could not access your location.", { id: "chat-location-error", duration: 4500 });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
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
          <button type="button" onClick={() => { cameraInputRef.current?.click(); setShowMore(false); }}><Camera size={18} /> Camera</button>
          <button type="button" onClick={() => { imageInputRef.current?.click(); setShowMore(false); }}><Image size={18} /> Gallery</button>
          <button type="button" onClick={() => { fileInputRef.current?.click(); setShowMore(false); }}><Paperclip size={18} /> Document</button>
          <button type="button" onClick={shareLocation}><MapPin size={18} /> Location</button>
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
            onChange={(event) => {
              const value = event.target.value.slice(0, 5000);
              setMessage(value);
              socket?.emit("typing", { conversationId: conversation?._id });
              if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
              typingTimerRef.current = setTimeout(() => socket?.emit("stop-typing", { conversationId: conversation?._id }), 1200);
            }}
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
