const ContactMessage = require("../models/ContactMessage");
const Notification = require("../models/Notification");
const Admin = require("../models/Admin");
const SuperAdmin = require("../models/SuperAdmin");
const createAuditLog = require("../utils/createAuditLog");
const { sendEmail } = require("../services/memberBroadcastService");

function escapeHtml(value) { return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

exports.createContactMessage = async (req, res) => {
  try {
    const { fullName, email, phone = "", subject, message } = req.body;

    if (!fullName?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      return res.status(400).json({ success: false, message: "Name, email, subject and message are required." });
    }

    const contact = await ContactMessage.create({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      subject: subject.trim(),
      message: message.trim(),
    });

    const [admins, superadmins] = await Promise.all([
      Admin.find({ status: "active" }).select("_id").lean(),
      SuperAdmin.find({ status: "active" }).select("_id").lean(),
    ]);

    const notifications = [
      ...admins.map((admin) => ({
        recipient: admin._id,
        recipientModel: "Admin",
        title: "New website contact message",
        message: `${contact.fullName} sent: ${contact.subject}`,
        type: "announcement",
        referenceId: contact._id,
        referenceModel: "ContactMessage",
        icon: "mail",
        read: false,
      })),
      ...superadmins.map((admin) => ({
        recipient: admin._id,
        recipientModel: "SuperAdmin",
        title: "New website contact message",
        message: `${contact.fullName} sent: ${contact.subject}`,
        type: "announcement",
        referenceId: contact._id,
        referenceModel: "ContactMessage",
        icon: "mail",
        read: false,
      })),
    ];

    if (notifications.length) await Notification.insertMany(notifications);

    return res.status(201).json({
      success: true,
      message: "Your message has been sent successfully. Our team has been notified.",
      contact: { id: contact._id, status: contact.status },
    });
  } catch (error) {
    console.error("Create contact message error:", error);
    return res.status(500).json({ success: false, message: "Unable to send your message right now. Please try again." });
  }
};

exports.getContactMessages = async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 }).lean();
    const normalized = messages.map((item) => ({
      ...item,
      phoneFirstLine: [item.phone, item.email, item.fullName].filter(Boolean).join(" • "),
    }));
    return res.json({ success: true, count: normalized.length, messages: normalized });
  } catch (error) {
    console.error("Get contact messages error:", error);
    return res.status(500).json({ success: false, message: "Unable to load contact messages." });
  }
};

exports.updateContactMessage = async (req, res) => {
  try {
    const allowed = ["new", "read", "replied", "archived"];
    if (!allowed.includes(req.body.status)) {
      return res.status(400).json({ success: false, message: "Invalid contact message status." });
    }

    const update = { status: req.body.status };
    if (req.body.status === "replied") update.repliedAt = new Date();

    const message = await ContactMessage.findByIdAndUpdate(req.params.id, update, { returnDocument: "after" }).lean();
    if (!message) return res.status(404).json({ success: false, message: "Contact message not found." });

    return res.json({ success: true, message });
  } catch (error) {
    console.error("Update contact message error:", error);
    return res.status(500).json({ success: false, message: "Unable to update contact message." });
  }
};

exports.archiveContactMessage = async (req, res) => {
  try {
    const message = await ContactMessage.findById(req.params.id);
    if (!message) return res.status(404).json({ success: false, message: "Contact message not found." });
    message.status = "archived";
    await message.save();
    await createAuditLog({
      user: req.user._id,
      userRole: String(req.user.role || "admin").toLowerCase(),
      action: "ARCHIVE",
      module: "ContactMessage",
      description: `Archived website contact message ${message._id}.`,
      req,
      metadata: { contactMessageId: String(message._id) },
    });
    return res.json({ success: true, message: message.toObject() });
  } catch (error) {
    console.error("Archive contact message error:", error);
    return res.status(500).json({ success: false, message: "Unable to archive contact message." });
  }
};

exports.replyContactMessage = async (req, res) => {
  try {
    const body = String(req.body?.message || req.body?.reply || "").trim();
    if (!body) return res.status(400).json({ success: false, code: "CONTACT_REPLY_REQUIRED", message: "Enter a reply before sending." });
    const contact = await ContactMessage.findById(req.params.id);
    if (!contact) return res.status(404).json({ success: false, message: "Contact message not found." });
    if (contact.status === "archived") return res.status(409).json({ success: false, code: "CONTACT_ARCHIVED", message: "Archived contact messages cannot be replied to until they are reopened." });

    const subject = String(contact.subject || "Website enquiry").trim();
    const emailText = `Hello ${contact.fullName || "there"},\n\nThank you for contacting Benevolent MIDAX.\n\n${body}\n\nRegards,\nBenevolent MIDAX`;
    const emailHtml = `<p>Hello ${escapeHtml(contact.fullName || "there")},</p><p>Thank you for contacting Benevolent MIDAX.</p><p>${escapeHtml(body).replace(/\n/g, "<br />")}</p><p>Regards,<br />Benevolent MIDAX</p>`;

    let delivery;
    try {
      delivery = await sendEmail({ to: contact.email, subject: `Re: ${subject}`, text: emailText, html: emailHtml });
    } catch (emailError) {
      delivery = { sent: false, reason: "email-provider-error", error: String(emailError.message || "Email provider error.").slice(0, 500) };
    }

    const reply = {
      body, repliedBy: req.user._id, repliedByModel: String(req.user.role || "admin").toLowerCase() === "superadmin" ? "SuperAdmin" : "Admin",
      repliedAt: new Date(), emailAccepted: Boolean(delivery?.sent), emailProvider: String(delivery?.provider || ""),
      emailId: String(delivery?.id || ""), emailError: delivery?.sent ? "" : String(delivery?.reason || delivery?.error || "Email delivery is not configured.").slice(0, 500),
    };
    contact.replies = Array.isArray(contact.replies) ? contact.replies : [];
    contact.replies.push(reply);
    contact.status = delivery?.sent ? "replied" : "read";
    contact.repliedAt = delivery?.sent ? reply.repliedAt : contact.repliedAt;
    await contact.save();
    await createAuditLog({
      user: req.user._id,
      userRole: String(req.user.role || "admin").toLowerCase(),
      action: "REPLY",
      module: "ContactMessage",
      description: `Replied to website contact message ${contact._id}.`,
      req,
      metadata: { contactMessageId: String(contact._id), emailAccepted: Boolean(delivery?.sent), provider: delivery?.provider || null },
    });

    return res.status(201).json({
      success: true,
      deliveryAccepted: Boolean(delivery?.sent),
      message: delivery?.sent
        ? "Reply accepted by the configured email service."
        : "Reply saved to the inbox, but email delivery is not configured or was rejected. No email delivery was reported as successful.",
      contact: contact.toObject(),
    });
  } catch (error) {
    console.error("Reply contact message error:", error);
    return res.status(500).json({ success: false, message: "Unable to save the contact reply." });
  }
};
