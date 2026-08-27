const Notification = require("../models/Notification");
const { createNotification } = require("../services/notificationService");
const Member = require("../models/Member");
const { getActiveMembers, notifyMembers } = require("../services/memberBroadcastService");
const PushSubscription = require("../models/PushSubscription");
const { getPublicKey } = require("../services/pushService");
const { getIO } = require("../sockets/socket");
const { sendPushForNotification } = require("../services/pushService");
const redisCache = require("../services/redisCache");

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
    const __originalJson = res.json.bind(res);
    res.json = (body) => { redisCache.setJson(cacheKey, body, 10).catch(() => {}); return __originalJson(body); };

  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;
    const filter = { recipient: req.user._id };

    const [total, notifications] = await Promise.all([
      Notification.countDocuments(filter),
      Notification.find(filter)
        .populate("sender", "fullName profileImage")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return res.json({
      success: true,
      count: notifications.length,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      notifications,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =====================================================
UNREAD COUNT
===================================================== */

exports.getUnreadCount = async (req, res) => {
    const cacheKey = `notifications:${req.user._id}:unread`;
    const cached = await redisCache.getJson(cacheKey);
    if (cached !== null) return res.json(cached);
    const __originalJson = res.json.bind(res);
    res.json = (body) => { redisCache.setJson(cacheKey, body, 5).catch(() => {}); return __originalJson(body); };

  try {
    const unread = await Notification.countDocuments({
      recipient: req.user._id,
      read: false,
    });

    return res.json({
      success: true,
      unread,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
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
    await Notification.updateMany(
      {
        recipient: req.user._id,
        read: false,
      },
      {
        $set: {
          read: true,
          readAt: new Date(),
        },
      }
    );

    return res.json({
      success: true,
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
    const notification = await createNotification(req.body || {});
    if (!notification) return res.status(400).json({ success: false, message: "Notification recipient, title and message are required." });

    return res.status(201).json({
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
  try {
    const {
      title,
      message,
      smsText,
      emailHtml,
      broadcastSms = false,
      inApp = true,
    } = req.body || {};

    if (!title?.trim() || !message?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required.",
      });
    }

    const contactableMembers = await getActiveMembers({ includeEmails: true });
    const inAppMembers = inApp
      ? await Member.find({ role: "member", status: "active", isDeleted: false }).select("_id").lean()
      : [];
    const senderModel = senderModelFromUser(req.user);

    if (inApp && inAppMembers.length) {
      await Notification.insertMany(
        inAppMembers.map((member) => ({
          recipient: member._id,
          recipientModel: "Member",
          sender: req.user._id,
          senderModel,
          title: title.trim(),
          message: message.trim(),
          type: "announcement",
          icon: "campaign",
          read: false,
        }))
      );
    }

    const result = await notifyMembers({
      subject: title.trim(),
      text: message.trim(),
      html: emailHtml || `<h2>${title.trim()}</h2><p>${message.trim().replace(/\n/g, "<br>")}</p>`,
      smsText: smsText || message.trim(),
      broadcastSms: Boolean(broadcastSms),
      members: contactableMembers,
    });

    return res.status(201).json({
      success: true,
      message: "Broadcast sent successfully.",
      result,
      inAppNotifications: inApp ? inAppMembers.length : 0,
    });
  } catch (error) {
    console.error("Broadcast notification error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Unable to broadcast message.",
    });
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
    const saved=await PushSubscription.findOneAndUpdate({recipient:req.user._id,recipientModel,endpoint:String(subscription.endpoint)},{ $set:{ expirationTime:subscription.expirationTime?new Date(subscription.expirationTime):null, keys:{p256dh:String(subscription.keys.p256dh),auth:String(subscription.keys.auth)}, userAgent:String(req.headers["user-agent"]||"").slice(0,500) } },{upsert:true,returnDocument:"after",setDefaultsOnInsert:true});
    res.status(201).json({success:true,subscriptionId:saved._id});
  } catch(error){res.status(500).json({success:false,message:error.message});}
};

exports.removePushSubscription = async (req,res) => {
  try { const role=String(req.userRole||req.user?.role||"member").toLowerCase(); const recipientModel=role==="admin"?"Admin":role==="superadmin"?"SuperAdmin":"Member"; await PushSubscription.deleteMany({recipient:req.user._id,recipientModel,endpoint:String(req.body?.endpoint||"").trim()}); res.json({success:true}); }
  catch(error){res.status(500).json({success:false,message:error.message});}
};
