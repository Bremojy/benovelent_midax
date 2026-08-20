import {
  Check,
  CheckCheck,
} from "lucide-react";

import "./MessageBubble.css";
import { resolveUploadUrl } from "../../services/api";

function MessageBubble({
  message,
  own,
}) {
  function formatTime(date) {
    if (!date) return "";
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const body = message?.message || message?.text || "";
  const attachment = message?.attachment || message?.image || "";
  const attachmentUrl = buildAttachmentUrl(attachment);
  const isImage = message?.messageType === "image" || /\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/i.test(attachment);
  const isAudio = message?.messageType === "audio";
  const isVideo = message?.messageType === "video";

  return (
    <div className={own ? "message own" : "message other"}>
      <div className="message-content">
        {!own && message?.sender?.fullName && (
          <div className="message-sender">{message.sender.fullName}</div>
        )}

        {attachment && isImage && (
          <a className="message-image-link" href={attachmentUrl} target="_blank" rel="noreferrer">
            <img
              src={attachmentUrl}
              alt="Shared attachment"
              className="message-image"
              loading="lazy"
              decoding="async"
            />
          </a>
        )}

        {isAudio && attachment && <audio controls src={attachmentUrl} style={{maxWidth:"100%"}} />}
        {isVideo && attachment && <video controls src={attachmentUrl} style={{maxWidth:"100%",borderRadius:12}} />}
        {message?.deletedForEveryone ? <p className="message-deleted">This message was deleted</p> : body && <p>{body}</p>}

        {attachment && !isImage && (
          <a className="message-file-link" href={attachmentUrl} target="_blank" rel="noreferrer">
            Open attachment
          </a>
        )}

        <div className="message-footer">
          <span>{formatTime(message?.createdAt)}</span>
          {own && (
            <span className="status">
              {message?.status === "sending" ? (
                <Check size={15} />
              ) : (message?.seenAt || (Array.isArray(message?.seenBy) && message.seenBy.length > 0)) ? (
                <CheckCheck size={15} color="#0ea5e9" />
              ) : message?.delivered || message?.status === "delivered" ? (
                <CheckCheck size={15} />
              ) : (
                <Check size={15} />
              )}
            </span>
          )}
        </div>
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
