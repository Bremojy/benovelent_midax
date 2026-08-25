const Member = require("../models/Member");
const Admin = require("../models/Admin");
const SuperAdmin = require("../models/SuperAdmin");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const Notification = require("../models/Notification");
const { addUser, removeUser, touchUser, getPresence, cleanupStale, PRESENCE_TIMEOUT_MS } = require("./onlineUsers");
const { sendPushToRecipient } = require("../services/pushService");

const modelsByRole = { member: Member, admin: Admin, superadmin: SuperAdmin };
const isChatRole = (role) => ["member", "admin"].includes(String(role || "").toLowerCase());
const activeCalls = new Map();
const CALL_TIMEOUT_MS = 35_000;

async function resolveActor(id, hintedRole = "") {
  const requestedRole = String(hintedRole || "").toLowerCase();
  const chatId = String(id || "").trim();
  if (!chatId) return null;

  async function fromPortal(Model, role) {
    const owner = await Model.findById(chatId).select("_id fullName name role profileImage email phone online lastSeen").lean();
    if (owner) return { user: owner, role, chatId: String(owner._id) };
    const profile = await Member.findOne({ _id: chatId, portalOwnerRole: role, portalOwnerId: { $ne: null } }).select("_id portalOwnerId portalOwnerRole fullName profileImage online lastSeen").lean();
    if (!profile) return null;
    const portalOwner = await Model.findById(profile.portalOwnerId).select("_id fullName name role profileImage email phone online lastSeen").lean();
    if (!portalOwner) return null;
    return { user: portalOwner, role, chatId: String(profile._id) };
  }

  if (requestedRole === "admin") {
    const result = await fromPortal(Admin, "admin");
    if (result) return result;
  }
  if (requestedRole === "superadmin") {
    const result = await fromPortal(SuperAdmin, "superadmin");
    if (result) return result;
  }
  if (requestedRole === "member") {
    const member = await Member.findById(chatId).select("_id fullName name role profileImage email phone online lastSeen portalOwnerId portalOwnerRole").lean();
    if (member) return { user: member, role: member.portalOwnerRole || "member", chatId: String(member._id) };
  }

  const member = await Member.findById(chatId).select("_id fullName name role profileImage email phone online lastSeen portalOwnerId portalOwnerRole").lean();
  if (member) {
    if (member.portalOwnerId && member.portalOwnerRole === "admin") {
      const admin = await Admin.findById(member.portalOwnerId).select("_id fullName name role profileImage email phone online lastSeen").lean();
      if (admin) return { user: admin, role: "admin", chatId: String(member._id) };
    }
    if (member.portalOwnerId && member.portalOwnerRole === "superadmin") {
      const superadmin = await SuperAdmin.findById(member.portalOwnerId).select("_id fullName name role profileImage email phone online lastSeen").lean();
      if (superadmin) return { user: superadmin, role: "superadmin", chatId: String(member._id) };
    }
    return { user: member, role: "member", chatId: String(member._id) };
  }

  for (const [candidateRole, Model] of Object.entries(modelsByRole)) {
    const user = await Model.findById(chatId).select("_id fullName name role profileImage email phone online lastSeen").lean();
    if (user) return { user, role: candidateRole, chatId: String(user._id) };
  }
  return null;
}

function modelName(role) {
  return role === "superadmin" ? "SuperAdmin" : role === "admin" ? "Admin" : "Member";
}

async function savePresence(actor, online, socketId = "") {
  if (!actor?.user?._id) return;
  const Model = modelsByRole[String(actor.role || "member").toLowerCase()] || Member;
  const update = online
    ? { online: true, socketId, lastSeen: new Date() }
    : { online: false, socketId: "", lastSeen: new Date() };
  await Model.findByIdAndUpdate(actor.user._id, update).catch(() => null);
  if (actor.chatId && String(actor.chatId) !== String(actor.user._id)) {
    await Member.findByIdAndUpdate(actor.chatId, update).catch(() => null);
  }
}

function broadcastPresence(io) {
  io.emit("online-users", { users: require("./onlineUsers").getUsers(), presenceTimeoutMs: PRESENCE_TIMEOUT_MS });
}

let presenceCleanupStarted = false;
function ensurePresenceCleanup(io) {
  if (presenceCleanupStarted) return;
  presenceCleanupStarted = true;
  const intervalMs = Math.max(15000, Math.round(PRESENCE_TIMEOUT_MS / 3));
  setInterval(() => {
    const stale = cleanupStale();
    if (!stale.length) return;
    Promise.all(stale.map(async ({ userId, lastSeen }) => {
      const actor = await resolveActor(userId);
      if (actor) await savePresence(actor, false, "").catch(() => null);
      return lastSeen;
    })).finally(() => broadcastPresence(io)).catch(() => null);
  }, intervalMs).unref?.();
}

async function deliverCallNotification({ recipient, caller, callType, title, message, callId, incomingPayload, missed = false }) {
  const recipientModel = modelName(recipient.role);
  const callerModel = modelName(caller.role);
  const type = missed ? "call" : callType === "video" ? "video_call" : "audio_call";
  const notification = await Notification.create({
    recipient: recipient.user._id,
    recipientModel,
    sender: caller.user._id,
    senderModel: callerModel,
    title,
    message,
    type,
    icon: callType === "video" ? "videocam" : "call",
    // The push is sent explicitly below so one call never produces duplicate
    // notifications from both the Mongoose hook and this realtime flow.
    suppressPush: true,
    referenceId: undefined,
    referenceModel: "Call",
  });
  await sendPushToRecipient({
    recipient: recipient.user._id,
    recipientModel,
    title,
    message,
    link: recipient.role === "admin" ? "/admin/messages" : "/member/messages",
    data: {
      type: missed ? "missed_call" : "incoming_call",
      callType,
      incomingCall: !missed,
      missedCall: missed,
      role: recipient.role,
      callId,
      callerUserId: String(caller.chatId),
      callerName: caller.user.fullName || caller.user.name || "Member",
      callerRole: caller.role,
      incomingPayload: missed ? undefined : incomingPayload,
    },
  }).catch((error) => console.warn("Call push skipped:", error.message));
  return notification;
}

async function recordCallSummary(call, status = "completed", durationSeconds = 0) {
  if (!call?.conversationId || !call?.caller?.chatId || !call?.recipient?.chatId || call.summaryCreated) return null;
  call.summaryCreated = true;
  activeCalls.set(call.callId, call);
  try {
    const conversation = await Conversation.findOne({
      _id: call.conversationId,
      participants: { $all: [call.caller.chatId, call.recipient.chatId] },
    });
    if (!conversation) return null;
    const safeDuration = Math.max(0, Math.round(Number(durationSeconds) || 0));
    const mins = String(Math.floor(safeDuration / 60)).padStart(2, "0");
    const secs = String(safeDuration % 60).padStart(2, "0");
    const typeLabel = call.callType === "video" ? "Video call" : "Audio call";
    const statusLabel = status === "completed" ? `${typeLabel} • ${mins}:${secs}` : status === "declined" ? `${typeLabel} • Declined` : `${typeLabel} • Missed`;
    const summary = await Message.create({
      conversation: conversation._id,
      sender: call.caller.chatId,
      message: statusLabel,
      messageType: "call",
      callType: call.callType,
      callStatus: status,
      callDurationSeconds: safeDuration,
    });
    await summary.populate("sender", "fullName profileImage online lastSeen");
    conversation.lastMessage = summary._id;
    conversation.lastMessageText = statusLabel;
    conversation.lastMessageSender = call.caller.chatId;
    conversation.lastMessageTime = new Date();
    await conversation.save();
    call.io.to(String(conversation._id)).emit("new-message", summary);
    return summary;
  } catch (error) {
    call.summaryCreated = false;
    activeCalls.set(call.callId, call);
    console.warn("Call summary creation failed:", error.message);
    return null;
  }
}

function clearCall(callId) {
  const call = activeCalls.get(callId);
  if (call?.timeout) clearTimeout(call.timeout);
  activeCalls.delete(callId);
  return call;
}

async function markMissedCall(callId, reason = "missed") {
  const call = activeCalls.get(callId);
  if (!call || call.answered || call.missedNotified) return;
  call.missedNotified = true;
  activeCalls.set(callId, call);
  try {
    const notification = await deliverCallNotification({
      recipient: call.recipient,
      caller: call.caller,
      callType: call.callType,
      title: call.callType === "video" ? "Missed video call" : "Missed audio call",
      message: `${call.caller.user.fullName || call.caller.user.name || "A member"} ${reason === "declined" ? "called you" : "tried to call you"}.`,
      callId,
      incomingPayload: call.incomingPayload,
      missed: true,
    });
    const io = call.io;
    io?.to(String(call.recipientChatId)).emit("missed-call", { notification, callId, callType: call.callType, callerUserId: String(call.caller.chatId), callerName: call.caller.user.fullName || call.caller.user.name || "Member" });
    io?.to(`user:${String(call.recipientChatId)}`).emit("new-notification", notification);
  } catch (error) {
    console.warn("Could not create missed call notification:", error.message);
  }
}

module.exports = (io, socket) => {
  ensurePresenceCleanup(io);

  socket.on("user-online", async () => {
    try {
      const role = socket.userRole || "member";
      if (!isChatRole(role)) return;
      const actor = await resolveActor(socket.user?._id, role);
      if (!actor) return;
      socket.data.userId = String(actor.user._id);
      socket.data.chatId = String(actor.chatId);
      socket.data.role = actor.role;
      addUser(actor.chatId, socket.id, actor.role);
      socket.join(String(actor.chatId));
      if (String(actor.user._id) !== String(actor.chatId)) socket.join(String(actor.user._id));
      await savePresence(actor, true, socket.id);
      broadcastPresence(io);
    } catch (error) { console.warn("Could not persist online state:", error.message); }
  });

  socket.on("presence-heartbeat", async () => {
    try {
      const touched = touchUser(socket.id);
      if (!touched) {
        socket.emit("presence-required");
        return;
      }
      const actor = await resolveActor(socket.data?.userId, socket.data?.role || "member");
      if (actor) await savePresence(actor, true, socket.id);
    } catch (error) {
      console.warn("Presence heartbeat failed:", error.message);
    }
  });

  socket.on("join-conversation", (conversationId) => { if (isChatRole(socket.data?.role) && conversationId) socket.join(String(conversationId)); });



  socket.on("call-user", async ({ to, conversationId, callType, offer, callerUserId, callerName, callerRole }) => {
    if (!isChatRole(socket.data?.role) || !to || !offer) return;
    const recipient = await resolveActor(to);
    const caller = await resolveActor(callerUserId || socket.data.userId, callerRole || socket.data.role);
    if (!recipient || !caller || !isChatRole(recipient.role) || !isChatRole(caller.role)) return;
    const normalizedType = callType === "video" ? "video" : "audio";
    if (String(recipient.chatId) === String(caller.chatId)) {
      socket.emit("call-error", { code: "SELF_CALL_BLOCKED", message: "Calling yourself is not available." });
      return;
    }
    const title = normalizedType === "video" ? "Incoming video call" : "Incoming audio call";
    const message = `${caller.user.fullName || caller.user.name || callerName || "A member"} is calling you.`;
    const callId = `${String(caller.user._id)}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const incomingPayload = {
      from: String(caller.chatId),
      callerSocketId: socket.id,
      callerUserId: String(caller.chatId),
      callerName: caller.user.fullName || caller.user.name || callerName || "Member",
      callerRole: caller.role,
      role: recipient.role,
      callerProfileImage: caller.user.profileImage || "",
      conversationId: conversationId || "",
      callType: normalizedType,
      offer,
      callId,
    };
    const active = { io, recipient, caller, recipientChatId: String(recipient.chatId), callerChatId: String(caller.chatId), callType: normalizedType, callId, conversationId: conversationId || "", incomingPayload, answered: false, missedNotified: false, summaryCreated: false, answeredAt: null, timeout: null };
    active.timeout = setTimeout(() => {
      void markMissedCall(callId, "missed");
      void recordCallSummary(activeCalls.get(callId), "missed", 0);
      io.to(String(caller.chatId)).emit("call-ended", { callId, reason: "timeout" });
      io.to(String(recipient.chatId)).emit("call-ended", { callId, reason: "timeout" });
      clearCall(callId);
    }, CALL_TIMEOUT_MS);
    activeCalls.set(callId, active);

    try {
      const notification = await deliverCallNotification({ recipient, caller, callType: normalizedType, title, message, callId, incomingPayload, missed: false });
      const recipientChatRoom = String(recipient.chatId);
      const recipientPortalRoom = String(recipient.user?._id || "");
      io.to(String(caller.chatId)).emit("call-started", { callId, recipientUserId: recipientChatRoom, callType: normalizedType });

      // Deliver only to the intended recipient's authenticated sockets.
      // Do not broadcast to generic ID rooms: mirrored Admin/SuperAdmin chat
      // profiles can otherwise cause the caller to receive their own alert.
      const recipientSockets = new Set();
      for (const targetId of [recipientChatRoom, recipientPortalRoom]) {
        const presence = getPresence(targetId);
        for (const socketId of presence?.sockets || []) recipientSockets.add(String(socketId));
      }
      recipientSockets.forEach((socketId) => io.to(socketId).emit("incoming-call", incomingPayload));

      const callNotification = { title, message, callType: normalizedType, callId, callerUserId: String(caller.chatId), callerName: incomingPayload.callerName, notification };
      recipientSockets.forEach((socketId) => io.to(socketId).emit("new-call-notification", callNotification));
    } catch (error) { console.warn("Could not save/deliver call notification:", error.message); }
  });

  socket.on("call-answer", async ({ to, answer, callId }) => {
    const call = callId ? activeCalls.get(String(callId)) : null;
    if (call) {
      call.answered = true;
      call.answeredAt = Date.now();
      if (call.timeout) clearTimeout(call.timeout);
      activeCalls.set(call.callId, call);
    }
    if (to && answer) io.to(String(to)).emit("call-answered", { answer, callId: callId || "" });
  });

  socket.on("call-mode-offer", async ({ to, offer, callId, mode }) => {
    if (!to || !offer) return;
    const normalizedMode = mode === "video" ? "video" : "audio";
    io.to(String(to)).emit("call-mode-offer", {
      offer,
      callId: callId || "",
      mode: normalizedMode,
    });
  });

  socket.on("call-mode-answer", async ({ to, answer, callId, mode }) => {
    if (!to || !answer) return;
    const normalizedMode = mode === "video" ? "video" : "audio";
    io.to(String(to)).emit("call-mode-answer", {
      answer,
      callId: callId || "",
      mode: normalizedMode,
    });
  });

  socket.on("call-rejected", async ({ to, callId, reason = "declined" }) => {
    const call = callId ? activeCalls.get(String(callId)) : null;
    if (to) io.to(String(to)).emit("call-rejected", { callId: callId || "", reason });
    if (call) {
      if (!call.answered) {
        await markMissedCall(call.callId, reason === "declined" ? "declined" : "missed");
        if (reason === "declined") await recordCallSummary(call, "declined", 0);
      }
      clearCall(call.callId);
    }
  });

  socket.on("ice-candidate", ({ to, candidate }) => { if (to && candidate) io.to(String(to)).emit("ice-candidate", { candidate }); });

  socket.on("end-call", async ({ to, callId }) => {
    const call = callId ? activeCalls.get(String(callId)) : null;
    if (call) {
      if (!call.answered) {
        await markMissedCall(call.callId, "missed");
      } else {
        const durationSeconds = call.answeredAt ? Math.max(0, Math.round((Date.now() - call.answeredAt) / 1000)) : 0;
        await recordCallSummary(call, "completed", durationSeconds);
      }
    }
    if (to) io.to(String(to)).emit("call-ended", { callId: callId || "" });
    if (call) clearCall(call.callId);
  });

  socket.on("typing", ({ conversationId, sender }) => { if (isChatRole(socket.data?.role) && conversationId) socket.to(String(conversationId)).emit("typing", sender); });
  socket.on("stop-typing", ({ conversationId, sender }) => { if (isChatRole(socket.data?.role) && conversationId) socket.to(String(conversationId)).emit("stop-typing", sender); });

  socket.on("seen-message", async ({ messageId }) => {
    if (!isChatRole(socket.data?.role)) return;
    try {
      const message = await Message.findById(messageId);
      if (!message) return;
      message.seenBy = Array.from(new Set([...(message.seenBy || []).map(String), String(socket.data.userId || "")].filter(Boolean)));
      message.seenAt = new Date();
      message.delivered = true;
      message.deliveredAt = message.deliveredAt || new Date();
      await message.save();
      io.to(String(message.sender)).emit("message-seen", messageId);
    } catch (error) { console.warn("Seen message update failed:", error.message); }
  });

  socket.on("disconnect", async () => {
    const userId = socket.data?.userId;
    const chatId = socket.data?.chatId || userId;
    const role = socket.data?.role || "member";
    const removed = removeUser(socket.id);
    try {
      if (userId && removed?.offline) {
        const actor = await resolveActor(chatId, role);
        if (actor) await savePresence(actor, false, "");
      }
      broadcastPresence(io);
    } catch (error) { console.warn("Could not persist offline state:", error.message); }
  });
};
