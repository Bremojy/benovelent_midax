const mongoose = require("mongoose");

const Member = require("../models/Member");
const Admin = require("../models/Admin");
const Dependent = require("../models/Dependent");
const Contribution = require("../models/Contribution");
const Finance = require("../models/Finance");
const EducationSupport = require("../models/EducationSupport");
const MedicalSupport = require("../models/MedicalSupport");
const FuneralSupport = require("../models/FuneralSupport");
const SupportRequest = require("../models/SupportRequest");
const Vote = require("../models/Vote");
const Notification = require("../models/Notification");
const PushSubscription = require("../models/PushSubscription");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const FeedbackCollection = require("../models/FeedbackCollection");
const News = require("../models/News");
const Poll = require("../models/Poll");
const WebsiteContent = require("../models/WebsiteContent");
const AuditLog = require("../models/AuditLog");

const toObjectId = (id) => {
  if (id instanceof mongoose.Types.ObjectId) return id;
  return new mongoose.Types.ObjectId(String(id));
};

function emptySummary(type, id) {
  return {
    type,
    id: String(id),
    deleted: [],
    updated: [],
  };
}

async function countAndDelete(Model, filter, label) {
  const count = await Model.countDocuments(filter);
  if (count) await Model.deleteMany(filter);
  return count ? { label, count } : null;
}

async function deleteMemberPermanently(memberId) {
  const id = toObjectId(memberId);
  const member = await Member.findById(id).lean();
  if (!member) {
    const error = new Error("Member not found.");
    error.statusCode = 404;
    throw error;
  }

  const summary = emptySummary("member", id);

  const conversations = await Conversation.find({ participants: id }).select("_id").lean();
  const conversationIds = conversations.map((item) => item._id);

  if (conversationIds.length) {
    const messageCount = await Message.countDocuments({ conversation: { $in: conversationIds } });
    if (messageCount) {
      await Message.deleteMany({ conversation: { $in: conversationIds } });
      summary.deleted.push({ label: "chat messages", count: messageCount });
    }

    const conversationCount = await Conversation.countDocuments({ _id: { $in: conversationIds } });
    if (conversationCount) {
      await Conversation.deleteMany({ _id: { $in: conversationIds } });
      summary.deleted.push({ label: "chat conversations", count: conversationCount });
    }
  }

  const directDeletes = [
    [Dependent, { member: id }, "dependents"],
    [Contribution, { member: id }, "contribution records"],
    [EducationSupport, { member: id }, "education support records"],
    [MedicalSupport, { member: id }, "medical support records"],
    [FuneralSupport, { member: id }, "funeral support records"],
    [Finance, { member: id }, "finance transactions"],
    [SupportRequest, { member: id }, "support requests"],
    [Vote, { member: id }, "poll votes"],
    [Notification, { $or: [{ recipient: id, recipientModel: "Member" }, { sender: id, senderModel: "Member" }] }, "notifications"],
    [PushSubscription, { recipient: id, recipientModel: "Member" }, "push subscriptions"],
  ];

  for (const [Model, filter, label] of directDeletes) {
    const result = await countAndDelete(Model, filter, label);
    if (result) summary.deleted.push(result);
  }

  // Remove this member from denormalised or optional member references while
  // preserving public content and other members' feedback.
  const feedbackCollections = await FeedbackCollection.find({ "responses.member": id }).select("_id responses").lean();
  let feedbackResponseCount = 0;
  for (const collection of feedbackCollections) {
    const before = collection.responses?.length || 0;
    if (!before) continue;
    const after = collection.responses.filter((response) => String(response.member || "") !== String(id));
    feedbackResponseCount += before - after.length;
    if (before !== after.length) {
      await FeedbackCollection.updateOne(
        { _id: collection._id },
        { $set: { responses: after } },
      );
    }
  }
  if (feedbackResponseCount) summary.deleted.push({ label: "feedback responses", count: feedbackResponseCount });

  const newsLikes = await News.updateMany({ likes: id }, { $pull: { likes: id } });
  if (newsLikes.modifiedCount) summary.updated.push({ label: "news like references removed", count: newsLikes.modifiedCount });

  // Some older records can contain member references without being directly
  // associated through the main member field. Remove those chat/read markers.
  const [messageMarkers, conversationMarkers] = await Promise.all([
    Message.updateMany(
      {},
      {
        $pull: {
          seenBy: id,
          deletedFor: id,
          reactions: { member: id },
        },
      },
    ),
    Conversation.updateMany(
      {},
      {
        $pull: {
          admins: id,
          archivedBy: id,
          mutedBy: id,
          pinnedBy: id,
          deletedFor: id,
          typingUsers: id,
        },
      },
    ),
  ]);

  if (messageMarkers.modifiedCount) summary.updated.push({ label: "message member references removed", count: messageMarkers.modifiedCount });
  if (conversationMarkers.modifiedCount) summary.updated.push({ label: "conversation member references removed", count: conversationMarkers.modifiedCount });

  const auditCount = await AuditLog.countDocuments({ user: id, userModel: "Member" });
  if (auditCount) {
    await AuditLog.deleteMany({ user: id, userModel: "Member" });
    summary.deleted.push({ label: "member audit entries", count: auditCount });
  }

  await Member.deleteOne({ _id: id });
  summary.deleted.push({ label: "member account", count: 1 });

  return { member, summary };
}

async function deleteAdminPermanently(adminId, replacementSuperAdminId) {
  const id = toObjectId(adminId);
  const replacementId = replacementSuperAdminId ? toObjectId(replacementSuperAdminId) : null;
  const admin = await Admin.findById(id).lean();
  if (!admin) {
    const error = new Error("Administrator not found.");
    error.statusCode = 404;
    throw error;
  }

  const summary = emptySummary("admin", id);

  // Remove the hidden Member records used by the legacy chat system for
  // Admin accounts. Leaving these behind causes the exact duplicate-email /
  // duplicate-username problem seen when an Admin is deleted and recreated.
  const linkedChatProfiles = await Member.find({
    $or: [
      { portalOwnerId: id, portalOwnerRole: "admin" },
      { email: String(admin.email || "").toLowerCase(), role: "admin", notes: { $regex: "^Auto-synced portal chat profile for admin\\.$", $options: "i" } },
    ],
  }).select("_id").lean();
  const uniqueChatProfileIds = [...new Set(linkedChatProfiles.map((profile) => String(profile._id)))];
  for (const profileId of uniqueChatProfileIds) {
    try {
      const chatResult = await deleteMemberPermanently(profileId);
      summary.deleted.push({ label: "administrator chat profile and linked chat records", count: 1, details: chatResult.summary });
    } catch (chatError) {
      console.warn(`Administrator chat profile cleanup skipped for ${profileId}: ${chatError.message}`);
    }
  }

  // Content owned solely by the deleted Admin is deleted as part of a
  // permanent account purge. This avoids leaving News/Poll documents that
  // still point at an account that no longer exists.
  const adminPolls = await Poll.find({ createdBy: id }).select("_id").lean();
  const adminPollIds = adminPolls.map((item) => item._id);
  if (adminPollIds.length) {
    const voteCount = await Vote.countDocuments({ poll: { $in: adminPollIds } });
    if (voteCount) {
      await Vote.deleteMany({ poll: { $in: adminPollIds } });
      summary.deleted.push({ label: "votes on deleted polls", count: voteCount });
    }
    const newsPollLinks = await News.updateMany({ poll: { $in: adminPollIds } }, { $set: { poll: null } });
    if (newsPollLinks.modifiedCount) summary.updated.push({ label: "news poll links cleared", count: newsPollLinks.modifiedCount });
    await Poll.deleteMany({ _id: { $in: adminPollIds } });
    summary.deleted.push({ label: "administrator poll records", count: adminPollIds.length });
  }

  const adminNewsCount = await News.countDocuments({ author: id });
  if (adminNewsCount) {
    await News.deleteMany({ author: id });
    summary.deleted.push({ label: "administrator news records", count: adminNewsCount });
  }

  const adminFeedbackCount = await FeedbackCollection.countDocuments({ createdBy: id, createdByRole: "admin" });
  if (adminFeedbackCount) {
    // Feedback collections have no strict model reference. Reassign them to
    // the SuperAdmin so useful forms are preserved while the deleted account
    // itself is fully removed.
    if (replacementId) {
      const feedback = await FeedbackCollection.updateMany(
        { createdBy: id, createdByRole: "admin" },
        { $set: { createdBy: replacementId, createdByRole: "superadmin" } },
      );
      if (feedback.modifiedCount) summary.updated.push({ label: "feedback owners reassigned", count: feedback.modifiedCount });
    }
  }

  const optionalRefUpdates = [
    [Finance, { approvedBy: id }, { $set: { approvedBy: null } }, "finance approval references cleared"],
    [Contribution, { approvedBy: id }, { $set: { approvedBy: null, approvedAt: null } }, "contribution approval references cleared"],
    [SupportRequest, { processedBy: id }, { $set: { processedBy: null } }, "support request processor references cleared"],
    [Dependent, { approvedBy: id }, { $set: { approvedBy: null } }, "dependent approval references cleared"],
    [EducationSupport, { approvedBy: id }, { $set: { approvedBy: null } }, "education support approval references cleared"],
    [MedicalSupport, { approvedBy: id }, { $set: { approvedBy: null, processedBy: null, updatedBy: null, createdBy: null } }, "medical support admin references cleared"],
    [FuneralSupport, { $or: [{ approvedBy: id }, { processedBy: id }, { updatedBy: id }, { createdBy: id }] }, { $set: { approvedBy: null, processedBy: null, updatedBy: null, createdBy: null } }, "funeral support admin references cleared"],
    [Member, { $or: [{ createdBy: id }, { updatedBy: id }] }, { $set: { createdBy: null, updatedBy: null } }, "member admin references cleared"],
    [WebsiteContent, { updatedBy: id }, { $set: { updatedBy: null } }, "website content updater references cleared"],
  ];

  for (const [Model, filter, update, label] of optionalRefUpdates) {
    const result = await Model.updateMany(filter, update);
    if (result.modifiedCount) summary.updated.push({ label, count: result.modifiedCount });
  }

  const directDeletes = [
    [Notification, { $or: [{ recipient: id, recipientModel: "Admin" }, { sender: id, senderModel: "Admin" }] }, "notifications"],
    [PushSubscription, { recipient: id, recipientModel: "Admin" }, "push subscriptions"],
  ];
  for (const [Model, filter, label] of directDeletes) {
    const result = await countAndDelete(Model, filter, label);
    if (result) summary.deleted.push(result);
  }

  // Audit history is retained for governance. The deleted account disappears
  // from the account collections, while the deletion itself is logged by the
  // SuperAdmin performing the action.
  await Admin.deleteOne({ _id: id });
  summary.deleted.push({ label: "administrator account", count: 1 });

  return { admin, summary };
}

module.exports = {
  deleteMemberPermanently,
  deleteAdminPermanently,
};
