const MedicalSupport = require("../models/MedicalSupport");
const FuneralSupport = require("../models/FuneralSupport");
const EducationSupport = require("../models/EducationSupport");
const SupportRequest = require("../models/SupportRequest");
const createNotification = require("../utils/createNotification");
const CommunityAssistance = require("../models/CommunityAssistance");
const Member = require("../models/Member");
const Admin = require("../models/Admin");
const SuperAdmin = require("../models/SuperAdmin");
const News = require("../models/News");
const createAuditLog = require("../utils/createAuditLog");
const Notification = require("../models/Notification");
const SupportRequestPermissionRequest = require("../models/SupportRequestPermissionRequest");
const mongoose = require("mongoose");
const crypto = require("crypto");
const redisCache = require("../services/redisCache");
const Finance = require("../models/Finance");

const MODEL_MAP = { medical: MedicalSupport, funeral: FuneralSupport, education: EducationSupport, support: SupportRequest };
const LABEL_MAP = { medical: "Medical", funeral: "Funeral", education: "Education", support: "Support" };
const STAGES = ["Pending", "Under Review", "Documents Required", "Eligibility Review", "Approval Review", "Approved", "Disbursement Pending", "Paid", "Completed", "Rejected", "Cancelled", "Closed"];

const buildPublicClaimNews = ({ key, claim, now = new Date() }) => {
  const label = LABEL_MAP[key] || "Support";
  const sourceKey = `${key}:${String(claim?._id || "")}`;
  const hash = crypto.createHash("sha256").update(sourceKey).digest("hex");
  const title = `Benevolent MIDAX ${label} Support Update`;
  const summary = `A ${label.toLowerCase()} support case has been approved through the Benevolent MIDAX support process.`;
  const content = [
    `Benevolent MIDAX has approved a ${label.toLowerCase()} support case through its member support process.`,
    "",
    "This public update intentionally excludes member identity, contact details, personal identifiers, financial amounts, private circumstances, internal review notes and submitted evidence.",
    "",
    `Publication date: ${new Date(now).toLocaleDateString("en-KE", { day: "2-digit", month: "long", year: "numeric", timeZone: "Africa/Nairobi" })}.`,
  ].join("\n");
  return {
    title,
    summary,
    content,
    category: "Announcement",
    slug: `claim-${key}-${hash.slice(0, 20)}`,
    newsId: new mongoose.Types.ObjectId(hash.slice(0, 24)),
  };
};

const notifyNewsPublication = async ({ news, actorId, actorModel }) => {
  const members = await Member.find({ status: "active", isDeleted: false }).select("_id").lean();
  if (!members.length) return { targeted: 0, created: 0 };
  const rows = await Promise.all(members.map(async (member) => {
    const notification = await createNotification({
      recipient: member._id,
      recipientModel: "Member",
      sender: actorId,
      senderModel: actorModel,
      title: "New Benevolent MIDAX News Published",
      message: "A new Benevolent MIDAX news update has been published. Open News to view the latest update.",
      type: "news",
      referenceId: news._id,
      referenceModel: "News",
      link: `/news?newsId=${news._id}`,
      icon: "campaign",
      metadata: { publication: "claim", sourceModel: news.sourceModel, sourceId: news.sourceId },
    });
    return notification;
  }));
  return { targeted: members.length, created: rows.filter(Boolean).length };
};

function modelFor(type) {
  const key = String(type || "").toLowerCase();
  return MODEL_MAP[key] ? { key, Model: MODEL_MAP[key] } : null;
}

async function getClaim(type, id) {
  const meta = modelFor(type);
  if (!meta) throw new Error("Unsupported claim type.");
  const claim = await meta.Model.findById(id);
  if (!claim) { const error = new Error("Claim not found."); error.status = 404; throw error; }
  return { ...meta, claim };
}


const actorModelForRequest = (req) => {
  const role = String(req.user?.role || "").toLowerCase();
  return role === "superadmin" ? "SuperAdmin" : role === "admin" ? "Admin" : "Member";
};

async function getSettlementCandidates(claim) {
  const sourceModel = claim?.constructor?.modelName || "";
  const linked = claim?.settlementTransactionId ? await Finance.findById(claim.settlementTransactionId).lean() : null;
  const filter = { type:"claim", member:claim.member || null, status:{ $in:["approved","completed"] }, amount:{ $gt:0 } };
  const rows = await Finance.find(filter).sort({ transactionDate:-1, createdAt:-1 }).limit(100).lean();
  const candidates = rows.filter((row) => !row.sourceId || (String(row.sourceId) === String(claim._id) && String(row.sourceModel || "") === sourceModel) || String(row._id) === String(claim.settlementTransactionId));
  return { linked, candidates };
}

function validateTransition(current, next) {
  const allowed = {
    Pending: ["Under Review", "Documents Required", "Rejected", "Cancelled"],
    "Under Review": ["Documents Required", "Eligibility Review", "Approval Review", "Rejected", "Cancelled"],
    "Documents Required": ["Under Review", "Eligibility Review", "Rejected", "Cancelled"],
    "Eligibility Review": ["Approval Review", "Documents Required", "Rejected", "Cancelled"],
    "Approval Review": ["Approved", "Documents Required", "Rejected", "Cancelled"],
    Approved: ["Disbursement Pending", "Closed"],
    "Disbursement Pending": ["Paid", "Closed"],
    Paid: ["Completed", "Closed"],
    Completed: [], Rejected: [], Cancelled: [], Closed: []
  };
  if (current === next) return true;
  return Boolean(allowed[current]?.includes(next));
}

exports.statuses = async (_req, res) => res.json({ success: true, stages: STAGES });

exports.updateStage = async (req, res) => {
  try {
    const result = await getClaim(req.params.type, req.params.id);
    const nextStatus = String(req.body?.status || "").trim();
    const remarks = String(req.body?.remarks || "").trim();
    const reason = String(req.body?.rejectionReason || "").trim();
    if (!STAGES.includes(nextStatus)) return res.status(400).json({ success: false, message: "Invalid claim review stage." });
    const isSuperAdmin = String(req.user?.role || "").toLowerCase() === "superadmin";
    const currentStatus = String(result.claim.status || "Pending");
    const terminalStatuses = ["Closed", "Rejected", "Cancelled"];
    const reopenStatuses = ["Pending", "Under Review", "Documents Required", "Eligibility Review", "Approval Review"];
    const reopening = isSuperAdmin && terminalStatuses.includes(currentStatus) && reopenStatuses.includes(nextStatus);
    // SuperAdmin is permitted to correct any valid stage directly. Admins
    // remain constrained by the approved workflow transition matrix.
    if (!isSuperAdmin && !validateTransition(currentStatus, nextStatus)) {
      return res.status(409).json({ success: false, message: `Cannot move a ${currentStatus} claim directly to ${nextStatus}.` });
    }
    const settlementId = String(req.body?.settlementTransactionId || result.claim.settlementTransactionId || "").trim();
    if ((nextStatus === "Paid" || nextStatus === "Completed")) {
      if (!settlementId || !mongoose.Types.ObjectId.isValid(settlementId)) return res.status(400).json({ success:false, code:"SETTLEMENT_TRANSACTION_REQUIRED", message:"Select an authoritative Finance settlement transaction before marking this claim Paid or Completed." });
      const settlement = await Finance.findOne({ _id:settlementId, type:"claim", status:"completed" }).lean();
      if (!settlement) return res.status(409).json({ success:false, code:"SETTLEMENT_TRANSACTION_INVALID", message:"The selected settlement is not a completed authoritative claim-finance transaction." });
      if (settlement.member && String(settlement.member) !== String(result.claim.member)) return res.status(409).json({ success:false, code:"SETTLEMENT_MEMBER_MISMATCH", message:"The selected settlement belongs to a different member." });
      if (settlement.sourceId && String(settlement.sourceId) !== String(result.claim._id)) return res.status(409).json({ success:false, code:"SETTLEMENT_SOURCE_MISMATCH", message:"The selected settlement is linked to a different claim." });
    }
    if (nextStatus === "Rejected" && !reason && !remarks) return res.status(400).json({ success: false, message: "A rejection reason is required." });

    if (req.body?.approvedAmount !== undefined) result.claim.approvedAmount = Math.max(0, Number(req.body.approvedAmount) || 0);
    if (req.body?.interestRate !== undefined && "interestRate" in result.claim) result.claim.interestRate = Math.max(0, Number(req.body.interestRate) || 0);
    if (req.body?.repaymentPeriodMonths !== undefined && "repaymentPeriodMonths" in result.claim) result.claim.repaymentPeriodMonths = Math.max(1, Number(req.body.repaymentPeriodMonths) || 12);
    if (nextStatus === "Approved" && result.key === "support") {
      const Policy = require("../models/Policy");
      const policy = result.claim.policySlug
        ? await Policy.findOne({ slug: result.claim.policySlug, enabled: true }).lean()
        : null;
      const educationRepayable = Boolean(
        policy?.repaymentEnabled &&
        policy?.category === "loan" &&
        policy?.slug === "education-policy"
      );
      result.claim.repaymentEnabled = educationRepayable;
      result.claim.interestRate = educationRepayable ? Number(policy.interestRate || 0) : 0;
      result.claim.repaymentMonths = educationRepayable ? Number(policy.repaymentMonths || 12) : 12;
    }
    if (nextStatus === "Approved") result.claim.approvedAmount = Number(result.claim.approvedAmount || result.claim.requestedAmount || 0);
    result.claim.status = nextStatus;
    if (reopening) {
      result.claim.rejectionReason = "";
      result.claim.reviewNotes = remarks || `Case reopened from ${currentStatus} by SuperAdmin.`;
      result.claim.reopenedAt = new Date();
      if ("reopenedBy" in result.claim) result.claim.reopenedBy = req.user._id;
    } else {
      result.claim.rejectionReason = nextStatus === "Rejected" ? (reason || remarks) : (result.claim.rejectionReason || "");
    }
    result.claim.remarks = remarks || result.claim.remarks || "";
    result.claim.reviewNotes = remarks || result.claim.reviewNotes || "";
    result.claim.reviewedAt = new Date();
    const actorModel = actorModelForRequest(req);
    if ("processedBy" in result.claim) { result.claim.processedBy = req.user._id; result.claim.processedByModel = actorModel === "Member" ? null : actorModel; }
    if ("updatedBy" in result.claim) { result.claim.updatedBy = req.user._id; result.claim.updatedByModel = actorModel; }
    if (nextStatus === "Approved" && "approvalDate" in result.claim) result.claim.approvalDate = new Date();
    if (nextStatus === "Disbursement Pending" && "disbursementDate" in result.claim) result.claim.disbursementDate = null;
    if ((nextStatus === "Paid" || nextStatus === "Completed") && "settlementTransactionId" in result.claim) result.claim.settlementTransactionId = new mongoose.Types.ObjectId(settlementId);
    if (nextStatus === "Paid" && "paidAmount" in result.claim) {
      const paidAmount = Number(req.body?.paidAmount ?? result.claim.approvedAmount ?? result.claim.requestedAmount ?? 0);
      if (!Number.isFinite(paidAmount) || paidAmount <= 0) return res.status(400).json({ success: false, code: "PAID_AMOUNT_REQUIRED", message: "Enter the amount actually paid before marking this claim Paid." });
      result.claim.paidAmount = paidAmount;
    }
    if ((nextStatus === "Paid" || nextStatus === "Completed") && "disbursementDate" in result.claim && !result.claim.disbursementDate) result.claim.disbursementDate = new Date();

    if (!Array.isArray(result.claim.timeline)) result.claim.timeline = [];
    result.claim.timeline.push({ status: nextStatus, remarks: remarks || reason || `Claim moved to ${nextStatus}.`, updatedBy: req.user._id, updatedByModel: actorModel, date: new Date() });
    await result.claim.save();

    await createNotification({ recipient: result.claim.member, recipientModel: "Member", sender: req.user._id, senderModel: req.user.role === "superadmin" ? "SuperAdmin" : "Admin", title: `${LABEL_MAP[result.key]} claim: ${nextStatus}`, message: reopening ? (remarks || `Your ${LABEL_MAP[result.key].toLowerCase()} claim has been reopened for further review.`) : (remarks || reason || `Your ${LABEL_MAP[result.key].toLowerCase()} claim has moved to ${nextStatus}.`), type: "claim", referenceId: result.claim._id, referenceModel: result.Model.modelName, icon: reopening ? "history" : nextStatus === "Rejected" ? "cancel" : nextStatus === "Approved" ? "check_circle" : "pending" });
    return res.json({ success: true, claim: result.claim, stages: STAGES });
  } catch (error) { return res.status(error.status || 500).json({ success: false, message: error.message }); }
};

exports.list = async (req, res) => {
  try {
    const rawPage = Number(req.query?.page || 1);
    const rawLimit = Number(req.query?.limit || 20);
    const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
    const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 50) : 20;
    const requestedStatus = String(req.query?.status || "").trim();
    const requestedType = String(req.query?.type || req.query?.sourceType || "").trim().toLowerCase();
    const search = String(req.query?.search || "").trim();
    const id = String(req.query?.id || "").trim();
    const sortDirection = String(req.query?.sort || "newest").toLowerCase() === "oldest" ? 1 : -1;

    if (requestedType && !MODEL_MAP[requestedType]) return res.status(400).json({ success: false, message: "Unsupported claim type filter." });
    if (id && !require("mongoose").Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid claim reference." });

    let memberIds = null;
    if (search) {
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const memberRegex = new RegExp(safeSearch, "i");
      const members = await Member.find({
        isDeleted: { $ne: true },
        $or: [{ fullName: memberRegex }, { memberNumber: memberRegex }, { email: memberRegex }, { phone: memberRegex }],
      }).select("_id").limit(200).lean();
      memberIds = members.map((member) => member._id);
    }

    const escapedSearch = search ? search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "";
    const searchRegex = escapedSearch ? new RegExp(escapedSearch, "i") : null;
    const genericSearchFields = [
      "description", "purpose", "hospitalName", "hospitalLocation", "diagnosis",
      "deceasedName", "burialLocation", "supportType",
      "policyName", "status", "rejectionReason", "reviewNotes",
    ];
    const buildFilter = () => {
      const filter = { isDeleted: { $ne: true } };
      if (id) filter._id = id;
      if (requestedStatus) filter.status = requestedStatus;
      if (memberIds) {
        filter.$or = [
          ...(memberIds.length ? [{ member: { $in: memberIds } }] : []),
          ...(searchRegex ? genericSearchFields.map((field) => ({ [field]: searchRegex })) : []),
        ];
        if (!filter.$or.length) filter.$or = [{ _id: { $in: [] } }];
      } else if (searchRegex) {
        filter.$or = genericSearchFields.map((field) => ({ [field]: searchRegex }));
      }
      return filter;
    };

    const selectedKeys = requestedType ? [requestedType] : Object.keys(MODEL_MAP);
    // Fetch enough rows from every source to construct the globally sorted page.
    // Each collection is independently sorted, then the merged slice is returned.
    const sourceLimit = Math.min(page * limit, 1000);
    const results = await Promise.all(selectedKeys.map(async (key) => {
      const Model = MODEL_MAP[key];
      const filter = buildFilter();
      let query = Model.find(filter)
        .populate("member", "fullName memberNumber phone email profileImage position employer")
        .sort({ createdAt: sortDirection })
        .limit(sourceLimit)
        .lean();
      if (key === "medical") query = query.populate("dependent", "fullName relationship gender dateOfBirth nationalId phone email county address employmentStatus medicalConditions isNextOfKin");
      if (key !== "support") query = query.populate("dependent", "fullName relationship gender dateOfBirth nationalId phone email county address employmentStatus medicalConditions isNextOfKin");
      const [rows, total] = await Promise.all([query, Model.countDocuments(filter)]);
      return { key, rows, total };
    }));

    const normalize = (key, arr) => arr.map((x) => ({
      ...x,
      supportType: LABEL_MAP[key],
      sourceType: key,
      amount: Number(x.approvedAmount || x.requestedAmount || 0),
      timeline: Array.isArray(x.timeline) ? x.timeline : [],
      provenance: { createdBy:x.createdBy || null, createdByModel:x.createdByModel || null, processedBy:x.processedBy || null, processedByModel:x.processedByModel || null, updatedBy:x.updatedBy || null, updatedByModel:x.updatedByModel || null, approvedBy:x.approvedBy || null, approvedByModel:x.approvedByModel || null, hiddenBy:x.hiddenBy || null, hiddenByModel:x.hiddenByModel || null, deletedBy:x.deletedBy || null, deletedByModel:x.deletedByModel || null },
      ...(key === "education" ? {
        repaymentEnabled: Boolean(x.repaymentEnabled),
        interestRate: Number(x.interestRate || 0),
        repaymentMonths: Number(x.repaymentPeriodMonths || x.repaymentMonths || 12),
        monthlyInstallment: Number(x.monthlyInstallment || 0),
        amountPaid: Number(x.amountPaid || 0),
        balance: Number(x.balance || 0),
      } : {}),
    }));
    const allRows = results
      .flatMap(({ key, rows }) => normalize(key, rows))
      .sort((a, b) => {
        const aDate = new Date(a.createdAt || a.applicationDate || 0).getTime();
        const bDate = new Date(b.createdAt || b.applicationDate || 0).getTime();
        return (bDate - aDate) * (sortDirection === 1 ? -1 : 1);
      });
    const total = results.reduce((sum, item) => sum + item.total, 0);
    const startIndex = (page - 1) * limit;
    const claims = allRows.slice(startIndex, startIndex + limit);
    const pages = Math.max(1, Math.ceil(total / limit));

    return res.json({ success: true, count: total, total, page, pages, limit, records: claims, claims, stages: STAGES });
  } catch (error) {
    console.error("Claim list error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.settlements = async (req, res) => {
  try {
    const result = await getClaim(req.params.type, req.params.id);
    const { linked, candidates } = await getSettlementCandidates(result.claim);
    return res.json({ success:true, linked: linked ? { ...linked, sourceType: result.key } : null, settlements:candidates.map((row) => ({ _id:row._id, transactionNumber:row.transactionNumber, amount:Number(row.amount||0), status:row.status, paymentMethod:row.paymentMethod, receiptNumber:row.receiptNumber || "", referenceNumber:row.referenceNumber || "", transactionDate:row.transactionDate, sourceId:row.sourceId || null, sourceModel:row.sourceModel || null })) });
  } catch (error) { return res.status(error.status || 500).json({ success:false, message:error.message }); }
};

exports.publishNewsPreview = async (req, res) => {
  try {
    const result = await getClaim(req.params.type, req.params.id);
    const status = String(result.claim.status || "Pending");
    if (!["Approved", "Paid", "Completed"].includes(status)) {
      return res.status(400).json({ success: false, message: "Only an approved, paid, or completed support case can be published as public News." });
    }
    if (result.claim.publishedToNews || result.claim.publishedNewsId) {
      const existing = result.claim.publishedNewsId ? await News.findById(result.claim.publishedNewsId).lean() : await News.findOne({ sourceModel: result.Model.modelName, sourceId: String(result.claim._id) }).lean();
      if (existing) {
        if (!result.claim.publishedBy && existing.author) {
          result.claim.publishedBy = existing.author;
          result.claim.publishedByModel = existing.authorModel || null;
          await result.claim.save();
        }
        return res.status(409).json({ success: false, code: "CLAIM_ALREADY_PUBLISHED", message: "This claim has already been published to News.", news: existing });
      }
    }
    const preview = buildPublicClaimNews({ key: result.key, claim: result.claim });
    return res.json({ success: true, preview: { title: preview.title, summary: preview.summary, content: preview.content, category: preview.category } });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const result = await getClaim(req.params.type, req.params.id);
    await result.claim.populate("member", "fullName memberNumber phone email profileImage position employer");
    if (result.key !== "support") {
      await result.claim.populate("dependent", "fullName relationship gender dateOfBirth nationalId phone email county address employmentStatus medicalConditions isNextOfKin");
    }
    await result.claim.populate([
      "createdBy",
      "processedBy",
      "updatedBy",
      "approvedBy",
      "hiddenBy",
      "deletedBy",
      "publishedBy",
      "timeline.updatedBy",
      { path: "publishedNewsId", select: "author authorModel publishDate status published", populate: { path: "author", select: "fullName email" } },
    ]);
    const normalized = {
      ...result.claim.toObject(),
      supportType: LABEL_MAP[result.key],
      sourceType: result.key,
      amount: Number(result.claim.approvedAmount || result.claim.requestedAmount || 0),
      paidAmount: Number(result.claim.paidAmount ?? result.claim.amountPaid ?? result.claim.amountPaidOut ?? 0),
      timeline: Array.isArray(result.claim.timeline) ? result.claim.timeline : [],
      provenance: {
        createdBy: result.claim.createdBy || null, createdByModel: result.claim.createdByModel || null,
        processedBy: result.claim.processedBy || null, processedByModel: result.claim.processedByModel || null,
        updatedBy: result.claim.updatedBy || null, updatedByModel: result.claim.updatedByModel || null,
        approvedBy: result.claim.approvedBy || null, approvedByModel: result.claim.approvedByModel || null,
        hiddenBy: result.claim.hiddenBy || null, hiddenByModel: result.claim.hiddenByModel || null,
        deletedBy: result.claim.deletedBy || null, deletedByModel: result.claim.deletedByModel || null,
        publishedBy: result.claim.publishedBy || result.claim.publishedNewsId?.author || null,
        publishedByModel: result.claim.publishedByModel || result.claim.publishedNewsId?.authorModel || null,
      },
    };
    if (result.key === "education") {
      normalized.repaymentEnabled = Boolean(result.claim.repaymentEnabled);
      normalized.repaymentMonths = Number(result.claim.repaymentPeriodMonths || result.claim.repaymentMonths || 12);
      normalized.monthlyInstallment = Number(result.claim.monthlyInstallment || 0);
      normalized.amountPaid = Number(result.claim.amountPaid || 0);
      normalized.balance = Number(result.claim.balance || 0);
    }
    return res.json({ success: true, claim: normalized });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};


exports.hideFromMember = async (req, res) => {
  try {
    if (!["admin","superadmin"].includes(String(req.user?.role || "").toLowerCase())) {
      return res.status(403).json({ success: false, code: "CLAIM_HIDE_FORBIDDEN", message: "Only authorized Admin or SuperAdmin accounts can hide a claim from the member view." });
    }
    const result = await getClaim(req.params.type, req.params.id);
    if (result.claim.memberVisible === false) {
      return res.status(409).json({ success: false, code: "CLAIM_ALREADY_HIDDEN", message: "This claim is already hidden from the member view." });
    }
    result.claim.memberVisible = false;
    result.claim.hiddenAt = new Date();
    result.claim.hiddenBy = req.user._id;
    result.claim.hiddenByModel = actorModelForRequest(req);
    await result.claim.save();
    await createAuditLog({
      user: req.user._id,
      userRole: req.user.role,
      action: "CLAIM_HIDDEN_FROM_MEMBER",
      module: "Claim",
      description: `${actorModelForRequest(req)} hid ${LABEL_MAP[result.key]} claim ${result.claim._id} from the member view.`,
      req,
      metadata: { claimId: String(result.claim._id), claimType: result.key, memberId: String(result.claim.member || "") },
    });
    return res.json({ success: true, hidden: true, claimId: result.claim._id, message: "Claim hidden from the member view. The claim remains available to authorized staff." });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

exports.unhideForMember = async (req, res) => {
  try {
    const role = String(req.user?.role || "").toLowerCase();
    if (!["admin","superadmin"].includes(role)) return res.status(403).json({ success:false, code:"CLAIM_UNHIDE_FORBIDDEN", message:"Only Admin or SuperAdmin can unhide a claim." });
    const result = await getClaim(req.params.type, req.params.id);
    if (result.claim.memberVisible !== false) return res.status(409).json({ success:false, code:"CLAIM_ALREADY_VISIBLE", message:"This claim is already visible to the member." });
    result.claim.memberVisible = true; result.claim.hiddenAt = null; result.claim.hiddenBy = null; result.claim.hiddenByModel = null;
    if ("updatedBy" in result.claim) { result.claim.updatedBy = req.user._id; result.claim.updatedByModel = actorModelForRequest(req); }
    await result.claim.save();
    await createAuditLog({ user:req.user._id, userRole:req.user.role, action:"CLAIM_UNHIDDEN_FOR_MEMBER", module:"Claims", description:`Unhid ${result.key} claim ${result.claim._id} for member visibility.`, req, metadata:{ claimId:result.claim._id, claimType:result.key } });
    return res.json({ success:true, claim:result.claim, message:"Claim is visible to the member again." });
  } catch (error) { return res.status(error.status || 500).json({ success:false, message:error.message }); }
};

exports.permanentDeleteImpact = async (req, res) => {
  try {
    if (String(req.user?.role || "").toLowerCase() !== "superadmin") return res.status(403).json({ success:false, code:"CLAIM_DELETE_FORBIDDEN", message:"Only SuperAdmin can permanently delete claims." });
    const result = await getClaim(req.params.type, req.params.id);
    const [communityCount, notificationCount, newsCount, settlement] = await Promise.all([
      CommunityAssistance.countDocuments({ referenceModel:result.Model.modelName, referenceId:result.claim._id }),
      Notification.countDocuments({ referenceModel:result.Model.modelName, referenceId:result.claim._id }),
      News.countDocuments({ sourceModel:result.Model.modelName, sourceId:String(result.claim._id) }),
      result.claim.settlementTransactionId ? Finance.findById(result.claim.settlementTransactionId).select("transactionNumber amount status transactionDate paymentMethod").lean() : null,
    ]);
    return res.json({ success:true, impact:{ type:result.key, status:result.claim.status, member:result.claim.member || null, linkedFinancialRecords:settlement ? 1 : 0, settlement, communityAssistance:communityCount, notifications:notificationCount, publications:newsCount } });
  } catch (error) { return res.status(error.status || 500).json({ success:false, message:error.message }); }
};

exports.permanentDelete = async (req, res) => {
  try {
    if (String(req.user?.role || "").toLowerCase() !== "superadmin") {
      return res.status(403).json({ success: false, code: "CLAIM_PERMANENT_DELETE_FORBIDDEN", message: "Only SuperAdmin can permanently delete a claim." });
    }
    const result = await getClaim(req.params.type, req.params.id);
    const currentStatus = String(result.claim.status || "Pending").trim();

    const claimSnapshot = result.claim.toObject();
    // Write an audit record before destructive persistence. The completed
    // delete is also recorded below; audit failure is isolated by the shared
    // audit utility so a successfully persisted delete is not reported false.
    await createAuditLog({
      user: req.user._id,
      userRole: req.user.role,
      action: "CLAIM_PERMANENT_DELETE_REQUESTED",
      module: "Claim",
      description: `SuperAdmin requested permanent deletion of ${LABEL_MAP[result.key]} claim ${claimSnapshot._id}.`,
      req,
      metadata: { claimId: String(claimSnapshot._id), claimType: result.key, memberId: String(claimSnapshot.member || ""), status: currentStatus },
    });

    const relatedCampaigns = await CommunityAssistance.find({ referenceModel: result.Model.modelName, referenceId: result.claim._id }).lean();
    await result.claim.deleteOne();

    // Preserve settlement evidence where funds have already moved. Such a
    // campaign is de-linked from user-facing workflows but retained as an
    // accounting record. Unfunded/no-settlement campaigns are safe to remove.
    for (const campaign of relatedCampaigns) {
      try {
        const hasSettlementEvidence = Number(campaign.raisedAmount || 0) > 0
          || (Array.isArray(campaign.contributionTransactionIds) && campaign.contributionTransactionIds.length > 0)
          || Number(campaign.payoutAmount || 0) > 0
          || ["pending", "successful"].includes(String(campaign.payoutStatus || ""))
          || ["payout_pending", "paid"].includes(String(campaign.status || ""));
        if (!hasSettlementEvidence) {
          await CommunityAssistance.deleteOne({ _id: campaign._id });
        } else {
          await CommunityAssistance.updateOne(
            { _id: campaign._id },
            { $set: { sourceRemoved: true, sourceRemovedAt: new Date(), sourceRemovedBy: req.user._id } }
          );
        }
      } catch (cleanupError) {
        console.warn("Claim permanent-delete community-assistance cleanup warning:", cleanupError.message);
      }
    }


    // Remove only derived workflow records that would otherwise point users
    // back to a physically deleted claim. Audit logs are intentionally retained.
    const cleanupResults = await Promise.allSettled([
      Notification.deleteMany({ referenceModel: result.Model.modelName, referenceId: result.claim._id }),
      News.deleteMany({ sourceModel: result.Model.modelName, sourceId: String(result.claim._id) }),
      SupportRequestPermissionRequest.updateMany(
        { sourceModel: result.Model.modelName, sourceId: result.claim._id, status: { $in: ["Pending", "Approved"] } },
        { $set: { status: "Expired", reviewedAt: new Date(), reviewedBy: req.user._id, reviewedByModel: "SuperAdmin", reviewReason: "Source claim was permanently deleted by SuperAdmin." } }
      ),
    ]);
    try {
      const { invalidatePublicNewsCache } = require("../services/newsCache");
      await invalidatePublicNewsCache();
    } catch (cacheError) {
      console.warn("Claim permanent-delete news-cache cleanup warning:", cacheError.message);
    }
    cleanupResults.filter((entry) => entry.status === "rejected").forEach((entry) => {
      console.warn("Claim permanent-delete derived cleanup warning:", entry.reason?.message || entry.reason);
    });

    await createAuditLog({
      user: req.user._id,
      userRole: req.user.role,
      action: "CLAIM_PERMANENTLY_DELETED",
      module: "Claim",
      description: `SuperAdmin permanently deleted ${LABEL_MAP[result.key]} claim ${claimSnapshot._id}.`,
      req,
      metadata: { claimId: String(claimSnapshot._id), claimType: result.key, memberId: String(claimSnapshot.member || ""), status: currentStatus, communityCampaignsFound: relatedCampaigns.length },
    });

    // Secondary notifications/cache are not allowed to convert a completed
    // source deletion into a false failure. No claim remains to notify as a
    // normal claim-reference event, so Search & Attention will disappear by
    // source query on the next authoritative read.
    return res.json({ success: true, deleted: true, message: `${LABEL_MAP[result.key]} claim permanently deleted. Accounting evidence remains protected where settlement required it.` });
  } catch (error) {
    console.error("Permanent claim delete error:", error);
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    if (String(req.user?.role || "").toLowerCase() !== "superadmin") {
      return res.status(403).json({ success: false, message: "Only SuperAdmin can delete a claim." });
    }
    const result = await getClaim(req.params.type, req.params.id);
    if (result.claim.isDeleted) return res.status(409).json({ success:false, code:"CLAIM_ALREADY_ARCHIVED", message:"This claim has already been archived." });
    result.claim.isDeleted = true;
    result.claim.deletedAt = new Date();
    result.claim.deletedBy = req.user._id;
    if ("deletedByModel" in result.claim) result.claim.deletedByModel = actorModelForRequest(req);
    if ("updatedBy" in result.claim) { result.claim.updatedBy = req.user._id; result.claim.updatedByModel = actorModelForRequest(req); }
    await result.claim.save();
    await createAuditLog({ user:req.user._id, userRole:"superadmin", action:"ARCHIVE", module:"Claim", description:`Archived ${LABEL_MAP[result.key]} claim ${result.claim._id}`, req, metadata:{ claimId:String(result.claim._id), claimType:result.key, memberId:String(result.claim.member || "") } });
    return res.json({ success: true, message: `${LABEL_MAP[result.key]} claim archived. Financial and audit evidence has been preserved.` });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

exports.publishClaimToNews = async (req, res) => {
  try {
    const result = await getClaim(req.params.type, req.params.id);
    const status = String(result.claim.status || "Pending");
    if (!["Approved", "Paid", "Completed"].includes(status)) {
      return res.status(400).json({ success: false, code: "CLAIM_NEWS_STATUS_FORBIDDEN", message: "Only an approved, paid, or completed support case can be published as public News." });
    }

    const sourceModel = result.Model.modelName;
    const sourceId = String(result.claim._id);
    if (result.claim.publishedToNews || result.claim.publishedNewsId) {
      const existing = result.claim.publishedNewsId
        ? await News.findById(result.claim.publishedNewsId)
        : await News.findOne({ sourceModel, sourceId });
      if (existing) return res.status(409).json({ success: false, code: "CLAIM_ALREADY_PUBLISHED", message: "This claim has already been published to News.", news: existing });
    }

    const existingBySource = await News.findOne({ sourceModel, sourceId });
    if (existingBySource) {
      if (existingBySource.published && existingBySource.status === "published") {
        result.claim.publishedNewsId = existingBySource._id;
        result.claim.publishedToNews = true;
        result.claim.publishedAt = existingBySource.publishDate || existingBySource.createdAt || new Date();
        result.claim.publishedBy = existingBySource.author || req.user._id;
        result.claim.publishedByModel = existingBySource.authorModel || (String(req.user?.role || "").toLowerCase() === "superadmin" ? "SuperAdmin" : "Admin");
        await result.claim.save();
        return res.status(409).json({ success: false, code: "CLAIM_ALREADY_PUBLISHED", message: "This claim has already been published to News.", news: existingBySource });
      }
      return res.status(409).json({ success: false, code: "CLAIM_NEWS_SOURCE_CONFLICT", message: "A News record already exists for this claim and must be reconciled from the News manager before publishing again." });
    }

    const preview = buildPublicClaimNews({ key: result.key, claim: result.claim });
    const now = new Date();
    const payload = {
      title: preview.title,
      slug: preview.slug,
      summary: preview.summary,
      content: preview.content,
      category: preview.category,
      published: true,
      status: "published",
      publishDate: now,
      author: req.user._id,
      authorModel: String(req.user?.role || "admin").toLowerCase() === "superadmin" ? "SuperAdmin" : "Admin",
      sourceModel,
      sourceId,
      _id: preview.newsId,
    };

    let news;
    try {
      news = await News.create(payload);
    } catch (error) {
      if (error?.code === 11000) {
        news = await News.findOne({ _id: preview.newsId }) || await News.findOne({ sourceModel, sourceId });
        if (!news) throw error;
        if (news.published && news.status === "published") {
          result.claim.publishedNewsId = news._id;
          result.claim.publishedToNews = true;
          result.claim.publishedAt = news.publishDate || new Date();
          result.claim.publishedBy = news.author || req.user._id;
          result.claim.publishedByModel = news.authorModel || (String(req.user?.role || "").toLowerCase() === "superadmin" ? "SuperAdmin" : "Admin");
          await result.claim.save();
          return res.status(409).json({ success: false, code: "CLAIM_ALREADY_PUBLISHED", message: "This claim has already been published to News.", news });
        }
      } else {
        throw error;
      }
    }

    result.claim.publishedNewsId = news._id;
    result.claim.publishedToNews = true;
    result.claim.publishedAt = news.publishDate || now;
    result.claim.publishedBy = news.author || req.user._id;
    result.claim.publishedByModel = news.authorModel || (String(req.user?.role || "").toLowerCase() === "superadmin" ? "SuperAdmin" : "Admin");
    await result.claim.save();

    await createAuditLog({
      user: req.user._id,
      userRole: req.user.role,
      action: "CLAIM_PUBLISHED_TO_NEWS",
      module: "Claim",
      description: `Published ${LABEL_MAP[result.key]} claim ${result.claim._id} as public-safe News ${news._id}.`,
      req,
      metadata: { claimId: sourceId, claimType: result.key, newsId: String(news._id), publicSafe: true },
    });

    let notificationResult = { targeted: 0, created: 0 };
    try {
      notificationResult = await notifyNewsPublication({
        news,
        actorId: req.user._id,
        actorModel: payload.authorModel,
      });
    } catch (notificationError) {
      console.error("Claim-to-News notification creation failed after publication:", notificationError);
    }

    await redisCache.invalidatePrefix("public:news");

    if (notificationResult.targeted > 0 && notificationResult.created === 0) {
      return res.status(500).json({ success: false, code: "CLAIM_NEWS_NOTIFICATION_FAILED", published: true, newsId: news._id, message: "The News article was published, but the publication notification could not be confirmed. The article remains available on the News page." });
    }

    return res.status(201).json({
      success: true,
      published: true,
      news,
      notification: { targeted: notificationResult.targeted, created: notificationResult.created },
      message: "Claim published to News successfully. The article is now available on the News page and a notification has been created.",
    });
  } catch (error) {
    console.error("Claim-to-News publication error:", error);
    return res.status(error.status || 500).json({ success: false, message: error.message || "The claim could not be published to News. No incomplete publication was reported." });
  }
};

exports.publishCommunityToNews = async (req, res) => {
  try {
    const campaign = await CommunityAssistance.findById(req.params.id).populate("recipientMember", "fullName memberNumber");
    if (!campaign) return res.status(404).json({ success: false, message: "Community assistance request not found." });
    if (!campaign.enabled || !["open", "target_reached"].includes(campaign.status)) return res.status(400).json({ success: false, message: "Only an active community assistance request can be published." });
    const sourceModel = "CommunityAssistance";
    const sourceId = String(campaign._id);
    let news = await News.findOne({ sourceModel, sourceId });
    const title = campaign.title || "Community Support Request";
    const content = `${campaign.description || "A verified Benevolent MIDAX member has requested community assistance."}\n\nTarget: KSh ${Number(campaign.targetAmount || 0).toLocaleString("en-KE")}\nRaised so far: KSh ${Number(campaign.raisedAmount || 0).toLocaleString("en-KE")}\n\nCommunity members can support this verified request through the M-PESA community assistance option. Private identity, medical, funeral, education and contact details are intentionally omitted.`;
    const payload = { title, summary: "A verified community assistance request is open for member support.", content, category: "Announcement", published: true, status: "published", publishDate: new Date(), author: req.user._id, sourceModel, sourceId };
    if (news) { Object.assign(news, payload); await news.save(); }
    else news = await News.create(payload);
    return res.json({ success: true, news, message: "Community support request published to public News." });
  } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
};

exports.requestCommunityAssistance = async (req, res) => {
  try {
    const { referenceModel, referenceId, targetAmount, supportType } = req.body || {};
    const normalizedReferenceModel = String(referenceModel || "").trim();
    const normalizedSupportType = String(supportType || "").trim().toLowerCase();
    const aliases = {
      medicalsupport: "medical", medical: "medical",
      funeralsupport: "funeral", funeral: "funeral",
      educationsupport: "education", education: "education",
      supportrequest: "support", support: "support",
    };
    const requestedKey = aliases[normalizedReferenceModel.replace(/[^a-z]/gi, "").toLowerCase()] || aliases[normalizedSupportType];
    const orderedKeys = requestedKey ? [requestedKey, ...Object.keys(MODEL_MAP).filter((key) => key !== requestedKey)] : Object.keys(MODEL_MAP);
    if (!referenceId) return res.status(400).json({ success:false, message:"A claim reference is required." });

    let meta = null;
    let claim = null;
    for (const key of orderedKeys) {
      const candidate = await MODEL_MAP[key].findOne({ _id: referenceId, member: req.user._id });
      if (candidate) { meta = { key, Model: MODEL_MAP[key] }; claim = candidate; break; }
    }
    if (!meta || !claim) return res.status(404).json({ success:false, code:"CLAIM_NOT_FOUND", message:"We could not find that support claim in your account. Refresh your Claims page and try again." });
    if (String(claim.status || "").trim().toLowerCase() !== "rejected") return res.status(400).json({ success:false, message:"Community assistance is available after a declined claim." });

    const member = await Member.findById(req.user._id).select("fullName phone mpesaNumber");
    const target = Number(targetAmount || claim.requestedAmount || claim.approvedAmount || 0);
    if (!target || target <= 0) return res.status(400).json({ success:false, message:"Enter a valid community support target." });

    let campaign = await CommunityAssistance.findOne({ referenceModel: meta.Model.modelName, referenceId: claim._id });
    if (campaign && ["community_campaign_open", "community_appeal_approved"].includes(String(campaign.workflowStatus || "")) && campaign.enabled && ["open", "target_reached"].includes(String(campaign.status || ""))) {
      return res.status(409).json({ success:false, code:"COMMUNITY_ALREADY_OPEN", message:"Community assistance is already open for this declined claim.", campaign });
    }
    if (campaign && ["community_appeal_pending_review"].includes(String(campaign.workflowStatus || ""))) {
      return res.status(200).json({ success:true, reused:true, message:"Your community support request is already awaiting administrator review.", campaign });
    }
    if (campaign && ["payout_pending", "paid"].includes(String(campaign.status || ""))) {
      return res.status(409).json({ success:false, message:"This community assistance case has already entered payout processing and cannot be resubmitted." });
    }

    if (!campaign) {
      campaign = new CommunityAssistance({
        referenceModel: meta.Model.modelName,
        referenceId: claim._id,
        recipientMember: req.user._id,
        createdBy: req.user._id,
        createdByModel: "Member",
      });
    }
    campaign.title = `${meta.key.charAt(0).toUpperCase()+meta.key.slice(1)} Community Support for ${member?.fullName || "MIDAX member"}`;
    campaign.description = `Community assistance requested after the ${meta.key} support claim was declined. Members may voluntarily contribute through M-PESA after administrator approval.`;
    campaign.targetAmount = target;
    campaign.enabled = false;
    campaign.status = "paused";
    campaign.workflowStatus = "community_appeal_pending_review";
    campaign.appealRequestedAt = new Date();
    campaign.reviewedAt = null;
    campaign.reviewedBy = null;
    campaign.reviewedByModel = undefined;
    campaign.reviewReason = "";
    campaign.payoutPhoneNumber = campaign.payoutPhoneNumber || member?.mpesaNumber || member?.phone || "";
    await campaign.save();

    await createNotification({ recipient:req.user._id, recipientModel:"Member", title:"Community Support Request Submitted", message:"Your community support request was submitted for administrator review. The campaign is not open for contributions yet.", type:"claim", referenceId:campaign._id, referenceModel:"CommunityAssistance", link:"/member/claims", icon:"volunteer_activism", eventId:`community-appeal-member:${campaign._id}` });

    const [admins, superadmins] = await Promise.all([
      Admin.find({ status: "active" }).select("_id").lean(),
      SuperAdmin.find({ status: "active" }).select("_id").lean(),
    ]);
    const reviewers = [
      ...admins.map((row) => ({ id: row._id, model: "Admin" })),
      ...superadmins.map((row) => ({ id: row._id, model: "SuperAdmin" })),
    ];
    await Promise.all(reviewers.map((reviewer) => createNotification({
      recipient: reviewer.id,
      recipientModel: reviewer.model,
      sender: req.user._id,
      senderModel: "Member",
      title: "Community Support Appeal Awaiting Review",
      message: `${member?.fullName || "A member"} has submitted a community support appeal after a declined ${meta.key} claim. Review it before any contributions are accepted.`,
      type: "claim",
      referenceId: campaign._id,
      referenceModel: "CommunityAssistance",
      link: reviewer.model === "Admin" ? "/admin/claims" : "/superadmin/claims",
      icon: "volunteer_activism",
      eventId:`community-appeal-review:${campaign._id}:${reviewer.model}:${reviewer.id}`,
    })));
    await createAuditLog({ user:req.user._id, userRole:req.user.role, action:"COMMUNITY_APPEAL_REQUESTED", module:"Community Support", description:`Member submitted a community support appeal for ${meta.Model.modelName} ${claim._id}; awaiting authorized review.`, req, metadata:{ campaignId:campaign._id, claimId:claim._id, referenceModel:meta.Model.modelName, targetAmount:target } });
    return res.status(201).json({ success:true, campaign, message:"Community support request submitted for administrator review. It is not open for contributions yet." });
  } catch (error) { return res.status(500).json({ success:false, message:error.message }); }
};

exports.reviewCommunityAssistance = async (req, res) => {
  try {
    const decision = String(req.body?.decision || "").trim().toLowerCase();
    const reason = String(req.body?.reason || "").trim().slice(0, 1000);
    if (!["approve", "reject"].includes(decision)) return res.status(400).json({ success: false, message: "Select Approve or Reject for the community appeal." });
    if (decision === "reject" && !reason) return res.status(400).json({ success: false, message: "A rejection reason is required." });

    const existing = await CommunityAssistance.findById(req.params.id).populate("recipientMember", "_id fullName phone mpesaNumber");
    if (!existing) return res.status(404).json({ success: false, message: "Community assistance appeal not found." });
    if (String(existing.workflowStatus || "") !== "community_appeal_pending_review") return res.status(409).json({ success: false, message: "This community appeal is not awaiting review." });

    const target = Number(req.body?.targetAmount ?? existing.targetAmount);
    if (decision === "approve" && (!Number.isInteger(target) || target < 1)) return res.status(400).json({ success: false, message: "A positive whole-number community target is required for approval." });

    const reviewerModel = String(req.user?.role || "").toLowerCase() === "superadmin" ? "SuperAdmin" : "Admin";
    const approvedStatus = Number(existing.raisedAmount || 0) >= target ? "target_reached" : "open";
    const nextFields = decision === "approve"
      ? {
          targetAmount: target,
          enabled: true,
          status: approvedStatus,
          workflowStatus: "community_campaign_open",
          reviewedAt: new Date(),
          reviewedBy: req.user._id,
          reviewedByModel: reviewerModel,
          reviewReason: reason,
          payoutPhoneNumber: existing.payoutPhoneNumber || existing.recipientMember?.mpesaNumber || existing.recipientMember?.phone || "",
        }
      : {
          enabled: false,
          status: "closed",
          workflowStatus: "community_appeal_rejected",
          reviewedAt: new Date(),
          reviewedBy: req.user._id,
          reviewedByModel: reviewerModel,
          reviewReason: reason,
        };

    // Claim the pending review atomically so two concurrent reviewers cannot both approve/reject
    // the same appeal and fan out duplicate downstream decisions.
    const campaign = await CommunityAssistance.findOneAndUpdate(
      { _id: existing._id, workflowStatus: "community_appeal_pending_review" },
      { $set: nextFields },
      { returnDocument: "after" }
    ).populate("recipientMember", "_id fullName phone mpesaNumber");

    if (!campaign) return res.status(409).json({ success: false, message: "This community appeal was already reviewed by another authorised administrator." });

    const decisionMessage = decision === "approve"
      ? `Your community support appeal was approved. The M-PESA campaign is now ${approvedStatus === "target_reached" ? "fully funded" : "open"} for eligible contributors.`
      : `Your community support appeal was rejected. Reason: ${reason}`;

    await createNotification({
      recipient: campaign.recipientMember._id,
      recipientModel: "Member",
      sender: req.user._id,
      senderModel: reviewerModel,
      title: `Community Support Appeal ${decision === "approve" ? "Approved" : "Rejected"}`,
      message: decisionMessage,
      type: "claim",
      referenceId: campaign._id,
      referenceModel: "CommunityAssistance",
      link: "/member/claims",
      icon: decision === "approve" ? "check_circle" : "cancel",
      eventId: `community-appeal-decision:${campaign._id}:${decision}`,
    });
    await createAuditLog({
      user: req.user._id,
      userRole: req.user.role,
      action: decision === "approve" ? "COMMUNITY_APPEAL_APPROVED" : "COMMUNITY_APPEAL_REJECTED",
      module: "Community Support",
      description: `${decision === "approve" ? "Approved" : "Rejected"} community support appeal ${campaign._id}.`,
      req,
      metadata: { campaignId: campaign._id, targetAmount: campaign.targetAmount, reason },
    });
    return res.json({ success: true, campaign, message: decisionMessage });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
