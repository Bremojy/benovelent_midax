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

  return (
    <div className={own ? "message own" : "message"}>
      <div className="message-content">
        {attachment && isImage && (
          <img
            src={attachment}
            alt=""
            className="message-image"
          />
        )}

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
