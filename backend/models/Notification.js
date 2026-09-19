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

    eventId:{
        type:String,
        default:"",
        trim:true,
        maxlength:220
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
notificationSchema.index({eventId:1},{unique:true,sparse:true});

const notificationEventKeyExpression = {
  $cond: [
    { $ne: [{ $ifNull: ["$eventId", ""] }, ""] },
    { $concat: ["event:", "$eventId"] },
    { $concat: [
      "legacy:", { $toString: "$recipientModel" }, "|", { $toString: "$recipient" }, "|",
      { $toString: { $ifNull: ["$type", "system"] } }, "|", { $toString: { $ifNull: ["$referenceModel", ""] } }, "|",
      { $toString: { $ifNull: ["$referenceId", ""] } }, "|", { $toString: { $ifNull: ["$title", ""] } }, "|",
      { $toString: { $ifNull: ["$message", ""] } },
    ] },
  ],
};

async function getUniqueUnreadCount(recipient, recipientModel = "Member") {
  const result = await mongoose.model("Notification").aggregate([
    { $match: { recipient, recipientModel, read: false } },
    { $set: { _eventKey: notificationEventKeyExpression } },
    { $group: { _id: "$_eventKey" } },
    { $count: "unread" },
  ]);
  return Number(result?.[0]?.unread || 0);
}

const fanoutCreatedNotification = async (notification) => {
  if (!notification?.recipient) return;
  const room = `user:${String(notification.recipient)}`;
  try {
    const { getIO } = require("../sockets/socket");
    const io = getIO();
    if (io) {
      io.to(room).emit("new-notification", notification);
      const unread = await getUniqueUnreadCount(notification.recipient, notification.recipientModel || "Member");
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
      const unread = await getUniqueUnreadCount(notification.recipient, notification.recipientModel || "Member");
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
  const { buildNotificationEventId: buildEventId } = require("../services/notificationIdentity");
  NotificationModel.buildEventId = buildEventId;

  NotificationModel.create = async function createWithLifecycle(doc, ...rest) {
    if (Array.isArray(doc)) return NotificationModel.insertMany(doc, ...rest);
    if (!doc?.recipient || !doc?.title || !doc?.message) return originalCreate(doc, ...rest);
    const next = { ...doc, eventId: buildEventId(doc) };
    if (next.eventId) {
      const existing = await NotificationModel.findOne({ eventId: next.eventId }).select("_").lean();
      if (existing?._id) return NotificationModel.findById(existing._id);
    }
    try {
      const created = await originalCreate(next, ...rest);
      await fanoutCreatedNotification(created);
      return created;
    } catch (error) {
      if (error?.code === 11000 && next.eventId) {
        const existing = await NotificationModel.findOne({ eventId: next.eventId });
        if (existing) return existing;
      }
      throw error;
    }
  };

  NotificationModel.insertMany = async function insertManyWithLifecycle(docs, ...rest) {
    const source = Array.isArray(docs) ? docs : [];
    if (!source.length) return originalInsertMany(source, ...rest);
    const fresh = [];
    const seen = new Set();
    for (const doc of source) {
      if (!doc?.recipient || !doc?.title || !doc?.message) { fresh.push(doc); continue; }
      const next = { ...doc, eventId: buildEventId(doc) };
      const key = next.eventId || JSON.stringify(next);
      if (seen.has(key)) continue;
      seen.add(key);
      if (next.eventId) {
        const existing = await NotificationModel.findOne({ eventId: next.eventId }).select("_id").lean();
        if (existing?._id) continue;
      }
      fresh.push(next);
    }
    if (!fresh.length) return [];
    const inserted = [];
    for (const doc of fresh) {
      try {
        const result = await NotificationModel.create(doc);
        if (result) inserted.push(result);
      } catch (error) {
        if (error?.code === 11000 && doc.eventId) {
          const existing = await NotificationModel.findOne({ eventId: doc.eventId });
          if (existing) continue;
        }
        throw error;
      }
    }
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