const webpush = require("web-push");
const crypto = require("crypto");
const PushSubscription = require("../models/PushSubscription");

let configured = false;
function configure() {
  if (configured) return true;
  const publicKey = String(process.env.VAPID_PUBLIC_KEY || "").trim();
  const privateKey = String(process.env.VAPID_PRIVATE_KEY || "").trim();
  const subject = String(process.env.VAPID_SUBJECT || "mailto:admin@midax.co.ke").trim();
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey); configured = true; return true;
}
function getPublicKey() { return String(process.env.VAPID_PUBLIC_KEY || "").trim(); }
const subscriptionIdentity = (endpoint) => crypto.createHash("sha256").update(String(endpoint || "")).digest("hex").slice(0, 12);
const endpointHost = (endpoint) => {
  try { return new URL(String(endpoint || "")).host || "invalid"; }
  catch { return "invalid"; }
};

async function sendPushToRecipient({ recipient, recipientModel = "Member", title, message, link = "/", data = {} }) {
  if (!configure() || !recipient || !title || !message) return { sent: 0, skipped: "push-not-configured" };
  let subscriptions = [];
  try {
    subscriptions = await PushSubscription.find({ recipient, recipientModel }).lean();
  } catch (error) {
    console.warn("[push][lookup-failed]", { recipient: String(recipient), recipientModel, type: String(data?.type || "notification"), message: String(error?.message || "subscription lookup failed").slice(0, 300) });
    return { sent: 0, removed: 0, subscriptions: 0, skipped: "subscription-lookup-failed" };
  }

  let sent=0, removed=0;
  const isCall = ["incoming_call", "audio_call", "video_call", "missed_call", "missed_audio_call", "missed_video_call"].includes(String(data?.type || "").toLowerCase()) || Boolean(data?.incomingCall) || Boolean(data?.missedCall);
  const payload = JSON.stringify({
    title:String(title).slice(0,120), body:String(message).slice(0,500), icon:"/pwa-icon-192.png", badge:"/pwa-icon-192.png",
    tag:`benevolent-${String(data?.type||"notification")}-${String(data?.callId || data?.notificationId || "general")}`,
    requireInteraction: isCall, silent: false, renotify: true, data:{ link, ...data },
  });
  for (const subscription of subscriptions) {
    const id = subscriptionIdentity(subscription.endpoint);
    try {
      await webpush.sendNotification(
        { endpoint:subscription.endpoint, expirationTime:subscription.expirationTime ? subscription.expirationTime.getTime() : null, keys:subscription.keys },
        payload,
        isCall ? { TTL: 60, urgency: "high" } : undefined
      );
      sent++;
      console.info("[push][sent]", { subscriptionId: id, endpointHost: endpointHost(subscription.endpoint), recipient: String(recipient), recipientModel, type: String(data?.type || "notification") });
    } catch (error) {
      const statusCode = Number(error?.statusCode || error?.status || 0) || null;
      const stale = statusCode === 404 || statusCode === 410;
      console.warn("[push][delivery-failed]", {
        subscriptionId: id, endpointHost: endpointHost(subscription.endpoint), recipient: String(recipient), recipientModel, type: String(data?.type || "notification"),
        httpStatus: statusCode, providerCode: error?.code || null, staleSubscription: stale,
        message: String(error?.body || error?.message || "Web push delivery failed.").slice(0, 300),
      });
      if (stale) { await PushSubscription.deleteOne({_id:subscription._id}).catch(() => null); removed++; }
    }
  }
  return { sent, removed, subscriptions: subscriptions.length };
}
async function sendPushForNotification(notification) {
  return sendPushToRecipient({ recipient:notification.recipient, recipientModel:notification.recipientModel||"Member", title:notification.title, message:notification.message, link:notification.link||"/", data:{ notificationId:String(notification._id||""), type:notification.type||"system", referenceId:notification.referenceId?String(notification.referenceId):"" } });
}
module.exports={configure,getPublicKey,sendPushToRecipient,sendPushForNotification};
