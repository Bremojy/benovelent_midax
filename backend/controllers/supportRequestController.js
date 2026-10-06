const SupportRequest = require("../models/SupportRequest");
const Finance = require("../models/Finance");
const mongoose = require("mongoose");
const Policy = require("../models/Policy");
const { resolveStoredFileUrl } = require("../utils/uploadUrl");
const createAuditLog = require("../utils/createAuditLog");
const { reserveApprovedPermission, releaseConsumedPermission } = require("./supportPermissionController");

const safeParse = (value, fallback) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const asText = (value, fallback = "") => {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
};

const buildAttachmentList = (req) => {
  const files = Array.isArray(req.files) ? req.files : [];
  const categories = safeParse(req.body.documentCategories, []);
  const labels = safeParse(req.body.documentLabels, []);
  const customCategories = safeParse(req.body.documentCustomCategories, []);

  return files
    .map((file, index) => {
      const fileUrl = resolveStoredFileUrl(file, "/documents");
      if (!fileUrl) return null;

      const category = asText(categories[index], "General") || "General";
      const customCategory = asText(customCategories[index], "");
      const label = asText(labels[index], file.originalname || `Document ${index + 1}`);
      const fileName = asText(file.originalname || file.filename || label, label);

      return {
        category,
        customCategory,
        label,
        fileName,
        fileUrl,
        uploadedAt: new Date(),
      };
    })
    .filter(Boolean);
};

const normalizeDocuments = (documents = []) =>
  (Array.isArray(documents) ? documents : [])
    .map((document) => {
      if (!document) return null;
      if (typeof document === "string") {
        return {
          category: "General",
          label: "",
          fileName: "",
          fileUrl: document,
          uploadedAt: new Date(),
        };
      }
      const fileUrl = document.fileUrl || document.url || document.path || "";
      if (!fileUrl) return null;
      return {
        category: asText(document.category, "General") || "General",
        customCategory: asText(document.customCategory, ""),
        label: asText(document.label, ""),
        fileName: asText(document.fileName, document.label || ""),
        fileUrl,
        uploadedAt: document.uploadedAt ? new Date(document.uploadedAt) : new Date(),
      };
    })
    .filter(Boolean);

const UNDER_REVIEW_STATUS = "Under Review";
const MEMBER_EDITABLE_STATUS = UNDER_REVIEW_STATUS.toLowerCase();
const normalizeStatus = (value) => String(value || "").trim().toLowerCase();
const validateMemberEditable = (item, memberId) => {
  if (String(item.member) !== String(memberId)) {
    return { status: 403, message: "You can only manage support requests belonging to your account." };
  }
  if (normalizeStatus(item.status) !== MEMBER_EDITABLE_STATUS) {
    return { status: 409, message: "This support request can no longer be edited or deleted because it has moved beyond Under Review." };
  }
  return null;
};

const validateMinimumDocuments = (documents) => {
  const normalized = normalizeDocuments(documents);
  if (normalized.length < 2) return "At least two supporting documents are required.";
  const categories = new Set(normalized.map((item) => {
    const category = String(item.category || "General").trim();
    return category.toLowerCase() === "other" && item.customCategory ? item.customCategory.trim().toLowerCase() : category.toLowerCase();
  }));
  if (categories.size < 2) return "Please upload documents from at least two different categories.";
  if (normalized.some((item) => String(item.category || "").trim().toLowerCase() === "other" && !String(item.customCategory || "").trim())) {
    return "When a document category is Other, provide a custom category name.";
  }
  return null;
};

exports.create = async (req, res) => {
  try {
    const { supportType, policySlug, policyName, description, requestedAmount } = req.body;
    const amount = Number(requestedAmount);

    if (!supportType || !description || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Support type, description and a positive amount are required.",
      });
    }

    const attachments = buildAttachmentList(req);
    const documentError = validateMinimumDocuments(attachments);
    if (documentError) return res.status(400).json({ success: false, message: documentError });
    const policy = policySlug ? await Policy.findOne({ slug: policySlug, enabled: true }).lean() : null;
    if (!policy) {
      return res.status(400).json({ success: false, code: "SUPPORT_POLICY_REQUIRED", message: "Select an enabled Benevolent MIDAX support policy before submitting a support request." });
    }
    const policyMax = Number(policy?.maxAmount || 0);
    const policyMin = Number(policy?.minAmount || 0);
    if (policyMin > 0 && amount < policyMin) return res.status(400).json({ success:false, message:`Minimum amount for ${policy.name} is KSh ${policyMin.toLocaleString("en-KE")}.` });
    if (policyMax > 0 && amount > policyMax) return res.status(400).json({ success:false, message:`Maximum amount for ${policy.name} is KSh ${policyMax.toLocaleString("en-KE")}.` });

    const item = await SupportRequest.create({
      member: req.user._id,
      createdBy: req.user._id,
      createdByModel: "Member",
      supportType: asText(supportType),
      policySlug: asText(policySlug),
      policyName: asText(policyName),
      description: asText(description),
      requestedAmount: amount,
      approvedAmount: 0,
      repaymentEnabled: Boolean(policy?.repaymentEnabled && policy?.category === "loan" && policy?.slug === "education-policy"),
      repaymentMonths: Boolean(policy?.repaymentEnabled && policy?.category === "loan" && policy?.slug === "education-policy") ? Number(policy?.repaymentMonths || 12) : 12,
      interestRate: Boolean(policy?.repaymentEnabled && policy?.category === "loan" && policy?.slug === "education-policy") ? Number(policy?.interestRate || 0) : 0,
      documents: attachments,
      timeline: [
        {
          status: "Pending",
          remarks: "Application submitted by member",
          updatedBy: req.user._id,
          updatedByModel: "Member",
        },
      ],
    });

    return res.status(201).json({ success: true, request: item });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.mine = async (req, res) => {
  try {
    const requests = await SupportRequest.find({ member: req.user._id, isDeleted: { $ne: true }, memberVisible: { $ne: false } })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      requests: requests.map((request) => ({
        ...request,
        documents: normalizeDocuments(request.documents),
      })),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.all = async (req, res) => {
  try {
    const requests = await SupportRequest.find()
      .populate(
        "member",
        "fullName memberNumber phone email profileImage passportPhoto nationalId gender maritalStatus physicalAddress siteStation customSiteStation nextOfKin emergencyContact acceptedConstitution acceptedPrivacyPolicy acceptedDeclaration profileCompletion profileCompleted status documents"
      )
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      requests: requests.map((request) => ({
        ...request,
        documents: normalizeDocuments(request.documents),
      })),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const request = await SupportRequest.findById(req.params.id)
      .populate(
        "member",
        "fullName memberNumber phone email profileImage passportPhoto nationalId gender maritalStatus physicalAddress siteStation customSiteStation nextOfKin emergencyContact acceptedConstitution acceptedPrivacyPolicy acceptedDeclaration profileCompletion profileCompleted status documents"
      )
      .lean();

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Support request not found.",
      });
    }

    return res.json({
      success: true,
      request: {
        ...request,
        documents: normalizeDocuments(request.documents),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.memberUpdate = async (req, res) => {
  const permissionRequestId = String(req.body?.permissionRequestId || "").trim();
  let permissionReserved = false;
  try {
    const item = await SupportRequest.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Support request not found." });
    const denied = validateMemberEditable(item, req.user._id);
    if (denied) return res.status(denied.status).json({ success: false, message: denied.message });

    // Validate every client-supplied field before consuming the one-time permission.
    const incomingDocuments = buildAttachmentList(req);
    const keepDocuments = normalizeDocuments(req.body.keepDocuments ? safeParse(req.body.keepDocuments, []) : item.documents);
    const documents = [...keepDocuments, ...incomingDocuments];
    const documentError = validateMinimumDocuments(documents);
    if (documentError) return res.status(400).json({ success: false, message: documentError });

    const { description, requestedAmount } = req.body || {};
    const nextDescription = description === undefined ? item.description : asText(description);
    let nextAmount = Number(item.requestedAmount || 0);
    const amountWasChanged = requestedAmount !== undefined;
    if (amountWasChanged) {
      nextAmount = Number(requestedAmount);
      if (!Number.isFinite(nextAmount) || nextAmount <= 0) return res.status(400).json({ success: false, message: "Requested amount must be a positive number." });
    }

    if (amountWasChanged && item.policySlug) {
      const policy = await Policy.findOne({ slug: item.policySlug, enabled: true }).lean();
      if (!policy) return res.status(409).json({ success: false, message: "The support policy attached to this request is no longer available for amount editing." });
      const policyMin = Number(policy.minAmount || 0);
      const policyMax = Number(policy.maxAmount || 0);
      if (policyMin > 0 && nextAmount < policyMin) return res.status(400).json({ success: false, message: `Minimum amount for ${policy.name} is KSh ${policyMin.toLocaleString("en-KE")}.` });
      if (policyMax > 0 && nextAmount > policyMax) return res.status(400).json({ success: false, message: `Maximum amount for ${policy.name} is KSh ${policyMax.toLocaleString("en-KE")}.` });
    }

    await reserveApprovedPermission({
      memberId: req.user._id,
      sourceModel: "SupportRequest",
      sourceType: "support",
      sourceId: item._id,
      requestedAction: "edit",
      permissionRequestId,
    });
    permissionReserved = true;

    // Member permission only grants these explicitly allow-listed fields.
    item.description = nextDescription;
    if (amountWasChanged) item.requestedAmount = nextAmount;
    item.documents = documents;
    item.timeline.push({ status: item.status, remarks: "Member updated an approved support-request field after administrator permission was granted.", updatedBy: req.user._id, updatedByModel: "Member" });
    await item.save();

    await createAuditLog({
      user: req.user._id,
      userRole: req.user.role,
      action: "SUPPORT_REQUEST_UPDATED",
      module: "Support",
      description: `Member updated support request ${item._id} using approved permission ${permissionRequestId}.`,
      req,
      metadata: { supportRequestId: item._id, permissionRequestId },
    });
    permissionReserved = false;
    return res.json({ success: true, message: "Support request updated successfully with administrator permission.", request: { ...item.toObject(), documents: normalizeDocuments(item.documents) } });
  } catch (error) {
    if (permissionReserved) await releaseConsumedPermission(permissionRequestId, req.user?._id);
    return res.status(error.status || 500).json({ success: false, code: error.code, message: error.message });
  }
};


exports.memberRemove = async (req, res) => {
  let permissionRequestId = String(req.body?.permissionRequestId || req.query?.permissionRequestId || "").trim();
  let permissionReserved = false;
  try {
    const item = await SupportRequest.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Support request not found." });
    const denied = validateMemberEditable(item, req.user._id);
    if (denied) return res.status(denied.status).json({ success: false, message: denied.message });

    await reserveApprovedPermission({
      memberId: req.user._id,
      sourceModel: "SupportRequest",
      sourceType: "support",
      sourceId: item._id,
      requestedAction: "delete",
      permissionRequestId,
    });
    permissionReserved = true;

    const deletedId = item._id;
    await item.deleteOne();
    await createAuditLog({
      user: req.user._id,
      userRole: req.user.role,
      action: "SUPPORT_REQUEST_DELETED",
      module: "Support",
      description: `Member deleted support request ${deletedId} using approved permission ${permissionRequestId}.`,
      req,
      metadata: { supportRequestId: deletedId, permissionRequestId },
    });
    permissionReserved = false;
    return res.json({ success: true, message: "Support request deleted successfully with administrator permission." });
  } catch (error) {
    if (permissionReserved) await releaseConsumedPermission(permissionRequestId, req.user?._id);
    return res.status(error.status || 500).json({ success: false, code: error.code, message: error.message });
  }
};


exports.update = async (req, res) => {
  try {
    const item = await SupportRequest.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Support request not found." });
    }

    const { status, approvedAmount, rejectionReason, remarks, settlementTransactionId } = req.body;

    if (status) {
      const allowed = {
        Pending: ["Under Review", "Documents Required", "Rejected", "Cancelled"],
        "Under Review": ["Documents Required", "Eligibility Review", "Approval Review", "Rejected", "Cancelled"],
        "Documents Required": ["Under Review", "Eligibility Review", "Rejected", "Cancelled"],
        "Eligibility Review": ["Approval Review", "Documents Required", "Rejected", "Cancelled"],
        "Approval Review": ["Approved", "Documents Required", "Rejected", "Cancelled"],
        Approved: ["Disbursement Pending", "Closed"],
        "Disbursement Pending": ["Paid", "Closed"],
        Paid: ["Completed", "Closed"],
        Completed: [], Rejected: [], Cancelled: [], Closed: [],
      };
      const current = String(item.status || "Pending");
      const superAdmin = String(req.user?.role || "").toLowerCase() === "superadmin";
      if (!superAdmin && current !== status && !allowed[current]?.includes(status)) return res.status(409).json({ success: false, message: `Cannot move a ${current} support request directly to ${status}.` });
      if (status === "Paid" || status === "Completed") {
        const settlementId = String(settlementTransactionId || item.settlementTransactionId || "").trim();
        if (!mongoose.Types.ObjectId.isValid(settlementId)) return res.status(400).json({ success:false, code:"SETTLEMENT_TRANSACTION_REQUIRED", message:"Select a completed authoritative Finance settlement transaction before finalizing this support request." });
        const settlement = await Finance.findOne({ _id:settlementId, type:"claim", status:"completed" }).lean();
        if (!settlement) return res.status(409).json({ success:false, code:"SETTLEMENT_TRANSACTION_INVALID", message:"The selected Finance settlement is not completed." });
        if (settlement.member && String(settlement.member) !== String(item.member)) return res.status(409).json({ success:false, code:"SETTLEMENT_MEMBER_MISMATCH", message:"The selected settlement belongs to a different member." });
        if (settlement.sourceId && String(settlement.sourceId) !== String(item._id)) return res.status(409).json({ success:false, code:"SETTLEMENT_SOURCE_MISMATCH", message:"The selected settlement is linked to a different claim." });
        item.settlementTransactionId = settlement._id;
        item.settlementTransactionModel = "Finance";
      }
      item.status = status;
    }
    if (approvedAmount !== undefined) item.approvedAmount = Math.max(0, Number(approvedAmount) || 0);
    if (rejectionReason !== undefined) item.rejectionReason = rejectionReason;
    if (remarks !== undefined) item.remarks = remarks;

    item.processedBy = req.user._id;
    item.processedByModel = String(req.user?.role || "").toLowerCase() === "superadmin" ? "SuperAdmin" : "Admin";
    item.timeline.push({
      status: item.status,
      remarks: remarks || rejectionReason || "Status updated",
      updatedBy: req.user._id,
      updatedByModel: String(req.user?.role || "").toLowerCase() === "superadmin" ? "SuperAdmin" : "Admin",
    });

    await item.save();
    return res.json({
      success: true,
      request: {
        ...item.toObject(),
        documents: normalizeDocuments(item.documents),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const item = await SupportRequest.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Support request not found." });
    }

    await createAuditLog({
      action: "DELETE_SUPPORT_REQUEST",
      performedBy: req.user._id,
      performedByModel: req.user.role === "superadmin" ? "SuperAdmin" : "Admin",
      entityType: "SupportRequest",
      entityId: item._id,
      details: { status: item.status, member: item.member, approvedAmount: item.approvedAmount },
    });
    await SupportRequest.deleteOne({ _id: item._id });

    return res.json({
      success: true,
      message: "Support request deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
