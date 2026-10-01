export function applyMessageDelivered(messages, payload) {
  const messageId = String(payload?.messageId || payload || "").trim();
  if (!messageId) return messages;

  const deliveredAt = payload?.deliveredAt || new Date().toISOString();
  return (messages || []).map((item) => (
    String(item?._id || "") === messageId
      ? {
          ...item,
          delivered: true,
          deliveredAt: item.deliveredAt || deliveredAt,
          status: item.status === "sending" ? "sent" : item.status,
        }
      : item
  ));
}
