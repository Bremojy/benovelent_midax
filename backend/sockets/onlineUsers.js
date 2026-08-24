const PRESENCE_TIMEOUT_MS = Math.max(45000, Number(process.env.PRESENCE_TIMEOUT_MS || 75000));
const onlineUsers = new Map();

exports.PRESENCE_TIMEOUT_MS = PRESENCE_TIMEOUT_MS;

exports.addUser = (userId, socketId, role = "member") => {
  if (!userId || !socketId) return;
  const key = String(userId);
  const now = new Date();
  const existing = onlineUsers.get(key) || {
    role: String(role || "member").toLowerCase(),
    sockets: new Set(),
    connectedAt: now,
    lastSeen: now,
    lastHeartbeat: now,
  };
  existing.role = String(role || existing.role || "member").toLowerCase();
  existing.sockets.add(String(socketId));
  existing.connectedAt = existing.connectedAt || now;
  existing.lastSeen = now;
  existing.lastHeartbeat = now;
  onlineUsers.set(key, existing);
};

exports.touchUser = (socketId) => {
  const id = String(socketId || "");
  if (!id) return null;
  for (const [userId, entry] of onlineUsers.entries()) {
    if (entry?.sockets?.has(id)) {
      const now = new Date();
      entry.lastHeartbeat = now;
      entry.lastSeen = now;
      onlineUsers.set(userId, entry);
      return { userId, lastSeen: now, online: true };
    }
  }
  return null;
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

exports.getUsers = () => {
  const now = Date.now();
  return Array.from(onlineUsers.entries())
    .filter(([, value]) => (now - new Date(value?.lastHeartbeat || value?.lastSeen || 0).getTime()) <= PRESENCE_TIMEOUT_MS)
    .map(([userId, value]) => ({
      userId,
      role: value.role,
      socketId: value.sockets?.values?.().next?.().value || "",
      connectedAt: value.connectedAt,
      lastSeen: value.lastSeen,
      lastHeartbeat: value.lastHeartbeat,
      connections: value.sockets?.size || 0,
      online: true,
    }));
};

exports.cleanupStale = () => {
  const now = Date.now();
  const stale = [];
  for (const [userId, value] of onlineUsers.entries()) {
    const heartbeatAt = new Date(value?.lastHeartbeat || value?.lastSeen || 0).getTime();
    if (!heartbeatAt || now - heartbeatAt > PRESENCE_TIMEOUT_MS) {
      stale.push({ userId, lastSeen: value?.lastSeen || new Date(), sockets: [...(value?.sockets || [])] });
      onlineUsers.delete(userId);
    }
  }
  return stale;
};
