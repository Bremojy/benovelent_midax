const Member = require("../models/Member");
const Admin = require("../models/Admin");
const SuperAdmin = require("../models/SuperAdmin");
const { addUser, removeUser, touchUser, getUsers, cleanupStale, PRESENCE_TIMEOUT_MS } = require("./onlineUsers");

const modelsByRole = { member: Member, admin: Admin, superadmin: SuperAdmin };
let cleanupTimer;

const roleModelName = (role) => role === "superadmin" ? "SuperAdmin" : role === "admin" ? "Admin" : "Member";

async function savePresence(socket, online) {
  const userId = socket.user?._id || socket.data?.userId;
  if (!userId) return;
  const role = String(socket.userRole || socket.data?.role || "member").toLowerCase();
  const Model = modelsByRole[role];
  if (!Model) return;
  const now = new Date();
  const update = online ? { online: true, socketId: socket.id, lastSeen: now } : { online: false, socketId: "", lastSeen: now };
  await Model.findByIdAndUpdate(userId, update);

  // Admin chat uses a Member mirror; keep that mirror in sync with the portal
  // owner's authoritative live state. SuperAdmin has no chat mirror.
  const chatId = socket.data?.chatId;
  if (role === "admin" && chatId && String(chatId) !== String(userId)) {
    await Member.findByIdAndUpdate(chatId, update);
  }
}

function broadcastPresence(io) {
  io.emit("online-users", { users: getUsers(), presenceTimeoutMs: PRESENCE_TIMEOUT_MS });
}

function ensurePresenceCleanup(io) {
  if (cleanupTimer) return;
  const intervalMs = Math.max(15000, Math.round(PRESENCE_TIMEOUT_MS / 3));
  cleanupTimer = setInterval(() => {
    const stale = cleanupStale();
    if (!stale.length) return;
    Promise.all(stale.map(async ({ userId, role: staleRole, portalOwnerId }) => {
      const role = String(staleRole || "member").toLowerCase();
      const Model = modelsByRole[role];
      const now = new Date();
      const ownerId = String(portalOwnerId || userId);
      if (Model) await Model.findByIdAndUpdate(ownerId, { online: false, socketId: "", lastSeen: now }).catch(() => {});
      // Admin chat uses the canonical Member mirror as a separate chat identity.
      // Stale cleanup must update that mirror without trying to infer identity from
      // a cross-collection ID lookup. SuperAdmin has no chat mirror.
      if (role === "admin" && String(userId) !== ownerId) {
        await Member.findByIdAndUpdate(String(userId), { online: false, socketId: "", lastSeen: now }).catch(() => {});
      }
    })).finally(() => broadcastPresence(io)).catch(() => {});
  }, intervalMs);
  cleanupTimer.unref?.();
}

module.exports = function registerPresence(io, socket) {
  ensurePresenceCleanup(io);

  const goOnline = async () => {
    try {
      const role = String(socket.userRole || socket.data?.role || "member").toLowerCase();
      if (!modelsByRole[role]) return;
      const userId = String(socket.user?._id || socket.data?.userId || "");
      if (!userId) return;
      const presenceId = String(socket.data?.chatId || userId);
      addUser(presenceId, socket.id, role, userId);
      await savePresence(socket, true);
      broadcastPresence(io);
    } catch (error) {
      console.warn("Could not persist online state:", error.message);
    }
  };

  const heartbeat = async () => {
    try {
      const touched = touchUser(socket.id);
      if (!touched) {
        socket.emit("presence-required");
        return;
      }
      await savePresence(socket, true);
    } catch (error) {
      console.warn("Presence heartbeat failed:", error.message);
    }
  };

  socket.on("user-online", goOnline);
  socket.on("presence-heartbeat", heartbeat);

  // Register presence immediately after authentication so the portal does not
  // depend on a chat page being mounted before it can become online.
  goOnline();

  socket.on("disconnect", async () => {
    const removed = removeUser(socket.id);
    try {
      if (removed?.offline) await savePresence(socket, false);
      broadcastPresence(io);
    } catch (error) {
      console.warn("Could not persist offline state:", error.message);
    }
  });
};

module.exports.roleModelName = roleModelName;
