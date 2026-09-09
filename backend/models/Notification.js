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

const fanoutOne = async (notification) => {
  if (!notification?.recipient) return;
  const room = `user:${String(notification.recipient)}`;
  try {
    const { getIO } = require("../sockets/socket");
    const io = getIO();
    if (io) {
      io.to(room).emit("new-notification", notification);
      const unread = await mongoose.model("Notification").countDocuments({
        recipient: notification.recipient,
        recipientModel: notification.recipientModel || "Member",
        read: false,
      });
      io.to(room).emit("notification-count", unread);
    }
  } catch (error) {
    console.warn("Realtime notification delivery skipped:", error.message);
  }

  if (!notification.suppressPush) {
    try {
      const { sendPushForNotification } = require("../services/pushService");
      await sendPushForNotification(notification);
    } catch (error) {
      console.warn("Notification push delivery skipped:", error.message);
    }
  }

  try {
    const redisCache = require("../services/redisCache");
    await redisCache.invalidateMany([
      `notifications:${String(notification.recipient)}:unread`,
    ]);
    await redisCache.invalidatePrefix(`notifications:${String(notification.recipient)}`);
  } catch (error) {
    console.warn("Notification cache invalidation skipped:", error.message);
  }
};

notificationSchema.post("save", async (notification) => {
  await fanoutOne(notification);
});

notificationSchema.post("insertMany", async (notifications) => {
  for (const notification of notifications || []) await fanoutOne(notification);
});

notificationSchema.post("findOneAndUpdate", async (notification) => {
  if (notification) await fanoutOne(notification);
});


const notificationFingerprint = (doc = {}) => [
  doc.recipientModel || "Member",
  doc.recipient,
  doc.type || "system",
  doc.referenceModel || "",
  doc.referenceId || "",
  doc.title || "",
  doc.message || "",
].map((value) => String(value ?? "")).join("|");

// Centralised idempotency for every Notification.create/insertMany caller,
// including older controllers that have not yet migrated to notificationService.
// This prevents exact duplicate notifications without requiring a data migration.
const NotificationModel = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
if (!NotificationModel.__midaxNotificationDedupe) {
  const originalCreate = NotificationModel.create.bind(NotificationModel);
  const originalInsertMany = NotificationModel.insertMany.bind(NotificationModel);
  NotificationModel.create = async function createDeduped(doc, ...rest) {
    if (!doc?.recipient || !doc?.title || !doc?.message) return originalCreate(doc, ...rest);
    const existing = await NotificationModel.findOne({
      recipient: doc.recipient,
      recipientModel: doc.recipientModel || "Member",
      type: doc.type || "system",
      referenceModel: doc.referenceModel || "",
      referenceId: doc.referenceId || null,
      title: doc.title,
      message: doc.message,
    }).sort({ createdAt: -1 });
    if (existing) return existing;
    return originalCreate(doc, ...rest);
  };
  NotificationModel.insertMany = async function insertManyDeduped(docs, ...rest) {
    const source = Array.isArray(docs) ? docs : [];
    const seen = new Set();
    const fresh = [];
    for (const doc of source) {
      const key = notificationFingerprint(doc);
      if (seen.has(key)) continue;
      seen.add(key);
      const existing = doc?.recipient && doc?.title && doc?.message
        ? await NotificationModel.findOne({
            recipient: doc.recipient,
            recipientModel: doc.recipientModel || "Member",
            type: doc.type || "system",
            referenceModel: doc.referenceModel || "",
            referenceId: doc.referenceId || null,
            title: doc.title,
            message: doc.message,
          }).select("_id").lean()
        : null;
      if (!existing) fresh.push(doc);
    }
    if (!fresh.length) return [];
    return originalInsertMany(fresh, ...rest);
  };
  NotificationModel.__midaxNotificationDedupe = true;
}

notificationSchema.post("deleteOne", async (result) => {
  // Queries that delete by recipient are invalidated by the controller/service;
  // this hook intentionally avoids guessing which recipient was affected.
  return result;
});

module.exports = NotificationModel;