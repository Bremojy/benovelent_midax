const onlineUsers = new Map();

exports.addUser = (userId, socketId, role = "member") => {
  if (!userId || !socketId) return;
  const key = String(userId);
  const existing = onlineUsers.get(key) || { role: String(role || "member").toLowerCase(), sockets: new Set(), connectedAt: new Date(), lastSeen: new Date() };
  existing.role = String(role || existing.role || "member").toLowerCase();
  existing.sockets.add(String(socketId));
  existing.connectedAt = existing.connectedAt || new Date();
  existing.lastSeen = new Date();
  onlineUsers.set(key, existing);
};

exports.removeUser = (socketId) => {
  const id = String(socketId || "");
  if (!id) return null;
  for (const [userId, entry] of onlineUsers.entries()) {
    if (entry?.sockets?.has(id)) {
      entry.sockets.delete(id);
      entry.lastSeen = new Date();
      if (!entry.sockets.size) onlineUsers.delete(userId);
      else onlineUsers.set(userId, entry);
      return { userId, offline: !entry.sockets.size, lastSeen: entry.lastSeen };
    }
  }
  return null;
};

exports.getSocket = (userId) => {
  const entry = onlineUsers.get(String(userId));
  return entry?.sockets?.values?.().next?.().value || null;
};
exports.getPresence = (userId) => onlineUsers.get(String(userId)) || null;
exports.getUsers = () => Array.from(onlineUsers.entries()).map(([userId, value]) => ({
  userId,
  role: value.role,
  socketId: value.sockets?.values?.().next?.().value || "",
  connectedAt: value.connectedAt,
  lastSeen: value.lastSeen,
  connections: value.sockets?.size || 0,
}));
