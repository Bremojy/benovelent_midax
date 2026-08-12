const axios = require("axios");
const nodemailer = require("nodemailer");
const { Resend } = require("resend");
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

function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || process.env.SMTP_FROM || process.env.EMAIL_FROM;

  if (!apiKey || !from) return null;

  return {
    apiKey,
    from,
  };
}

function getEmailProvider() {
  const provider = String(process.env.EMAIL_PROVIDER || "").toLowerCase();
  if (provider === "resend" || process.env.RESEND_API_KEY) {
    return "resend";
  }
  if (provider === "smtp" || process.env.SMTP_HOST) {
    return "smtp";
  }
  return null;
}

function getResendClient() {
  const config = getResendConfig();
  if (!config) return null;
  return new Resend(config.apiKey);
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

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function getActiveMembers({ includeEmails = true } = {}) {
  const projection = includeEmails ? "fullName email phone mpesaNumber status emailNotifications notifications" : "fullName status";
  return Member.find({
    role: "member",
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
  if (!to) return { sent: false, reason: "no-recipient" };

  const provider = getEmailProvider();

  if (provider === "resend") {
    const config = getResendConfig();
    const client = getResendClient();
    if (!config || !client) return { sent: false, reason: "resend-not-configured" };

    await client.emails.send({
      from: config.from,
      to,
      subject,
      text,
      html,
    });

    return { sent: true, provider: "resend" };
  }

  if (provider === "smtp") {
    const config = getSmtpConfig();
    const transport = await getTransport();
    if (!config || !transport) return { sent: false, reason: "smtp-not-configured" };

    await transport.sendMail({
      from: config.from,
      to,
      subject,
      text,
      html,
    });

    return { sent: true, provider: "smtp" };
  }

  return { sent: false, reason: "email-not-configured" };
}

async function sendBulkEmailToMembers({ subject, text, html, members }) {
  const targets = Array.isArray(members) ? members : await getActiveMembers({ includeEmails: true });
  const recipients = targets
    .map((member) => member?.email)
    .filter(Boolean);

  if (!recipients.length) {
    return { sent: 0, skipped: "no-email-recipients" };
  }

  const provider = getEmailProvider();

  if (provider === "resend") {
    const config = getResendConfig();
    const client = getResendClient();
    if (!config || !client) return { sent: 0, skipped: "resend-not-configured" };

    let sent = 0;
    for (const recipient of recipients) {
      await client.emails.send({
        from: config.from,
        to: recipient,
        subject,
        text,
        html,
      });
      sent += 1;
    }

    return { sent, provider: "resend" };
  }

  if (provider === "smtp") {
    const config = getSmtpConfig();
    const transport = await getTransport();
    if (!config || !transport) return { sent: 0, skipped: "smtp-not-configured" };

    for (const recipient of recipients) {
      await transport.sendMail({
        from: config.from,
        to: recipient,
        subject,
        text,
        html,
      });
    }

    return { sent: recipients.length, provider: "smtp" };
  }

  return { sent: 0, skipped: "email-not-configured" };
}

async function sendTalkBeeSms({ to, message }) {
  const url = String(process.env.TALKBEE_API_URL || "").trim();
  const token = String(process.env.TALKBEE_API_TOKEN || "").trim();
  const senderId = String(process.env.TALKBEE_SENDER_ID || "").trim();
  if (!url || !token || !to || !message) return { sent: false, reason: "talkbee-not-configured" };

  // TalkBee exposes messaging through its API. The concrete API endpoint is
  // account/channel-specific, so the URL and token stay configurable in the
  // Render environment rather than being hard-coded in the application.
  const payload = {
    to: String(to),
    message: String(message),
    ...(senderId ? { senderId } : {}),
  };

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });

  return { sent: true, provider: "talkbee", response: response.data };
}

async function sendSmsNotification({ to, message }) {
  const provider = String(process.env.SMS_PROVIDER || "").toLowerCase();
  if (provider === "talkbee" || process.env.TALKBEE_API_URL) {
    return sendTalkBeeSms({ to, message });
  }

  const url = process.env.SMS_API_URL;
  const apiKey = process.env.SMS_API_KEY;
  const senderId = process.env.SMS_SENDER_ID || "MIDAX";

  if (!url || !to || !message) {
    return { sent: false, reason: "sms-not-configured" };
  }

  await axios.post(url, { to, message, senderId }, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    timeout: 15000,
  });

  return { sent: true, provider: "generic" };
}

async function notifyMembers({ subject, text, html, smsText, broadcastSms = false, members = null }) {
  const recipients = Array.isArray(members) && members.length ? members : await getActiveMembers({ includeEmails: true });

  let emailResult = { sent: 0, skipped: "no-members" };
  if (recipients.length) {
    emailResult = await sendBulkEmailToMembers({ subject, text, html, members: recipients });
  }

  let smsResult = { sent: 0, skipped: "sms-not-configured" };
  if (broadcastSms) {
    const smsTargets = recipients
      .map((member) => member.phone || member.mpesaNumber)
      .filter(Boolean);

    for (const phone of smsTargets) {
      try {
        const result = await sendSmsNotification({ to: phone, message: smsText || text });
        if (result?.sent) smsResult.sent += 1;
        else smsResult.skipped = result?.reason || smsResult.skipped;
      } catch (error) {
        smsResult.error = error.message;
      }
    }
  }

  return { membersCount: recipients.length, emailResult, smsResult };
}

module.exports = {
  getActiveMembers,
  sendEmail,
  sendBulkEmailToMembers,
  sendSmsNotification,
  sendTalkBeeSms,
  notifyMembers,
  escapeHtml,
};
