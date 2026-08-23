const MedicalSupport = require("../models/MedicalSupport");
const FuneralSupport = require("../models/FuneralSupport");
const EducationSupport = require("../models/EducationSupport");
const SupportRequest = require("../models/SupportRequest");
const { createNotification } = require("../utils/createNotification");

const MODEL_MAP = { medical: MedicalSupport, funeral: FuneralSupport, education: EducationSupport, support: SupportRequest };
const LABEL_MAP = { medical: "Medical", funeral: "Funeral", education: "Education", support: "Support" };
const STAGES = ["Pending", "Under Review", "Documents Required", "Eligibility Review", "Approval Review", "Approved", "Disbursement Pending", "Paid", "Completed", "Rejected", "Cancelled", "Closed"];

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

function validateTransition(current, next) {
  const allowed = {
    Pending: ["Under Review", "Documents Required", "Rejected", "Cancelled"],
    "Under Review": ["Documents Required", "Eligibility Review", "Approval Review", "Rejected", "Cancelled"],
    "Documents Required": ["Under Review", "Eligibility Review", "Rejected", "Cancelled"],
    "Eligibility Review": ["Approval Review", "Documents Required", "Rejected", "Cancelled"],
    "Approval Review": ["Approved", "Documents Required", "Rejected", "Cancelled"],
    Approved: ["Disbursement Pending", "Paid", "Completed", "Closed"],
    "Disbursement Pending": ["Paid", "Completed", "Closed"],
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
    if (!validateTransition(String(result.claim.status || "Pending"), nextStatus)) return res.status(409).json({ success: false, message: `Cannot move a ${result.claim.status} claim directly to ${nextStatus}.` });
    if (nextStatus === "Rejected" && !reason && !remarks) return res.status(400).json({ success: false, message: "A rejection reason is required." });

    if (req.body?.approvedAmount !== undefined) result.claim.approvedAmount = Math.max(0, Number(req.body.approvedAmount) || 0);
    if (req.body?.interestRate !== undefined && "interestRate" in result.claim) result.claim.interestRate = Math.max(0, Number(req.body.interestRate) || 0);
    if (req.body?.repaymentPeriodMonths !== undefined && "repaymentPeriodMonths" in result.claim) result.claim.repaymentPeriodMonths = Math.max(1, Number(req.body.repaymentPeriodMonths) || 12);
    if (nextStatus === "Approved" && result.key === "support" && result.claim.policySlug) {
      const Policy = require("../models/Policy"); const policy = await Policy.findOne({ slug: result.claim.policySlug, enabled: true }).lean();
      if (policy?.repaymentEnabled) {
        result.claim.repaymentEnabled = true;
        result.claim.interestRate = Number(policy.interestRate || 0);
        result.claim.repaymentMonths = Number(policy.repaymentMonths || 12);
      }
    }
    if (nextStatus === "Approved") result.claim.approvedAmount = Number(result.claim.approvedAmount || result.claim.requestedAmount || 0);
    result.claim.status = nextStatus;
    result.claim.rejectionReason = nextStatus === "Rejected" ? (reason || remarks) : (result.claim.rejectionReason || "");
    result.claim.remarks = remarks || result.claim.remarks || "";
    result.claim.reviewNotes = remarks || result.claim.reviewNotes || "";
    result.claim.reviewedAt = new Date();
    if ("processedBy" in result.claim) result.claim.processedBy = req.user._id;
    if ("updatedBy" in result.claim) result.claim.updatedBy = req.user._id;
    if (nextStatus === "Approved" && "approvalDate" in result.claim) result.claim.approvalDate = new Date();
    if (nextStatus === "Disbursement Pending" && "disbursementDate" in result.claim) result.claim.disbursementDate = null;
    if ((nextStatus === "Paid" || nextStatus === "Completed") && "disbursementDate" in result.claim && !result.claim.disbursementDate) result.claim.disbursementDate = new Date();

    if (!Array.isArray(result.claim.timeline)) result.claim.timeline = [];
    result.claim.timeline.push({ status: nextStatus, remarks: remarks || reason || `Claim moved to ${nextStatus}.`, updatedBy: req.user._id, date: new Date() });
    await result.claim.save();

    await createNotification({ recipient: result.claim.member, recipientModel: "Member", sender: req.user._id, senderModel: req.user.role === "superadmin" ? "SuperAdmin" : "Admin", title: `${LABEL_MAP[result.key]} claim: ${nextStatus}`, message: remarks || reason || `Your ${LABEL_MAP[result.key].toLowerCase()} claim has moved to ${nextStatus}.`, type: "claim", referenceId: result.claim._id, referenceModel: result.Model.modelName, icon: nextStatus === "Rejected" ? "cancel" : nextStatus === "Approved" ? "check_circle" : "pending" });
    return res.json({ success: true, claim: result.claim, stages: STAGES });
  } catch (error) { return res.status(error.status || 500).json({ success: false, message: error.message }); }
};

exports.list = async (req, res) => {
  try {
    const [medical, funeral, education, support] = await Promise.all([
      MedicalSupport.find({ isDeleted: { $ne: true } }).populate("member", "fullName memberNumber phone email profileImage position employer").populate("dependent", "fullName relationship").sort({ createdAt: -1 }).lean(),
      FuneralSupport.find().populate("member", "fullName memberNumber phone email profileImage position employer").sort({ createdAt: -1 }).lean(),
      EducationSupport.find().populate("member", "fullName memberNumber phone email profileImage position employer").populate("dependent", "fullName relationship school educationLevel").sort({ createdAt: -1 }).lean(),
      SupportRequest.find().populate("member", "fullName memberNumber phone email profileImage position employer").sort({ createdAt: -1 }).lean(),
    ]);
    const normalize=(key, arr)=>arr.map(x=>({...x, supportType: LABEL_MAP[key], sourceType:key, amount:Number(x.approvedAmount || x.requestedAmount || 0), timeline:Array.isArray(x.timeline)?x.timeline:[]}));
    const claims=[...normalize("medical",medical),...normalize("funeral",funeral),...normalize("education",education),...normalize("support",support)].sort((a,b)=>new Date(b.createdAt||b.applicationDate)-new Date(a.createdAt||a.applicationDate));
    res.json({ success:true, count:claims.length, claims, stages:STAGES });
  } catch (error) { res.status(500).json({ success:false, message:error.message }); }
};
