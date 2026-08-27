const SupportRequest = require("../models/SupportRequest");
const Policy = require("../models/Policy");
const { resolveStoredFileUrl } = require("../utils/uploadUrl");

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
    const policyMax = Number(policy?.maxAmount || 0);
    const policyMin = Number(policy?.minAmount || 0);
    if (policyMin > 0 && amount < policyMin) return res.status(400).json({ success:false, message:`Minimum amount for ${policy.name} is KSh ${policyMin.toLocaleString("en-KE")}.` });
    if (policyMax > 0 && amount > policyMax) return res.status(400).json({ success:false, message:`Maximum amount for ${policy.name} is KSh ${policyMax.toLocaleString("en-KE")}.` });

    const item = await SupportRequest.create({
      member: req.user._id,
      supportType: asText(supportType),
      policySlug: asText(policySlug),
      policyName: asText(policyName),
      description: asText(description),
      requestedAmount: amount,
      approvedAmount: 0,
      repaymentEnabled: Boolean(policy?.repaymentEnabled),
      repaymentMonths: Number(policy?.repaymentMonths || 12),
      interestRate: Number(policy?.interestRate || 0),
      documents: attachments,
      timeline: [
        {
          status: "Pending",
          remarks: "Application submitted by member",
          updatedBy: req.user._id,
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
    const requests = await SupportRequest.find({ member: req.user._id })
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
  try {
    const item = await SupportRequest.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Support request not found." });
    const denied = validateMemberEditable(item, req.user._id);
    if (denied) return res.status(denied.status).json({ success: false, message: denied.message });

    const incomingDocuments = buildAttachmentList(req);
    const keepDocuments = normalizeDocuments(req.body.keepDocuments ? safeParse(req.body.keepDocuments, []) : item.documents);
    const documents = [...keepDocuments, ...incomingDocuments];
    const documentError = validateMinimumDocuments(documents);
    if (documentError) return res.status(400).json({ success: false, message: documentError });

    const { description, requestedAmount, supportType, policySlug, policyName } = req.body || {};
    if (description !== undefined) item.description = asText(description);
    if (supportType !== undefined) item.supportType = asText(supportType);
    if (policySlug !== undefined) item.policySlug = asText(policySlug);
    if (policyName !== undefined) item.policyName = asText(policyName);
    if (requestedAmount !== undefined) {
      const amount = Number(requestedAmount);
      if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ success: false, message: "Requested amount must be a positive number." });
      item.requestedAmount = amount;
    }
    item.documents = documents;
    item.timeline.push({ status: item.status, remarks: "Member updated support request details while Under Review.", updatedBy: req.user._id });
    await item.save();
    return res.json({ success: true, message: "Support request updated successfully.", request: { ...item.toObject(), documents: normalizeDocuments(item.documents) } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.memberRemove = async (req, res) => {
  try {
    const item = await SupportRequest.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Support request not found." });
    const denied = validateMemberEditable(item, req.user._id);
    if (denied) return res.status(denied.status).json({ success: false, message: denied.message });
    await item.deleteOne();
    return res.json({ success: true, message: "Support request deleted successfully while it was still Under Review." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const item = await SupportRequest.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Support request not found." });
    }

    const { status, approvedAmount, rejectionReason, remarks } = req.body;

    if (status) item.status = status;
    if (approvedAmount !== undefined) item.approvedAmount = Number(approvedAmount) || 0;
    if (rejectionReason !== undefined) item.rejectionReason = rejectionReason;
    if (remarks !== undefined) item.remarks = remarks;

    item.processedBy = req.user._id;
    item.timeline.push({
      status: item.status,
      remarks: remarks || rejectionReason || "Status updated",
      updatedBy: req.user._id,
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

    await SupportRequest.deleteOne({ _id: item._id });

    return res.json({
      success: true,
      message: "Support request deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
