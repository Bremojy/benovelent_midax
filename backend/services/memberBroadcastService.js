const axios = require("axios");
const nodemailer = require("nodemailer");
const Member = require("../models/Member");

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 0);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !port || !user || !pass) return null;

  return {
    host,
    port,
    secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465,
    auth: { user, pass },
    from,
  };
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function getTransport() {
  const config = getSmtpConfig();
  if (!config) return null;
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });
}

async function getActiveMembers({ includeEmails = true } = {}) {
  const projection = includeEmails ? "fullName email phone mpesaNumber status emailNotifications notifications" : "fullName status";
  return Member.find({
    status: "active",
    isDeleted: false,
    $or: [
      { email: { $exists: true, $ne: "" } },
      { phone: { $exists: true, $ne: "" } },
      { mpesaNumber: { $exists: true, $ne: "" } },
    ],
  }).select(projection).lean();
}

async function sendEmail({ to, subject, text, html }) {
  const config = getSmtpConfig();
  if (!config || !to) return { sent: false, reason: "smtp-not-configured" };

  const transport = await getTransport();
  if (!transport) return { sent: false, reason: "smtp-not-configured" };

  await transport.sendMail({
    from: config.from,
    to,
    subject,
    text,
    html,
  });

  return { sent: true };
}

async function sendBulkEmailToMembers({ subject, text, html, members }) {
  const targets = Array.isArray(members) ? members : await getActiveMembers({ includeEmails: true });
  const recipients = targets
    .map((member) => member?.email)
    .filter(Boolean);

  if (!recipients.length) {
    return { sent: 0, skipped: "no-email-recipients" };
  }

  const transport = await getTransport();
  if (!transport) return { sent: 0, skipped: "smtp-not-configured" };

  for (const recipient of recipients) {
    await transport.sendMail({
      from: getSmtpConfig().from,
      to: recipient,
      subject,
      text,
      html,
    });
  }

  return { sent: recipients.length };
}

async function sendSmsNotification({ to, message }) {
  const url = process.env.SMS_API_URL;
  const apiKey = process.env.SMS_API_KEY;
  const senderId = process.env.SMS_SENDER_ID || "MIDAX";

  if (!url || !to || !message) {
    return { sent: false, reason: "sms-not-configured" };
  }

  await axios.post(url, {
    to,
    message,
    senderId,
  }, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    timeout: 15000,
  });

  return { sent: true };
}

async function notifyMembers({ subject, text, html, smsText, broadcastSms = false }) {
  const members = await getActiveMembers({ includeEmails: true });

  let emailResult = { sent: 0, skipped: "no-members" };
  if (members.length) {
    emailResult = await sendBulkEmailToMembers({ subject, text, html, members });
  }

  let smsResult = { sent: 0, skipped: "sms-not-configured" };
  if (broadcastSms) {
    const smsTargets = members
      .map((member) => member.phone || member.mpesaNumber)
      .filter(Boolean);

    for (const phone of smsTargets.slice(0, 50)) {
      // Best-effort; will no-op when SMS_API_URL is not configured.
      try {
        await sendSmsNotification({ to: phone, message: smsText || text });
        smsResult.sent += 1;
      } catch (error) {
        smsResult.error = error.message;
      }
    }
  }

  return { membersCount: members.length, emailResult, smsResult };
}

module.exports = {
  getActiveMembers,
  sendEmail,
  sendBulkEmailToMembers,
  sendSmsNotification,
  notifyMembers,
  escapeHtml,
};
