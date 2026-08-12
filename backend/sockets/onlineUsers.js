const onlineUsers = new Map();

exports.addUser = (userId, socketId, role = "member") => {
  if (!userId) return;
  onlineUsers.set(String(userId), { socketId, role: String(role || "member").toLowerCase(), connectedAt: new Date() });
};

exports.removeUser = (socketId) => {
  for (const [userId, entry] of onlineUsers.entries()) {
    if (entry?.socketId === socketId) {
      onlineUsers.delete(userId);
      return userId;
    }
  }
  return null;
};

exports.getSocket = (userId) => onlineUsers.get(String(userId))?.socketId || null;
exports.getPresence = (userId) => onlineUsers.get(String(userId)) || null;
exports.getUsers = () => Array.from(onlineUsers.entries()).map(([userId, value]) => ({ userId, ...value }));
