const Member = require("../models/Member");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const Notification = require("../models/Notification");
const { getPresence } = require("./onlineUsers");
const { sendPushToRecipient } = require("../services/pushService");

const { resolveChatActor, isChatRole } = require("../utils/chatProfile");
const activeCalls = new Map();
// Canonical admin mirrors carry portalOwnerId; call/presence routing uses the same actor identity.
const CALL_TIMEOUT_MS = 35_000;

function modelName(role) {
  return role === "superadmin" ? "SuperAdmin" : role === "admin" ? "Admin" : "Member";
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
    eventId: `call:${String(callId)}:${String(recipient.user._id)}`,
    metadata: { callId: String(callId), callType, missed },
  });
  const recipientPresence = getPresence(recipient.chatId);
  const recipientIsLive = Boolean(recipientPresence?.sockets?.size);
  if (!recipientIsLive) {
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
  }
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
    } catch (error) {
    console.warn("Could not create missed call notification:", error.message);
  }
}


async function getAuthorizedConversation(socket, conversationId) {
  if (!isChatRole(socket.data?.role) || !mongooseIsValid(conversationId) || !socket.data?.chatId) return null;
  const conversation = await Conversation.findOne({ _id: conversationId, participants: socket.data.chatId, active: { $ne: false } }).lean();
  if (!conversation) return null;
  const forbidden = await Member.exists({
    _id: { $in: conversation.participants },
    $or: [{ role: "superadmin" }, { portalOwnerRole: "superadmin" }]
  });
  if (forbidden) return null;
  return conversation;
}
function mongooseIsValid(value) {
  return !!value && require("mongoose").isValidObjectId(value);
}

module.exports = (io, socket) => {
  socket.on("join-conversation", async (conversationId) => {
    try {
      const conversation = await getAuthorizedConversation(socket, conversationId);
      if (!conversation) return socket.emit("chat-error", { code: "CONVERSATION_FORBIDDEN", message: "You are not authorised to join this conversation." });
      socket.join(String(conversation._id));
      socket.emit("conversation-joined", { conversationId: String(conversation._id) });
    } catch (error) { console.warn("Conversation join failed:", error.message); }
  });

  socket.on("leave-conversation", (conversationId) => { if (conversationId) socket.leave(String(conversationId)); });



  socket.on("call-user", async ({ to, conversationId, callType, offer, callerUserId, callerName, callerRole }) => {
    if (!isChatRole(socket.data?.role) || !to || !offer) return;
    const recipient = await resolveChatActor(to);
    const caller = await resolveChatActor(socket.data.chatId || socket.data.userId, socket.data.role);
    if (!recipient || !isChatRole(recipient.role) || !caller || !isChatRole(caller.role)) {
      socket.emit("call-error", { code: "CALL_ROLE_FORBIDDEN", message: "Calling is only available between authorised member/admin chat accounts." });
      return;
    }
    if (String(recipient?.chatId || "") === String(caller?.chatId || "")) {
      socket.emit("call-error", { code: "SELF_CALL_BLOCKED", message: "Calling yourself is not available." });
      return;
    }
    if (!recipient || !caller || !isChatRole(recipient.role) || !isChatRole(caller.role)) return;
    if (conversationId) {
      const conversation = await getAuthorizedConversation(socket, conversationId);
      if (!conversation || !conversation.participants.some((id) => String(id) === String(recipient.chatId))) {
        socket.emit("call-error", { code: "CALL_CONVERSATION_FORBIDDEN", message: "You are not authorised to call this conversation participant." });
        return;
      }
    }
    const normalizedType = callType === "video" ? "video" : "audio";
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
    const active = { io, callerSocketId: socket.id, recipient, caller, recipientChatId: String(recipient.chatId), callerChatId: String(caller.chatId), callType: normalizedType, callId, conversationId: conversationId || "", incomingPayload, answered: false, missedNotified: false, summaryCreated: false, answeredAt: null, timeout: null };
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
      if (!recipientSockets.size) {
        io.to(String(caller.chatId)).emit("call-status", { callId, status: "ringing-offline", message: "The recipient is offline. A call notification was queued for their registered device." });
      }
    } catch (error) { console.warn("Could not save/deliver call notification:", error.message); }
  });

  socket.on("call-answer", async ({ to, answer, callId }) => {
    const call = callId ? activeCalls.get(String(callId)) : null;
    if (!call || !answer || !to) return;
    const actorChatId = String(socket.data?.chatId || "");
    if (![String(call.callerChatId), String(call.recipientChatId)].includes(actorChatId)) return;
    if (actorChatId !== String(call.recipientChatId)) return;
    call.answered = true;
    call.answeredAt = Date.now();
    if (call.timeout) clearTimeout(call.timeout);
    activeCalls.set(call.callId, call);
    io.to(String(call.callerSocketId)).emit("call-answered", { answer, callId: call.callId });
  });

  socket.on("call-mode-offer", async ({ offer, callId, mode }) => {
    const call = callId ? activeCalls.get(String(callId)) : null;
    if (!call || !offer) return;
    const actorChatId = String(socket.data?.chatId || "");
    if (![String(call.callerChatId), String(call.recipientChatId)].includes(actorChatId)) return;
    const target = actorChatId === String(call.callerChatId) ? call.recipientChatId : call.callerChatId;
    const normalizedMode = mode === "video" ? "video" : "audio";
    io.to(String(target)).emit("call-mode-offer", { offer, callId: call.callId, mode: normalizedMode });
  });

  socket.on("call-mode-answer", async ({ answer, callId, mode }) => {
    const call = callId ? activeCalls.get(String(callId)) : null;
    if (!call || !answer) return;
    const actorChatId = String(socket.data?.chatId || "");
    if (![String(call.callerChatId), String(call.recipientChatId)].includes(actorChatId)) return;
    const target = actorChatId === String(call.callerChatId) ? call.recipientChatId : call.callerChatId;
    const normalizedMode = mode === "video" ? "video" : "audio";
    io.to(String(target)).emit("call-mode-answer", { answer, callId: call.callId, mode: normalizedMode });
  });

  socket.on("call-rejected", async ({ callId, reason = "declined" }) => {
    const call = callId ? activeCalls.get(String(callId)) : null;
    if (!call) return;
    const actorChatId = String(socket.data?.chatId || "");
    if (![String(call.callerChatId), String(call.recipientChatId)].includes(actorChatId)) return;
    const target = actorChatId === String(call.callerChatId) ? call.recipientChatId : call.callerChatId;
    io.to(String(target)).emit("call-rejected", { callId: call.callId, reason });
    if (call) {
      if (!call.answered) {
        if (reason === "declined") {
          await recordCallSummary(call, "declined", 0);
        } else {
          await markMissedCall(call.callId, "missed");
        }
      }
      clearCall(call.callId);
    }
  });

  socket.on("ice-candidate", ({ candidate, callId }) => {
    const call = callId ? activeCalls.get(String(callId)) : null;
    if (!call || !candidate) return;
    const actorChatId = String(socket.data?.chatId || "");
    if (![String(call.callerChatId), String(call.recipientChatId)].includes(actorChatId)) return;
    const target = actorChatId === String(call.callerChatId) ? call.recipientChatId : call.callerChatId;
    io.to(String(target)).emit("ice-candidate", { candidate, callId: call.callId });
  });

  socket.on("end-call", async ({ callId }) => {
    const call = callId ? activeCalls.get(String(callId)) : null;
    if (!call) return;
    const actorChatId = String(socket.data?.chatId || "");
    if (![String(call.callerChatId), String(call.recipientChatId)].includes(actorChatId)) return;
    if (!call.answered) {
      await markMissedCall(call.callId, "missed");
    } else {
      const durationSeconds = call.answeredAt ? Math.max(0, Math.round((Date.now() - call.answeredAt) / 1000)) : 0;
      await recordCallSummary(call, "completed", durationSeconds);
    }
    const target = actorChatId === String(call.callerChatId) ? call.recipientChatId : call.callerChatId;
    io.to(String(target)).emit("call-ended", { callId: call.callId });
    clearCall(call.callId);
  });

  socket.on("typing", async ({ conversationId }) => {
    try {
      const conversation = await getAuthorizedConversation(socket, conversationId);
      if (conversation) socket.to(String(conversationId)).emit("typing", String(socket.data.chatId));
    } catch (_) {}
  });
  socket.on("stop-typing", async ({ conversationId }) => {
    try {
      const conversation = await getAuthorizedConversation(socket, conversationId);
      if (conversation) socket.to(String(conversationId)).emit("stop-typing", String(socket.data.chatId));
    } catch (_) {}
  });

  socket.on("seen-message", async ({ messageId }) => {
    if (!isChatRole(socket.data?.role)) return;
    try {
      const message = await Message.findById(messageId);
      if (!message || !socket.data?.chatId) return;
      const conversation = await Conversation.findOne({ _id: message.conversation, participants: socket.data.chatId }).select("_id").lean();
      if (!conversation) return;
      message.seenBy = Array.from(new Set([...(message.seenBy || []).map(String), String(socket.data.chatId)].filter(Boolean)));
      message.seenAt = new Date();
      message.delivered = true;
      message.deliveredAt = message.deliveredAt || new Date();
      await message.save();
      io.to(String(message.sender)).emit("message-seen", messageId);
    } catch (error) { console.warn("Seen message update failed:", error.message); }
  });

};
