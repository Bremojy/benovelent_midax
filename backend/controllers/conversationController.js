const Conversation = require("../models/Conversation");
const Member = require("../models/Member");
const Admin = require("../models/Admin");
const SuperAdmin = require("../models/SuperAdmin");

async function resolveChatAccount(userId) {
  const id = String(userId || "").trim();
  if (!id) return null;

  const [superAdmin, admin, member] = await Promise.all([
    SuperAdmin.findById(id).select("_id role status").lean(),
    Admin.findById(id).select("_id role status").lean(),
    Member.findById(id).select("_id role status isDeleted").lean(),
  ]);

  if (superAdmin) return { role: "superadmin", id: String(superAdmin._id) };
  if (admin) return { role: "admin", id: String(admin._id) };
  if (member && member.isDeleted !== true) return { role: "member", id: String(member._id) };
  return null;
}

/* =====================================================
CREATE CONVERSATION
===================================================== */

exports.createConversation = async (req, res) => {
  try {
    const { participantId } = req.body;
    const me = req.auth?.chatId || req.user?._id;

    if (!participantId) {
      return res.status(400).json({
        success: false,
        message: "participantId is required.",
      });
    }

    if (String(me) === String(participantId)) {
      return res.status(400).json({
        success: false,
        message: "Cannot create conversation with yourself.",
      });
    }

    const [meAccount, participantAccount] = await Promise.all([
      resolveChatAccount(me),
      resolveChatAccount(participantId),
    ]);

    if (!meAccount || !participantAccount) {
      return res.status(404).json({
        success: false,
        message: "Conversation participant not found.",
      });
    }

    if (meAccount.role === "superadmin" || participantAccount.role === "superadmin") {
      return res.status(403).json({
        success: false,
        message: "SuperAdmin conversations are disabled.",
      });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [me, participantId] },
      isGroup: false,
    });

    if (conversation) {
      return res.json({
        success: true,
        conversation,
      });
    }

    conversation = await Conversation.create({
      participants: [me, participantId],
    });

    await conversation.populate(
      "participants",
      "fullName profileImage online lastSeen"
    );

    res.status(201).json({
      success: true,
      conversation,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =====================================================
GET MY CONVERSATIONS
===================================================== */

exports.getMyConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.auth?.chatId || req.user._id,
      deletedFor: { $ne: req.auth?.chatId || req.user._id },
    })
      .populate(
        "participants",
        "fullName profileImage online lastSeen role"
      )
      .populate(
        "lastMessage"
      )
      .sort({
        updatedAt: -1,
      });

    res.json({
      success: true,
      count: conversations.length,
      conversations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =====================================================
GET SINGLE CONVERSATION
===================================================== */

exports.getConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findById(
      req.params.id
    )
      .populate(
        "participants",
        "fullName profileImage online lastSeen role"
      )
      .populate(
        "lastMessage"
      );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found."
      });
    }

    res.json({
      success: true,
      conversation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* =====================================================
DELETE CONVERSATION FOR ME
===================================================== */

exports.deleteConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findById(
      req.params.id
    );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found."
      });
    }

    if (!conversation.deletedFor.includes(req.user._id)) {
      conversation.deletedFor.push(req.user._id);
    }

    await conversation.save();

    res.json({
      success: true,
      message: "Conversation removed."
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* =====================================================
PIN CONVERSATION
===================================================== */

exports.pinConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findById(
      req.params.id
    );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found."
      });
    }

    if (!conversation.pinnedBy.includes(req.user._id)) {
      conversation.pinnedBy.push(req.user._id);
    }

    await conversation.save();

    res.json({
      success: true,
      message: "Conversation pinned."
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* =====================================================
MUTE CONVERSATION
===================================================== */

exports.muteConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findById(
      req.params.id
    );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found."
      });
    }

    if (!conversation.mutedBy.includes(req.user._id)) {
      conversation.mutedBy.push(req.user._id);
    }

    await conversation.save();

    res.json({
      success: true,
      message: "Conversation muted."
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* =====================================================
   COMPATIBILITY EXPORTS
===================================================== */

exports.addMember = async (req, res) => {
    try {
        const conversation = await Conversation.findById(req.params.id);

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found."
            });
        }

        const { memberId } = req.body;

        if (!memberId) {
            return res.status(400).json({
                success: false,
                message: "memberId is required."
            });
        }

        if (!conversation.participants.includes(memberId)) {
            conversation.participants.push(memberId);
            await conversation.save();
        }

        res.json({
            success: true,
            conversation
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
