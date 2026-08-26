const MedicalSupport = require("../models/MedicalSupport");
const FuneralSupport = require("../models/FuneralSupport");
const EducationSupport = require("../models/EducationSupport");
const SupportRequest = require("../models/SupportRequest");
const createNotification = require("../utils/createNotification");
const CommunityAssistance = require("../models/CommunityAssistance");
const Member = require("../models/Member");
const News = require("../models/News");

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
    const isSuperAdmin = String(req.user?.role || "").toLowerCase() === "superadmin";
    const currentStatus = String(result.claim.status || "Pending");
    const terminalStatuses = ["Closed", "Rejected", "Cancelled"];
    const reopenStatuses = ["Pending", "Under Review", "Documents Required", "Eligibility Review", "Approval Review"];
    const reopening = isSuperAdmin && terminalStatuses.includes(currentStatus) && reopenStatuses.includes(nextStatus);
    if (!isSuperAdmin && !validateTransition(currentStatus, nextStatus)) return res.status(409).json({ success: false, message: `Cannot move a ${currentStatus} claim directly to ${nextStatus}.` });
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
    if ("processedBy" in result.claim) result.claim.processedBy = req.user._id;
    if ("updatedBy" in result.claim) result.claim.updatedBy = req.user._id;
    if (nextStatus === "Approved" && "approvalDate" in result.claim) result.claim.approvalDate = new Date();
    if (nextStatus === "Disbursement Pending" && "disbursementDate" in result.claim) result.claim.disbursementDate = null;
    if ((nextStatus === "Paid" || nextStatus === "Completed") && "disbursementDate" in result.claim && !result.claim.disbursementDate) result.claim.disbursementDate = new Date();

    if (!Array.isArray(result.claim.timeline)) result.claim.timeline = [];
    result.claim.timeline.push({ status: nextStatus, remarks: remarks || reason || `Claim moved to ${nextStatus}.`, updatedBy: req.user._id, date: new Date() });
    await result.claim.save();

    await createNotification({ recipient: result.claim.member, recipientModel: "Member", sender: req.user._id, senderModel: req.user.role === "superadmin" ? "SuperAdmin" : "Admin", title: `${LABEL_MAP[result.key]} claim: ${nextStatus}`, message: reopening ? (remarks || `Your ${LABEL_MAP[result.key].toLowerCase()} claim has been reopened for further review.`) : (remarks || reason || `Your ${LABEL_MAP[result.key].toLowerCase()} claim has moved to ${nextStatus}.`), type: "claim", referenceId: result.claim._id, referenceModel: result.Model.modelName, icon: reopening ? "history" : nextStatus === "Rejected" ? "cancel" : nextStatus === "Approved" ? "check_circle" : "pending" });
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


exports.remove = async (req, res) => {
  try {
    if (String(req.user?.role || "").toLowerCase() !== "superadmin") {
      return res.status(403).json({ success: false, message: "Only SuperAdmin can delete a claim." });
    }
    const result = await getClaim(req.params.type, req.params.id);
    await result.claim.deleteOne();
    return res.json({ success: true, message: `${LABEL_MAP[result.key]} claim deleted successfully.` });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

exports.publishClaimToNews = async (req, res) => {
  try {
    const result = await getClaim(req.params.type, req.params.id);
    const status = String(result.claim.status || "Pending");
    if (!["Approved", "Paid", "Completed"].includes(status)) {
      return res.status(400).json({ success: false, message: "Only an approved, paid, or completed support case can be published as a support approval." });
    }
    const member = await Member.findById(result.claim.member).select("fullName memberNumber").lean();
    const sourceModel = result.Model.modelName;
    const sourceId = String(result.claim._id);
    let news = await News.findOne({ sourceModel, sourceId });
    const title = `${LABEL_MAP[result.key]} Support Approved`;
    const approvedAmount = Number(result.claim.approvedAmount || result.claim.requestedAmount || 0);
    const content = `${title}.\n\nBenevolent MIDAX has approved KSh ${approvedAmount.toLocaleString("en-KE")} in ${LABEL_MAP[result.key].toLowerCase()} support for ${member?.fullName || "a member"}. This public update confirms the support decision without exposing private medical, education, funeral, or identity details.\n\nReference: ${member?.memberNumber || "Member support case"}.`;
    const payload = { title, summary: `A ${LABEL_MAP[result.key].toLowerCase()} support case has been approved.`, content, category: "Announcement", published: true, status: "published", publishDate: new Date(), author: req.user._id, sourceModel, sourceId };
    if (news) { Object.assign(news, payload); await news.save(); }
    else news = await News.create(payload);
    return res.json({ success: true, news, message: "Support approval published to public News." });
  } catch (error) { return res.status(error.status || 500).json({ success: false, message: error.message }); }
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

    // Resolve by the member-owned claim id even when an older/stale frontend sends
    // a mismatched sourceType. The member ownership check remains mandatory.
    let meta = null;
    let claim = null;
    for (const key of orderedKeys) {
      const candidate = await MODEL_MAP[key].findOne({ _id: referenceId, member: req.user._id });
      if (candidate) { meta = { key, Model: MODEL_MAP[key] }; claim = candidate; break; }
    }
    if (!meta || !claim) return res.status(404).json({ success:false, code:"CLAIM_NOT_FOUND", message:"We could not find that support claim in your account. Refresh your Claims page and try again." });
    if (String(claim.status || "").trim().toLowerCase() !== "rejected") return res.status(400).json({ success:false, message:"Community assistance is available after a declined claim." });
    let campaign = await CommunityAssistance.findOne({ referenceModel: meta.Model.modelName, referenceId: claim._id });
    const member = await Member.findById(req.user._id).select("fullName phone mpesaNumber");
    const target = Number(targetAmount || claim.requestedAmount || claim.approvedAmount || 0);
    if (!target || target <= 0) return res.status(400).json({ success:false, message:"Enter a valid community support target." });
    if (!campaign) campaign = new CommunityAssistance({ referenceModel: meta.Model.modelName, referenceId: claim._id, recipientMember: req.user._id, createdBy: req.user._id });
    campaign.title = `${meta.key.charAt(0).toUpperCase()+meta.key.slice(1)} Community Support for ${member?.fullName || "MIDAX member"}`;
    campaign.description = `Community assistance requested after the ${meta.key} support claim was declined. Members may voluntarily contribute through M-PESA.`;
    campaign.targetAmount = target;
    campaign.enabled = true;
    campaign.status = Number(campaign.raisedAmount || 0) >= target ? "target_reached" : "open";
    campaign.payoutPhoneNumber = campaign.payoutPhoneNumber || member?.mpesaNumber || member?.phone || "";
    await campaign.save();
    await createNotification({ recipient:req.user._id, recipientModel:"Member", title:"Community Support Request Created", message:"Your declined support claim is now available for voluntary community assistance through M-PESA.", type:"claim", referenceId:campaign._id, referenceModel:"CommunityAssistance", icon:"volunteer_activism" });
    return res.status(201).json({ success:true, campaign });
  } catch (error) { return res.status(500).json({ success:false, message:error.message }); }
};
