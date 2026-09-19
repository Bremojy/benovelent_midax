const Notification = require("../models/Notification");
const { createNotification } = require("../services/notificationService");
const Member = require("../models/Member");
const { getActiveMembers, notifyMembers } = require("../services/memberBroadcastService");
const PushSubscription = require("../models/PushSubscription");
const { getPublicKey } = require("../services/pushService");
const { getIO } = require("../sockets/socket");
const { sendPushForNotification } = require("../services/pushService");
const redisCache = require("../services/redisCache");
const Broadcast = require("../models/Broadcast");
const crypto = require("crypto");
const invalidateNotificationCaches = async (recipient) => {
  if (!recipient) return;
  await redisCache.invalidateMany([`notifications:${String(recipient)}:unread`]);
  await redisCache.invalidatePrefix(`notifications:${String(recipient)}`);
};

function senderModelFromUser(user = {}) {
  const role = String(user.role || "").toLowerCase();
  if (role === "superadmin") return "SuperAdmin";
  if (role === "admin") return "Admin";
  return "Member";
}

/* =====================================================
GET MY NOTIFICATIONS
===================================================== */

exports.getNotifications = async (req, res) => {
  const cacheKey = `notifications:${req.user._id}:${JSON.stringify(req.query || {})}`;
  const cached = await redisCache.getJson(cacheKey);
  if (cached !== null) return res.json(cached);
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;
    const filter = { recipient: req.user._id };
    const eventKey = {
      $cond: [
        { $ne: [{ $ifNull: ["$eventId", ""] }, ""] },
        { $concat: ["event:", "$eventId"] },
        { $concat: [
          "legacy:",
          { $toString: "$recipientModel" }, "|", { $toString: "$recipient" }, "|",
          { $toString: { $ifNull: ["$type", "system"] } }, "|", { $toString: { $ifNull: ["$referenceModel", ""] } }, "|",
          { $toString: { $ifNull: ["$referenceId", ""] } }, "|", { $toString: { $ifNull: ["$title", ""] } }, "|",
          { $toString: { $ifNull: ["$message", ""] } },
        ] },
      ],
    };
    const pipeline = [
      { $match: filter },
      { $set: { _eventKey: eventKey } },
      { $sort: { createdAt: -1, _id: -1 } },
      { $group: { _id: "$_eventKey", notificationId: { $first: "$_id" }, createdAt: { $first: "$createdAt" } } },
      { $sort: { createdAt: -1, notificationId: -1 } },
      { $facet: { meta: [{ $count: "total" }], items: [{ $skip: skip }, { $limit: limit }] } },
    ];
    const [result] = await Notification.aggregate(pipeline);
    const total = Number(result?.meta?.[0]?.total || 0);
    const ids = (result?.items || []).map((item) => item.notificationId);
    const docs = ids.length
      ? await Notification.find({ _id: { $in: ids } }).populate("sender", "fullName profileImage").lean()
      : [];
    const order = new Map(ids.map((id, index) => [String(id), index]));
    docs.sort((a, b) => (order.get(String(a._id)) ?? 0) - (order.get(String(b._id)) ?? 0));
    const body = { success: true, count: docs.length, total, page, pages: Math.max(1, Math.ceil(total / limit)), notifications: docs };
    await redisCache.setJson(cacheKey, body, 10).catch(() => {});
    return res.json(body);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* =====================================================
UNREAD COUNT
===================================================== */

exports.getUnreadCount = async (req, res) => {
  const cacheKey = `notifications:${req.user._id}:unread`;
  const cached = await redisCache.getJson(cacheKey);
  if (cached !== null) return res.json(cached);
  try {
    const eventKey = {
      $cond: [
        { $ne: [{ $ifNull: ["$eventId", ""] }, ""] },
        { $concat: ["event:", "$eventId"] },
        { $concat: [
          "legacy:",
          { $toString: "$recipientModel" }, "|", { $toString: "$recipient" }, "|",
          { $toString: { $ifNull: ["$type", "system"] } }, "|", { $toString: { $ifNull: ["$referenceModel", ""] } }, "|",
          { $toString: { $ifNull: ["$referenceId", ""] } }, "|", { $toString: { $ifNull: ["$title", ""] } }, "|",
          { $toString: { $ifNull: ["$message", ""] } },
        ] },
      ],
    };
    const result = await Notification.aggregate([
      { $match: { recipient: req.user._id, read: false } },
      { $set: { _eventKey: eventKey } },
      { $group: { _id: "$_eventKey" } },
      { $count: "unread" },
    ]);
    const body = { success: true, unread: Number(result?.[0]?.unread || 0) };
    await redisCache.setJson(cacheKey, body, 5).catch(() => {});
    return res.json(body);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* =====================================================
MARK AS READ
===================================================== */

exports.markRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id,
    });
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    // Read state follows the authoritative event identity so a legacy/replayed
    // duplicate cannot remain unread after the user opens the event.
    const identityFilter = notification.eventId
      ? { eventId: notification.eventId, recipient: req.user._id }
      : {
          recipient: req.user._id,
          type: notification.type,
          referenceModel: notification.referenceModel || "",
          referenceId: notification.referenceId || null,
          title: notification.title,
          message: notification.message,
        };
    await Notification.updateMany(
      identityFilter,
      { $set: { read: true, readAt: notification.readAt } }
    );
    await Notification.emitNotificationUpdated(notification);
    await invalidateNotificationCaches(req.user._id);

    return res.json({
      success: true,
      notification,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =====================================================
MARK ALL AS READ
===================================================== */

exports.markAllRead = async (req, res) => {
  try {
    const readAt = new Date();
    const unreadNotifications = await Notification.find({
      recipient: req.user._id,
      read: false,
    }).limit(1000);

    if (unreadNotifications.length) {
      const ids = unreadNotifications.map((notification) => notification._id);
      await Notification.updateMany(
        { _id: { $in: ids }, recipient: req.user._id, read: false },
        { $set: { read: true, readAt } }
      );

      // Broadcast the persisted state change so other open tabs/devices move
      // the same records into history instead of only clearing their unread list.
      await Promise.all(unreadNotifications.map(async (notification) => {
        notification.read = true;
        notification.readAt = readAt;
        await Notification.emitNotificationUpdated(notification);
      }));
    }

    await invalidateNotificationCaches(req.user._id);

    return res.json({
      success: true,
      updated: unreadNotifications.length,
      message: "All notifications marked as read.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =====================================================
CREATE NOTIFICATION
===================================================== */

exports.createNotification = async (req, res) => {
  try {
    const body = req.body || {};
    const recipient = String(body.recipient || "").trim();
    const title = String(body.title || "").trim();
    const message = String(body.message || "").trim();
    if (!recipient || !title || !message) return res.status(400).json({ success: false, message: "Notification recipient, title and message are required." });
    if (String(body.recipientModel || "Member") !== "Member") return res.status(400).json({ success: false, message: "Direct notifications may only target Member recipients." });
    if (!(await Member.exists({ _id: recipient }))) return res.status(404).json({ success: false, message: "Member recipient not found." });
    const notification = await createNotification({
      ...body,
      recipient,
      recipientModel: "Member",
      sender: req.user._id,
      senderModel: senderModelFromUser(req.user),
      title,
      message,
    });
    if (!notification) return res.status(400).json({ success: false, message: "Unable to create the notification." });
    return res.status(201).json({ success: true, notification });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* =====================================================
DELETE NOTIFICATION
===================================================== */

exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id,
    });
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    await Notification.deleteOne({ _id: notification._id });
    await invalidateNotificationCaches(req.user._id);

    return res.json({
      success: true,
      message: "Notification deleted.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =====================================================
DELETE ALL MY NOTIFICATIONS
===================================================== */

exports.clearNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({
      recipient: req.user._id,
    });
    await invalidateNotificationCaches(req.user._id);

    return res.json({
      success: true,
      message: "Notifications cleared.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =====================================================
GET SINGLE NOTIFICATION
===================================================== */

exports.getNotification = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id,
    }).populate("sender", "fullName profileImage");

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    return res.json({
      success: true,
      notification,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =====================================================
BROADCAST TO MEMBERS
===================================================== */

exports.broadcastToMembers = async (req, res) => {
  const body = req.body || {};
  const requestId = String(body.requestId || req.headers["x-request-id"] || crypto.randomUUID()).trim();
  let record;
  try {
    const { title, message, smsText, emailHtml, broadcastSms = false, inApp = true } = body;
    if (!title?.trim() || !message?.trim()) return res.status(400).json({ success: false, message: "Title and message are required." });

    const existing = await Broadcast.findOne({ requestId });
    if (existing?.status === "completed") {
      return res.status(200).json({
        success: true,
        duplicate: true,
        message: "This broadcast was already processed.",
        result: {
          membersCount: existing.targetedUsers,
          emailResult: { sent: existing.emailSent, attempted: existing.emailAttempted, failed: Math.max(0, existing.emailAttempted - existing.emailSent) },
          smsResult: { sent: existing.smsSent, attempted: existing.smsAttempted, failed: existing.smsFailed, skipped: existing.smsEnabled ? undefined : "sms-disabled" },
          pushResult: { sent: existing.pushSent, skipped: existing.pushSkipped, failed: existing.pushFailed },
        },
        inAppNotifications: existing.inAppSent,
        broadcast: {
          requestId, targetedUsers: existing.targetedUsers, inAppSent: existing.inAppSent,
          pushSent: existing.pushSent, pushSkipped: existing.pushSkipped, pushFailed: existing.pushFailed,
          emailSent: existing.emailSent, emailAttempted: existing.emailAttempted, emailSkipped: Math.max(0, existing.emailAttempted - existing.emailSent),
          smsSent: existing.smsSent, smsAttempted: existing.smsAttempted, smsSkipped: Math.max(0, existing.smsAttempted - existing.smsSent), smsFailed: existing.smsFailed,
        },
      });
    }
    if (existing?.status === "processing") {
      return res.status(409).json({ success: false, code: "BROADCAST_IN_PROGRESS", message: "This broadcast request is already being processed.", requestId });
    }

    try {
      record = existing || await Broadcast.create({ requestId, sender: req.user._id, senderModel: senderModelFromUser(req.user), title: title.trim(), message: message.trim(), smsEnabled: Boolean(broadcastSms) });
    } catch (createError) {
      if (createError?.code !== 11000) throw createError;
      const raced = await Broadcast.findOne({ requestId });
      if (raced?.status === "completed") return res.status(200).json({ success: true, duplicate: true, message: "This broadcast was already processed.", requestId });
      return res.status(409).json({ success: false, code: "BROADCAST_IN_PROGRESS", message: "This broadcast request is already being processed.", requestId });
    }

    const contactableMembers = await getActiveMembers({ includeEmails: true });
    const inAppMembers = inApp ? await Member.find({ role: "member", status: "active", isDeleted: false }).select("_id").lean() : [];
    const senderModel = senderModelFromUser(req.user);

    let inAppSent = 0;
    let pushSent = 0;
    let pushSkipped = 0;
    let pushFailed = 0;
    if (inApp && inAppMembers.length) {
      const notifications = inAppMembers.map((member) => ({
        recipient: member._id, recipientModel: "Member", sender: req.user._id, senderModel,
        title: title.trim(), message: message.trim(), type: "announcement", icon: "campaign", read: false,
        eventId: `broadcast:${requestId}:${String(member._id)}`, referenceId: record._id, referenceModel: "Broadcast",
        metadata: { broadcastId: String(record._id), requestId }, suppressPush: true,
      }));
      const inserted = await Notification.insertMany(notifications);
      inAppSent = inserted.length;
      if (inserted.length) {
        const pushResults = await Promise.all(inserted.map(async (notification) => {
          try {
            const result = await sendPushForNotification(notification);
            if (result?.sent) return "sent";
            if (Number(result?.failed || 0) > 0) return "failed";
            return "skipped";
          } catch (_) { return "failed"; }
        }));
        pushSent = pushResults.filter((r) => r === "sent").length;
        pushSkipped = pushResults.filter((r) => r === "skipped").length;
        pushFailed = pushResults.filter((r) => r === "failed").length;
      }
    }

    const result = await notifyMembers({ subject: title.trim(), text: message.trim(), html: emailHtml || `<h2>${title.trim()}</h2><p>${message.trim().replace(/\n/g, "<br>")}</p>`, smsText: smsText || message.trim(), broadcastSms: Boolean(broadcastSms), members: contactableMembers });
    const emailSent = Number(result?.emailResult?.sent || 0);
    const emailAttempted = Number(result?.emailResult?.attempted || 0);
    const emailFailed = Number(result?.emailResult?.failed || Math.max(0, emailAttempted - emailSent));
    const emailSkipped = Number.isFinite(Number(result?.emailResult?.skipped)) ? Number(result.emailResult.skipped) : Math.max(0, emailAttempted - emailSent - emailFailed);
    const smsSent = Number(result?.smsResult?.sent || 0);
    const smsAttempted = Number(result?.smsResult?.attempted || 0);
    const smsFailed = Number(result?.smsResult?.failed || 0);
    const smsSkipped = Number.isFinite(Number(result?.smsResult?.skipped)) ? Number(result.smsResult.skipped) : Math.max(0, smsAttempted - smsSent - smsFailed);

    await Broadcast.findByIdAndUpdate(record._id, {
      targetedUsers: inApp ? inAppMembers.length : contactableMembers.length,
      inAppSent, pushSent, pushSkipped, pushFailed,
      emailSent, emailAttempted,
      smsSent, smsAttempted, smsFailed,
      smsEnabled: Boolean(broadcastSms), completedAt: new Date(), status: "completed", error: "",
    });
    return res.status(201).json({
      success: true,
      message: "Broadcast sent successfully.",
      result: { ...result, emailResult: { ...result.emailResult, attempted: emailAttempted, sent: emailSent, skipped: emailSkipped, failed: emailFailed }, smsResult: { ...result.smsResult, attempted: smsAttempted, sent: smsSent, skipped: smsSkipped, failed: smsFailed }, pushResult: { sent: pushSent, skipped: pushSkipped, failed: pushFailed } },
      inAppNotifications: inAppSent,
      broadcast: {
        requestId, targetedUsers: inApp ? inAppMembers.length : contactableMembers.length, inAppSent,
        pushSent, pushSkipped, pushFailed,
        emailSent, emailAttempted, emailSkipped, emailFailed,
        smsSent, smsAttempted, smsSkipped, smsFailed,
      },
    });
  } catch (error) {
    console.error("Broadcast notification error:", error.message);
    if (record?._id) await Broadcast.findByIdAndUpdate(record._id, { status: "failed", error: String(error.message || error).slice(0, 2000) }).catch(() => {});
    return res.status(500).json({ success: false, message: error.message || "Unable to broadcast message.", requestId });
  }
};

/* =====================================================
COMPATIBILITY ALIASES
===================================================== */

exports.markAsRead = exports.markRead;
exports.markAllAsRead = exports.markAllRead;


exports.getPushPublicKey = async (_req,res) => { const publicKey=getPublicKey(); return res.json({ success:true, configured:Boolean(publicKey), publicKey:publicKey||null, message: publicKey ? "Browser push is configured." : "Browser push is not configured on the server." }); };

exports.savePushSubscription = async (req,res) => {
  try {
    const subscription=req.body?.subscription||req.body;
    if(!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) return res.status(400).json({success:false,message:"A valid browser push subscription is required."});
    const role=String(req.userRole||req.user?.role||"member").toLowerCase();
    const recipientModel=role==="admin"?"Admin":role==="superadmin"?"SuperAdmin":"Member";
    const saved=await PushSubscription.findOneAndUpdate({recipient:req.user._id,recipientModel,endpoint:String(subscription.endpoint)},{ $set:{ expirationTime:(subscription.expirationTime && !Number.isNaN(new Date(subscription.expirationTime).getTime())) ? new Date(subscription.expirationTime) : null, keys:{p256dh:String(subscription.keys.p256dh),auth:String(subscription.keys.auth)}, userAgent:String(req.headers["user-agent"]||"").slice(0,500) } },{upsert:true,returnDocument:"after",setDefaultsOnInsert:true});
    res.status(201).json({success:true,subscriptionId:saved._id});
  } catch(error){res.status(500).json({success:false,message:error.message});}
};

exports.removePushSubscription = async (req,res) => {
  try { const role=String(req.userRole||req.user?.role||"member").toLowerCase(); const recipientModel=role==="admin"?"Admin":role==="superadmin"?"SuperAdmin":"Member"; await PushSubscription.deleteMany({recipient:req.user._id,recipientModel,endpoint:String(req.body?.endpoint||"").trim()}); res.json({success:true}); }
  catch(error){res.status(500).json({success:false,message:error.message});}
};
