const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
{
   recipient: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: "recipientModel",
},

recipientModel: {
    type: String,
    enum: ["Member", "Admin", "SuperAdmin"],
    default: "Member",
},

sender: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "senderModel",
},

senderModel: {
    type: String,
    enum: ["Member", "Admin", "SuperAdmin"],
    default: "Member",
},

    title:{
        type:String,
        required:true,
        trim:true
    },

    message:{
        type:String,
        required:true,
        trim:true
    },

    type: {
    type: String,
    enum: [
        "message",
        "call",
        "audio_call",
        "video_call",
        "reaction",
        "news",
        "poll",
        "vote",
        "finance",
        "payment",
        "contribution",
        "announcement",
        "education",
        "medical",
        "funeral",
        "claim",
        "system"
    ],
    default: "system"
},

    referenceId:{
        type:mongoose.Schema.Types.ObjectId
    },

    referenceModel:{
        type:String,
        default:""
    },

    icon:{
        type:String,
        default:"notifications"
    },

    link:{
        type:String,
        default:""
    },

    metadata:{
        type:mongoose.Schema.Types.Mixed,
        default:{}
    },

    suppressPush:{
        type:Boolean,
        default:false,
        select:false
    },

    read:{
        type:Boolean,
        default:false
    },

    readAt:{
        type:Date
    }

},
{
    timestamps:true
});

notificationSchema.index({recipient:1,read:1});
notificationSchema.index({createdAt:-1});
notificationSchema.index({recipient:1,createdAt:-1});
notificationSchema.index({recipient:1,read:1,createdAt:-1});

const fanoutCreatedNotification = async (notification) => {
  if (!notification?.recipient) return;
  const room = `user:${String(notification.recipient)}`;
  try {
    const { getIO } = require("../sockets/socket");
    const io = getIO();
    if (io) {
      io.to(room).emit("new-notification", notification);
      const unread = await mongoose.model("Notification").countDocuments({ recipient: notification.recipient, recipientModel: notification.recipientModel || "Member", read: false });
      io.to(room).emit("notification-count", unread);
    }
  } catch (error) { console.warn("Realtime notification delivery skipped:", error.message); }
  if (!notification.suppressPush) {
    try {
      const { sendPushForNotification } = require("../services/pushService");
      await sendPushForNotification(notification);
    } catch (error) { console.warn("Notification push delivery skipped:", error.message); }
  }
  try {
    const redisCache = require("../services/redisCache");
    await redisCache.invalidateMany([`notifications:${String(notification.recipient)}:unread`]);
    await redisCache.invalidatePrefix(`notifications:${String(notification.recipient)}`);
  } catch (error) { console.warn("Notification cache invalidation skipped:", error.message); }
};

const emitNotificationUpdated = async (notification) => {
  if (!notification?.recipient) return;
  const room = `user:${String(notification.recipient)}`;
  try {
    const { getIO } = require("../sockets/socket");
    const io = getIO();
    if (io) {
      io.to(room).emit("notification-updated", notification);
      const unread = await mongoose.model("Notification").countDocuments({ recipient: notification.recipient, recipientModel: notification.recipientModel || "Member", read: false });
      io.to(room).emit("notification-count", unread);
    }
  } catch (error) { console.warn("Realtime notification update delivery skipped:", error.message); }
  try {
    const redisCache = require("../services/redisCache");
    await redisCache.invalidateMany([`notifications:${String(notification.recipient)}:unread`]);
    await redisCache.invalidatePrefix(`notifications:${String(notification.recipient)}`);
  } catch (error) { console.warn("Notification update cache invalidation skipped:", error.message); }
};

// Notification.save() is used by read/update paths. It must never be interpreted
// as notification creation, so there is intentionally no generic save fanout hook.
const NotificationModel = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
if (!NotificationModel.__midaxNotificationLifecycle) {
  const originalCreate = NotificationModel.create.bind(NotificationModel);
  const originalInsertMany = NotificationModel.insertMany.bind(NotificationModel);
  const notificationFingerprint = (doc) => JSON.stringify({
    recipient: doc?.recipient ? String(doc.recipient) : "",
    recipientModel: doc?.recipientModel || "Member",
    type: doc?.type || "system",
    referenceModel: doc?.referenceModel || "",
    referenceId: doc?.referenceId ? String(doc.referenceId) : "",
    title: String(doc?.title || "").trim(),
    message: String(doc?.message || "").trim(),
  });
  const fingerprintQueryFor = (doc) => ({
    recipient: doc.recipient,
    recipientModel: doc.recipientModel || "Member",
    type: doc.type || "system",
    referenceModel: doc.referenceModel || "",
    referenceId: doc.referenceId || null,
    title: doc.title,
    message: doc.message,
    createdAt: { $gte: new Date(Date.now() - 10_000) },
  });
  NotificationModel.create = async function createWithLifecycle(doc, ...rest) {
    if (Array.isArray(doc)) return NotificationModel.insertMany(doc, ...rest);
    if (!doc?.recipient || !doc?.title || !doc?.message) return originalCreate(doc, ...rest);
    const existing = await NotificationModel.findOne(fingerprintQueryFor(doc)).sort({ createdAt: -1 });
    if (existing) return existing;
    const created = await originalCreate(doc, ...rest);
    await fanoutCreatedNotification(created);
    return created;
  };
  NotificationModel.insertMany = async function insertManyWithLifecycle(docs, ...rest) {
    const source = Array.isArray(docs) ? docs : [];
    if (!source.length) return originalInsertMany(source, ...rest);
    const seen = new Set(), fresh = [], threshold = new Date(Date.now() - 10_000);
    for (const doc of source) {
      const key = notificationFingerprint(doc);
      if (seen.has(key)) continue;
      seen.add(key);
      if (!doc?.recipient || !doc?.title || !doc?.message) { fresh.push(doc); continue; }
      const existing = await NotificationModel.findOne({ ...fingerprintQueryFor(doc), createdAt: { $gte: threshold } }).select("_id").lean();
      if (!existing) fresh.push(doc);
    }
    if (!fresh.length) return [];
    const inserted = await originalInsertMany(fresh, ...rest);
    for (const notification of inserted || []) await fanoutCreatedNotification(notification);
    return inserted;
  };
  NotificationModel.__midaxNotificationLifecycle = true;
}
NotificationModel.emitNotificationUpdated = emitNotificationUpdated;
NotificationModel.fanoutCreatedNotification = fanoutCreatedNotification;

notificationSchema.post("deleteOne", async (result) => {
  // Queries that delete by recipient are invalidated by the controller/service;
  // this hook intentionally avoids guessing which recipient was affected.
  return result;
});

module.exports = NotificationModel;