import { useEffect, useRef, useState } from "react";
import { Check, CheckCheck, Copy, Forward, Pencil, Reply, Trash2 } from "lucide-react";
import "./MessageBubble.css";
import { resolveUploadUrl } from "../../services/api";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
const LONG_PRESS_MS = 600;
const MOVE_CANCEL_PX = 8;
const ACTION_MENU_EVENT = "benevolent:message-context-open";

function MessageBubble({ message, own, currentUserId, onReply, onEdit, onDeleteForMe, onDeleteForEveryone, onReact, onForward, onRetry }) {
  const rootRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const pointerRef = useRef(null);
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

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const handleScroll = () => setMenuOpen(false);
    const handleAnotherMenu = (event) => {
      if (event?.detail?.messageId !== String(message?._id || "")) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", handleOutside, true);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("scroll", handleScroll, true);
    window.addEventListener(ACTION_MENU_EVENT, handleAnotherMenu);
    return () => {
      document.removeEventListener("pointerdown", handleOutside, true);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener(ACTION_MENU_EVENT, handleAnotherMenu);
    };
  }, [menuOpen, message?._id]);

  useEffect(() => () => clearLongPress(), []);

  function formatTime(date) {
    if (!date) return "";
    return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function clearLongPress() {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    pointerRef.current = null;
  }

  function openMenu() {
    clearLongPress();
    window.dispatchEvent(new CustomEvent(ACTION_MENU_EVENT, { detail: { messageId: String(message?._id || "") } }));
    setMenuOpen(true);
  }

  function isInteractiveTarget(target) {
    return Boolean(target?.closest?.("button,a,input,textarea,select,video,audio,[contenteditable='true']"));
  }

  function handlePointerDown(event) {
    if (!message?._id || isInteractiveTarget(event.target)) return;
    if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
    clearLongPress();
    pointerRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    longPressTimerRef.current = window.setTimeout(openMenu, LONG_PRESS_MS);
  }

  function handlePointerMove(event) {
    const start = pointerRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > MOVE_CANCEL_PX) clearLongPress();
  }

  async function copyMessage() {
    try { await navigator.clipboard.writeText(body || attachment); } catch {}
    setMenuOpen(false);
  }

  return (
    <div className={own ? "message own" : "message other"} id={message?._id ? `message-${message._id}` : undefined}>
      <div
        ref={rootRef}
        className={`message-content${menuOpen ? " message-context-open" : ""}`}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={clearLongPress}
        onPointerCancel={clearLongPress}
        onContextMenu={(event) => {
          if (isInteractiveTarget(event.target)) return;
          event.preventDefault();
          openMenu();
        }}
        onKeyDown={(event) => {
          if (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey)) {
            event.preventDefault();
            openMenu();
          }
        }}
        aria-label="Message. Use long press, right click, or the keyboard context-menu key for actions."
      >
        {message?.forwarded && <div className="message-forwarded">Forwarded</div>}
        {!own && message?.sender?.fullName && <div className="message-sender">{message.sender.fullName}</div>}

        {attachment && isImage && <a className="message-image-link" href={attachmentUrl} target="_blank" rel="noreferrer"><img src={attachmentUrl} alt="Shared attachment" className="message-image" loading="lazy" decoding="async" /></a>}
        {isAudio && attachment && <audio controls src={attachmentUrl} style={{ maxWidth: "100%" }} />}
        {isVideo && attachment && <video controls src={attachmentUrl} style={{ maxWidth: "100%", borderRadius: 12 }} />}
        {message?.deletedForEveryone ? <p className="message-deleted">This message was deleted</p> : body && <p>{body}</p>}
        {attachment && !isImage && !isAudio && !isVideo && <a className="message-file-link" href={attachmentUrl} target="_blank" rel="noreferrer">Open attachment</a>}

        {!message?.deletedForEveryone && (
          <div className="message-reaction-row">
            {(message?.reactions || []).map((reaction, index) => <button key={`${reaction.member}-${index}`} type="button" onClick={(event) => { event.stopPropagation(); onReact?.(message._id, reaction.emoji, String(reaction.member?._id || reaction.member) === String(currentUserId) ? reaction.emoji : ""); }} title={`${reaction.emoji} reaction`}>{reaction.emoji}</button>)}
          </div>
        )}

        <div className="message-footer">
          <span>{formatTime(message?.createdAt)}</span>
          {message?.edited && <span>edited</span>}
          {message?.status === "failed" && <button type="button" className="message-retry-inline" onClick={(event) => { event.stopPropagation(); onRetry?.(message); }}>Retry</button>}
          {own && <span className="status">{message?.status === "failed" ? "!" : message?.status === "sending" ? <Check size={15} /> : (message?.seenAt || (Array.isArray(message?.seenBy) && message.seenBy.length > 0)) ? <CheckCheck size={15} color="#0ea5e9" /> : message?.delivered || message?.status === "delivered" ? <CheckCheck size={15} /> : <Check size={15} />}</span>}
        </div>

        {menuOpen && (
          <div className="message-context-menu" role="menu" aria-label="Message actions" onPointerDown={(event) => event.stopPropagation()}>
            <button type="button" role="menuitem" onClick={() => { onReply?.(message); setMenuOpen(false); }}><Reply size={15} />Reply</button>
            <button type="button" role="menuitem" onClick={copyMessage}><Copy size={15} />Copy</button>
            <button type="button" role="menuitem" onClick={() => { onForward?.(message); setMenuOpen(false); }}><Forward size={15} />Forward</button>
            <div className="message-reaction-picker" aria-label="Quick reactions">{QUICK_REACTIONS.map((emoji) => <button key={emoji} type="button" aria-label={`React ${emoji}`} onClick={() => { onReact?.(message._id, emoji, myReaction?.emoji || ""); setMenuOpen(false); }}>{emoji}</button>)}</div>
            {message?.status === "failed" && <button type="button" role="menuitem" onClick={() => { onRetry?.(message); setMenuOpen(false); }}><Reply size={15} />Retry send</button>}
            {canEdit && <button type="button" role="menuitem" onClick={() => { onEdit?.(message); setMenuOpen(false); }}><Pencil size={15} />Edit</button>}
            <button type="button" role="menuitem" onClick={() => { onDeleteForMe?.(message._id); setMenuOpen(false); }}><Trash2 size={15} />Delete for me</button>
            {canDeleteEveryone && <button type="button" role="menuitem" onClick={() => { onDeleteForEveryone?.(message._id); setMenuOpen(false); }}><Trash2 size={15} />Delete for everyone</button>}
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
