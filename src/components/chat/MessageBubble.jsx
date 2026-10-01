import { useState } from "react";
import { Check, CheckCheck, MoreVertical, Reply, Pencil, Trash2, Copy, Forward, Plus } from "lucide-react";
import "./MessageBubble.css";
import { resolveUploadUrl } from "../../services/api";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

function MessageBubble({ message, own, currentUserId, onReply, onEdit, onDeleteForMe, onDeleteForEveryone, onReact, onForward, onRetry }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const body = message?.message || message?.text || "";
  const attachment = message?.attachment || message?.image || "";
  const attachmentUrl = buildAttachmentUrl(attachment);
  const isImage = message?.messageType === "image" || /\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/i.test(attachment);
  const isAudio = message?.messageType === "audio";
  const isVideo = message?.messageType === "video";
  const myReaction = Array.isArray(message?.reactions) ? message.reactions.find((reaction) => String(reaction.member?._id || reaction.member) === String(currentUserId)) : null;
  const canEdit = own && String(message?.messageType || "text") === "text" && !message?.deletedForEveryone && Boolean(body);
  const canDeleteEveryone = own && !message?.deletedForEveryone;

  function formatTime(date) {
    if (!date) return "";
    return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  async function copyMessage() {
    try { await navigator.clipboard.writeText(body || attachment); } catch {}
    setMenuOpen(false);
  }

  return (
    <div className={own ? "message own" : "message other"} id={message?._id ? `message-${message._id}` : undefined}>
      <div className="message-content">
        {message?.forwarded && <div className="message-forwarded">Forwarded</div>}
        {!own && message?.sender?.fullName && <div className="message-sender">{message.sender.fullName}</div>}

        {attachment && isImage && <a className="message-image-link" href={attachmentUrl} target="_blank" rel="noreferrer"><img src={attachmentUrl} alt="Shared attachment" className="message-image" loading="lazy" decoding="async" /></a>}
        {isAudio && attachment && <audio controls src={attachmentUrl} style={{maxWidth:"100%"}} />}
        {isVideo && attachment && <video controls src={attachmentUrl} style={{maxWidth:"100%",borderRadius:12}} />}
        {message?.deletedForEveryone ? <p className="message-deleted">This message was deleted</p> : body && <p>{body}</p>}
        {attachment && !isImage && !isAudio && !isVideo && <a className="message-file-link" href={attachmentUrl} target="_blank" rel="noreferrer">Open attachment</a>}

        {!message?.deletedForEveryone && (
          <div className="message-reaction-row">
            {(message?.reactions || []).map((reaction, index) => <button key={`${reaction.member}-${index}`} type="button" onClick={() => onReact?.(message._id, reaction.emoji, String(reaction.member?._id || reaction.member) === String(currentUserId) ? reaction.emoji : "")} title={`${reaction.emoji} reaction`}>{reaction.emoji}</button>)}
            <button type="button" className="message-reaction-add" onClick={() => onReact?.(message._id, "👍", myReaction?.emoji || "")} aria-label="Add reaction"><Plus size={15} /></button>
          </div>
        )}

        <div className="message-footer">
          <span>{formatTime(message?.createdAt)}</span>
          {message?.edited && <span>edited</span>}
          {message?.status === "failed" && <button type="button" className="message-retry-inline" onClick={() => onRetry?.(message)}>Retry</button>}
          {own && <span className="status">{message?.status === "failed" ? "!" : message?.status === "sending" ? <Check size={15} /> : (message?.seenAt || (Array.isArray(message?.seenBy) && message.seenBy.length > 0)) ? <CheckCheck size={15} color="#0ea5e9" /> : message?.delivered || message?.status === "delivered" ? <CheckCheck size={15} /> : <Check size={15} />}</span>}
          <button type="button" className="message-menu-button" onClick={() => setMenuOpen((value) => !value)} aria-label="Message actions"><MoreVertical size={16} /></button>
        </div>

        {menuOpen && (
          <div className="message-context-menu">
            <button type="button" onClick={() => { onReply?.(message); setMenuOpen(false); }}><Reply size={15} />Reply</button>
            <button type="button" onClick={copyMessage}><Copy size={15} />Copy</button>
            <button type="button" onClick={() => { onForward?.(message); setMenuOpen(false); }}><Forward size={15} />Forward</button>
            <div className="message-reaction-picker">{QUICK_REACTIONS.map((emoji) => <button key={emoji} type="button" onClick={() => { onReact?.(message._id, emoji, myReaction?.emoji || ""); setMenuOpen(false); }}>{emoji}</button>)}</div>
            {message?.status === "failed" && <button type="button" onClick={() => { onRetry?.(message); setMenuOpen(false); }}><Reply size={15} />Retry send</button>}
            {canEdit && <button type="button" onClick={() => { onEdit?.(message); setMenuOpen(false); }}><Pencil size={15} />Edit</button>}
            <button type="button" onClick={() => { onDeleteForMe?.(message._id); setMenuOpen(false); }}><Trash2 size={15} />Delete for me</button>
            {canDeleteEveryone && <button type="button" onClick={() => { onDeleteForEveryone?.(message._id); setMenuOpen(false); }}><Trash2 size={15} />Delete for everyone</button>}
          </div>
        )}
      </div>
    </div>
  );
}

function buildAttachmentUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(https?:|blob:|data:)/i.test(raw)) return raw;
  if (raw.startsWith("/uploads/") || raw.startsWith("/documents/")) return resolveUploadUrl(raw);
  return raw;
}

export default MessageBubble;
