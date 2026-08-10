import {
  Check,
  CheckCheck,
} from "lucide-react";

import "./MessageBubble.css";

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
          <a className="message-image-link" href={attachment} target="_blank" rel="noreferrer">
            <img
              src={attachment}
              alt="Shared attachment"
              className="message-image"
              loading="lazy"
              decoding="async"
            />
          </a>
        )}

        {isAudio && attachment && <audio controls src={attachment} style={{maxWidth:"100%"}} />}
        {isVideo && attachment && <video controls src={attachment} style={{maxWidth:"100%",borderRadius:12}} />}
        {body && <p>{body}</p>}

        {attachment && !isImage && (
          <a className="message-file-link" href={attachment} target="_blank" rel="noreferrer">
            Open attachment
          </a>
        )}

        <div className="message-footer">
          <span>{formatTime(message?.createdAt)}</span>
          {own && (
            <span className="status">
              {message?.status === "read" ? (
                <CheckCheck size={15} color="#0ea5e9" />
              ) : message?.status === "delivered" ? (
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

export default MessageBubble;
