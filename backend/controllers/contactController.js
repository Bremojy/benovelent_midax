const ContactMessage = require("../models/ContactMessage");
const Notification = require("../models/Notification");
const Admin = require("../models/Admin");
const SuperAdmin = require("../models/SuperAdmin");

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

    const message = await ContactMessage.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    if (!message) return res.status(404).json({ success: false, message: "Contact message not found." });

    return res.json({ success: true, message });
  } catch (error) {
    console.error("Update contact message error:", error);
    return res.status(500).json({ success: false, message: "Unable to update contact message." });
  }
};
