const mongoose = require("mongoose");
const SupportRequestPermissionRequest = require("../models/SupportRequestPermissionRequest");
const SupportRequest = require("../models/SupportRequest");
const Member = require("../models/Member");
const Admin = require("../models/Admin");
const SuperAdmin = require("../models/SuperAdmin");
const createNotification = require("../utils/createNotification");
const createAuditLog = require("../utils/createAuditLog");

const normalizeAction = (value) => String(value || "").trim().toLowerCase();
const activeStatuses = ["Pending", "Approved"];

async function getOwnedSupportRequest(memberId, requestId) {
  if (!mongoose.Types.ObjectId.isValid(requestId)) return null;
  return SupportRequest.findOne({ _id: requestId, member: memberId, isDeleted: { $ne: true } }).lean();
}

async function notifyReviewers(permission, member) {
  const [admins, superadmins] = await Promise.all([
    Admin.find({ status: "active" }).select("_id").lean(),
    SuperAdmin.find({ status: "active" }).select("_id").lean(),
  ]);
  const reviewers = [
    ...admins.map((row) => ({ id: row._id, model: "Admin", link: "/admin/support" })),
    ...superadmins.map((row) => ({ id: row._id, model: "SuperAdmin", link: "/superadmin/support" })),
  ];
  const actionLabel = permission.requestedAction === "edit" ? "edit" : "delete";
  await Promise.all(reviewers.map((reviewer) => createNotification({
    recipient: reviewer.id,
    recipientModel: reviewer.model,
    sender: member._id,
    senderModel: "Member",
    title: `Support ${actionLabel} permission requested`,
    message: `${member.fullName || "A member"} requested permission to ${actionLabel} support request ${permission.sourceId}. Review the request and its reason before granting access.`,
    type: "claim",
    referenceId: permission._id,
    referenceModel: "SupportRequestPermissionRequest",
    link: `${reviewer.link}?permissionRequestId=${permission._id}`,
    icon: actionLabel === "delete" ? "delete_forever" : "edit",
    eventId: `support-permission-request:${permission._id}:${reviewer.model}:${reviewer.id}`,
  })));
}

exports.create = async (req, res) => {
  try {
    const sourceId = String(req.body?.sourceId || "").trim();
    const requestedAction = normalizeAction(req.body?.requestedAction);
    const reason = String(req.body?.reason || "").trim().slice(0, 1200);
    if (!sourceId || !mongoose.Types.ObjectId.isValid(sourceId)) return res.status(400).json({ success: false, code: "INVALID_SOURCE_REQUEST", message: "Select a valid support request." });
    if (!["edit", "delete"].includes(requestedAction)) return res.status(400).json({ success: false, message: "Requested action must be edit or delete." });
    if (reason.length < 5) return res.status(400).json({ success: false, message: "Provide a clear reason for the permission request." });

    const source = await getOwnedSupportRequest(req.user._id, sourceId);
    if (!source) return res.status(404).json({ success: false, code: "SUPPORT_REQUEST_NOT_FOUND", message: "That support request is not available in your account." });
    if (String(source.status || "").trim().toLowerCase() !== "under review") {
      return res.status(409).json({ success: false, message: "Permission can only be requested while the support request is Under Review." });
    }

    const duplicate = await SupportRequestPermissionRequest.findOne({
      member: req.user._id,
      sourceModel: "SupportRequest",
      sourceType: "support",
      sourceId: source._id,
      requestedAction,
      status: { $in: activeStatuses },
    }).lean();
    if (duplicate) return res.status(409).json({ success: false, code: "ACTIVE_PERMISSION_EXISTS", message: `An active ${requestedAction} permission request already exists for this support request.`, permissionRequest: duplicate });

    const permission = await SupportRequestPermissionRequest.create({
      member: req.user._id,
      sourceModel: "SupportRequest",
      sourceType: "support",
      sourceId: source._id,
      requestedAction,
      reason,
      status: "Pending",
      requestedAt: new Date(),
    });
    let member = null;
    try {
      member = await Member.findById(req.user._id).select("fullName memberNumber").lean();
    } catch (lookupError) {
      console.warn("Support permission member lookup warning:", lookupError.message);
    }
    await Promise.allSettled([
      notifyReviewers(permission, member || { _id: req.user._id, fullName: "Member" }),
      createNotification({
        recipient: req.user._id,
        recipientModel: "Member",
        title: "Permission request submitted",
        message: `Your request to ${requestedAction} support request ${source._id} is awaiting administrator review.`,
        type: "claim",
        referenceId: permission._id,
        referenceModel: "SupportRequestPermissionRequest",
        link: "/member/support/requests",
        icon: "pending",
        eventId: `support-permission-member:${permission._id}`,
      }),
      createAuditLog({
        user: req.user._id,
        userRole: req.user.role,
        action: "SUPPORT_PERMISSION_REQUESTED",
        module: "Support",
        description: `Member requested permission to ${requestedAction} support request ${source._id}.`,
        req,
        metadata: { permissionRequestId: permission._id, sourceId: source._id, requestedAction, reason },
      }),
    ]);
    return res.status(201).json({ success: true, permissionRequest: permission, message: "Permission request submitted for administrator review." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.mine = async (req, res) => {
  try {
    const requests = await SupportRequestPermissionRequest.find({ member: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    const sourceIds = requests.map((item) => item.sourceId).filter(Boolean);
    const sourceRows = sourceIds.length ? await SupportRequest.find({ _id: { $in: sourceIds }, member: req.user._id }).lean() : [];
    const sources = new Map(sourceRows.map((row) => [String(row._id), row]));
    return res.json({
      success: true,
      permissionRequests: requests.map((item) => ({
        ...item,
        sourceRequest: sources.get(String(item.sourceId)) || null,
      })),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.all = async (req, res) => {
  try {
    const requests = await SupportRequestPermissionRequest.find({ status: "Pending" })
      .populate("member", "fullName memberNumber phone email profileImage")
      .sort({ createdAt: -1 })
      .lean();
    const sourceIds = requests.map((item) => item.sourceId).filter(Boolean);
    const sourceRows = sourceIds.length ? await SupportRequest.find({ _id: { $in: sourceIds }, isDeleted: { $ne: true } }).lean() : [];
    const sources = new Map(sourceRows.map((row) => [String(row._id), row]));
    return res.json({
      success: true,
      permissionRequests: requests.map((item) => ({ ...item, sourceRequest: sources.get(String(item.sourceId)) || null })),
      count: requests.length,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: "Invalid permission request id." });
    const permission = await SupportRequestPermissionRequest.findById(req.params.id).populate("member", "fullName memberNumber phone email profileImage").lean();
    if (!permission) return res.status(404).json({ success: false, message: "Permission request not found." });
    const sourceRequest = await SupportRequest.findOne({ _id: permission.sourceId, isDeleted: { $ne: true } }).lean();
    return res.json({ success: true, permissionRequest: { ...permission, sourceRequest: sourceRequest || null } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.review = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: "Invalid permission request id." });
    const decision = normalizeAction(req.body?.decision);
    const reviewReason = String(req.body?.reviewReason || req.body?.reason || "").trim().slice(0, 1200);
    if (!["approve", "reject"].includes(decision)) return res.status(400).json({ success: false, message: "Decision must be approve or reject." });
    if (decision === "reject" && reviewReason.length < 2) return res.status(400).json({ success: false, message: "A rejection reason is required." });

    const reviewerModel = String(req.user?.role || "").toLowerCase() === "superadmin" ? "SuperAdmin" : "Admin";
    const status = decision === "approve" ? "Approved" : "Rejected";
    const updated = await SupportRequestPermissionRequest.findOneAndUpdate(
      { _id: req.params.id, status: "Pending" },
      {
        $set: {
          status,
          reviewedAt: new Date(),
          reviewedBy: req.user._id,
          reviewedByModel: reviewerModel,
          reviewReason,
        },
      },
      { new: true }
    ).lean();
    if (!updated) return res.status(409).json({ success: false, message: "This permission request was already reviewed or is no longer available." });

    let member = null;
    try {
      member = await Member.findById(updated.member).select("fullName").lean();
    } catch (lookupError) {
      console.warn("Support permission review member lookup warning:", lookupError.message);
    }
    await Promise.allSettled([
      createNotification({
        recipient: updated.member,
        recipientModel: "Member",
        sender: req.user._id,
        senderModel: reviewerModel,
        title: `Support ${updated.requestedAction} permission ${decision === "approve" ? "approved" : "rejected"}`,
        message: decision === "approve"
          ? `Your permission to ${updated.requestedAction} support request ${updated.sourceId} was approved. The permission is one-time and will be consumed when used.`
          : `Your permission to ${updated.requestedAction} support request ${updated.sourceId} was rejected.${reviewReason ? ` Reason: ${reviewReason}` : ""}`,
        type: "claim",
        referenceId: updated._id,
        referenceModel: "SupportRequestPermissionRequest",
        link: "/member/support/requests",
        icon: decision === "approve" ? "check_circle" : "cancel",
        eventId: `support-permission-decision:${updated._id}:${status}`,
      }),
      createAuditLog({
        user: req.user._id,
        userRole: req.user.role,
        action: decision === "approve" ? "SUPPORT_PERMISSION_APPROVED" : "SUPPORT_PERMISSION_REJECTED",
        module: "Support",
        description: `${decision === "approve" ? "Approved" : "Rejected"} ${updated.requestedAction} permission for support request ${updated.sourceId}.`,
        req,
        metadata: { permissionRequestId: updated._id, sourceId: updated.sourceId, requestedAction: updated.requestedAction, memberId: updated.member, reviewReason },
      }),
    ]);
    return res.json({ success: true, permissionRequest: updated, memberName: member?.fullName || "Member", message: decision === "approve" ? "Permission approved. The member can now use the one-time permission." : "Permission request rejected." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports.reserveApprovedPermission = async ({ memberId, sourceModel, sourceType, sourceId, requestedAction, permissionRequestId }) => {
  if (!permissionRequestId || !mongoose.Types.ObjectId.isValid(permissionRequestId)) {
    const error = new Error("Administrator permission is required before this support request can be edited or deleted.");
    error.status = 403;
    error.code = "SUPPORT_PERMISSION_REQUIRED";
    throw error;
  }
  const claimed = await SupportRequestPermissionRequest.findOneAndUpdate(
    {
      _id: permissionRequestId,
      member: memberId,
      sourceModel,
      sourceType,
      sourceId,
      requestedAction,
      status: "Approved",
    },
    {
      $set: { status: "Consumed", consumedAt: new Date(), consumedBy: memberId },
    },
    { new: true }
  );
  if (!claimed) {
    const error = new Error("The approved support permission is missing, expired, already used, or does not belong to this request.");
    error.status = 403;
    error.code = "SUPPORT_PERMISSION_INVALID_OR_CONSUMED";
    throw error;
  }
  return claimed;
};

module.exports.releaseConsumedPermission = async (permissionRequestId, memberId) => {
  if (!permissionRequestId || !mongoose.Types.ObjectId.isValid(permissionRequestId)) return;
  await SupportRequestPermissionRequest.updateOne(
    { _id: permissionRequestId, member: memberId, status: "Consumed", consumedBy: memberId },
    { $set: { status: "Approved", consumedAt: null, consumedBy: null } }
  ).catch(() => {});
};
