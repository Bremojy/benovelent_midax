const webpush = require("web-push");
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
async function sendPushToRecipient({ recipient, recipientModel = "Member", title, message, link = "/", data = {} }) {
  if (!configure() || !recipient || !title || !message) return { sent: 0, skipped: "push-not-configured" };
  const subscriptions = await PushSubscription.find({ recipient, recipientModel }).lean(); let sent=0, removed=0;
  const isCall = ["incoming_call", "audio_call", "video_call", "missed_call", "missed_audio_call", "missed_video_call"].includes(String(data?.type || "").toLowerCase()) || Boolean(data?.incomingCall) || Boolean(data?.missedCall);
  const payload = JSON.stringify({
    title:String(title).slice(0,120),
    body:String(message).slice(0,500),
    icon:"/pwa-icon-192.png",
    badge:"/pwa-icon-192.png",
    tag:`benevolent-${String(data?.type||"notification")}-${String(data?.callId || data?.notificationId || "general")}`,
    requireInteraction: isCall,
    silent: false,
    renotify: true,
    data:{ link, ...data },
  });
  for (const subscription of subscriptions) {
    try { await webpush.sendNotification(
        { endpoint:subscription.endpoint, expirationTime:subscription.expirationTime ? subscription.expirationTime.getTime() : null, keys:subscription.keys },
        payload,
        isCall ? { TTL: 60, urgency: "high" } : undefined
      ); sent++; }
    catch (error) { if (error.statusCode===404 || error.statusCode===410) { await PushSubscription.deleteOne({_id:subscription._id}); removed++; } else console.warn("Web push delivery failed:",error.message); }
  }
  return { sent, removed, subscriptions: subscriptions.length };
}
async function sendPushForNotification(notification) {
  return sendPushToRecipient({ recipient:notification.recipient, recipientModel:notification.recipientModel||"Member", title:notification.title, message:notification.message, link:notification.link||"/", data:{ notificationId:String(notification._id||""), type:notification.type||"system", referenceId:notification.referenceId?String(notification.referenceId):"" } });
}
module.exports={configure,getPublicKey,sendPushToRecipient,sendPushForNotification};
