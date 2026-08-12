const jwt = require("jsonwebtoken");
const Member = require("../models/Member");
const Admin = require("../models/Admin");
const SuperAdmin = require("../models/SuperAdmin");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const Notification = require("../models/Notification");
const { addUser, removeUser } = require("./onlineUsers");

const modelsByRole = { member: Member, admin: Admin, superadmin: SuperAdmin };

async function resolveActor(id, hintedRole = "") {
  const role = String(hintedRole || "").toLowerCase();
  if (modelsByRole[role]) {
    const user = await modelsByRole[role].findById(id).select("_id fullName role").lean();
    if (user) return { user, role };
  }
  for (const [candidateRole, Model] of Object.entries(modelsByRole)) {
    const user = await Model.findById(id).select("_id fullName role").lean();
    if (user) return { user, role: candidateRole };
  }
  return null;
}

async function savePresence(id, role, online, socketId = "") {
  const Model = modelsByRole[String(role || "member").toLowerCase()] || Member;
  await Model.findByIdAndUpdate(id, { online, socketId: online ? socketId : "", lastSeen: new Date() });
}

function broadcastPresence(io) {
  io.emit("online-users", { users: require("./onlineUsers").getUsers() });
}

module.exports = (io, socket) => {
  socket.on("user-online", async (payload) => {
    const userId = typeof payload === "string" ? payload : payload?.userId;
    const hintedRole = typeof payload === "string" ? "member" : payload?.role;
    if (!userId) return;
    try {
      const actor = await resolveActor(userId, hintedRole);
      if (!actor) return;
      socket.data.userId = String(actor.user._id);
      socket.data.role = actor.role;
      addUser(actor.user._id, socket.id, actor.role);
      socket.join(String(actor.user._id));
      await savePresence(actor.user._id, actor.role, true, socket.id);
      broadcastPresence(io);
    } catch (error) { console.warn("Could not persist online state:", error.message); }
  });

  socket.on("join-conversation", (conversationId) => { if (conversationId) socket.join(String(conversationId)); });

  socket.on("send-message", async (data) => {
    try {
      const { conversationId, sender, text, image, file, replyTo, messageType, messageId } = data || {};
      if (!conversationId) return;
      io.to(String(conversationId)).emit("new-message", { _id: messageId, conversation: conversationId, sender, message: text || "", attachment: image || file || "", messageType: messageType || (image || file ? "image" : "text"), replyTo, createdAt: new Date() });
    } catch (err) { console.warn("Message relay failed:", err.message); }
  });

  socket.on("call-user", async ({ to, conversationId, callType, offer, callerUserId, callerName, callerRole }) => {
    if (!to || !offer) return;
    const recipient = await resolveActor(to);
    const caller = await resolveActor(callerUserId || socket.data.userId, callerRole || socket.data.role);
    if (!recipient || !caller) return;
    const normalizedType = callType === "video" ? "video" : "audio";
    const notificationType = normalizedType === "video" ? "video_call" : "audio_call";
    const title = normalizedType === "video" ? "Incoming video call" : "Incoming audio call";
    const message = `${caller.user.fullName || callerName || "A member"} is calling you.`;
    try {
      await Notification.create({ recipient: recipient.user._id, recipientModel: recipient.role === "superadmin" ? "SuperAdmin" : recipient.role === "admin" ? "Admin" : "Member", sender: caller.user._id, senderModel: caller.role === "superadmin" ? "SuperAdmin" : caller.role === "admin" ? "Admin" : "Member", title, message, type: notificationType, icon: normalizedType === "video" ? "videocam" : "call" });
    } catch (error) { console.warn("Could not save call notification:", error.message); }
    io.to(String(to)).emit("incoming-call", { from: socket.id, callerUserId: String(caller.user._id), callerName: caller.user.fullName || callerName || "Member", callerRole: caller.role, conversationId, callType: normalizedType, offer });
    io.to(String(to)).emit("new-call-notification", { title, message, callType: normalizedType, callerUserId: String(caller.user._id), callerName: caller.user.fullName || callerName || "Member" });
  });

  socket.on("call-rejected", ({ to }) => { if (to) io.to(String(to)).emit("call-rejected"); });
  socket.on("call-answer", ({ to, answer }) => { if (to && answer) io.to(String(to)).emit("call-answered", { answer }); });
  socket.on("ice-candidate", ({ to, candidate }) => { if (to && candidate) io.to(String(to)).emit("ice-candidate", { candidate }); });
  socket.on("end-call", ({ to }) => { if (to) io.to(String(to)).emit("call-ended"); });

  socket.on("typing", ({ conversationId, sender }) => { if (conversationId) socket.to(String(conversationId)).emit("typing", sender); });
  socket.on("stop-typing", ({ conversationId, sender }) => { if (conversationId) socket.to(String(conversationId)).emit("stop-typing", sender); });

  socket.on("seen-message", async ({ messageId }) => {
    try { const message = await Message.findById(messageId); if (!message) return; message.seen = true; await message.save(); io.to(String(message.sender)).emit("message-seen", messageId); } catch (error) { console.warn("Seen message update failed:", error.message); }
  });

  socket.on("disconnect", async () => {
    const userId = socket.data?.userId;
    const role = socket.data?.role || "member";
    removeUser(socket.id);
    try { if (userId) await savePresence(userId, role, false, ""); } catch (error) { console.warn("Could not persist offline state:", error.message); }
    broadcastPresence(io);
  });
};
