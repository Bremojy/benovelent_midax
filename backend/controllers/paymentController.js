const MpesaTransaction = require("../models/MpesaTransaction");
const EducationSupport = require("../models/EducationSupport");
const CommunityAssistance = require("../models/CommunityAssistance");
const SupportRequest = require("../models/SupportRequest");
const MedicalSupport = require("../models/MedicalSupport");
const FuneralSupport = require("../models/FuneralSupport");
const Member = require("../models/Member");
const createNotification = require("../utils/createNotification");
const { stkPush, b2cPayment, normalizePhone, isConfigured, isB2CConfigured, idempotencyKey } = require("../services/mpesaService");

const modelMap = { SupportRequest, MedicalSupport, FuneralSupport, EducationSupport };

async function ensureReferenceExists(referenceModel, referenceId) {
  const Model = modelMap[referenceModel];
  if (!Model) throw new Error("Unsupported payment reference model.");
  const record = await Model.findById(referenceId);
  if (!record) throw new Error("Payment reference was not found.");
  const memberId = record.member || record.recipientMember || record.memberId;
  if (!memberId) throw new Error("Payment reference has no recipient member.");
  return { record, memberId: String(memberId) };
}

async function applyEducationRepayment(transaction) {
  const application = await EducationSupport.findById(transaction.referenceId);
  if (!application) throw new Error("Education loan was not found.");
  if (application.member.toString() !== String(transaction.member)) throw new Error("Loan ownership validation failed.");
  if (!["Approved", "Disbursed", "Defaulted"].includes(application.status)) throw new Error("This education loan is not open for repayment.");
  if (application.balance <= 0) return application;

  const amount = Math.min(Number(transaction.amount), Number(application.balance));
  application.amountPaid = Number(application.amountPaid || 0) + amount;
  application.balance = Math.max(0, Number(application.balance || 0) - amount);
  if (application.balance === 0) {
    application.status = "Completed";
    application.completionDate = new Date();
  }
  application.repayments = Array.isArray(application.repayments) ? application.repayments : [];
  if (!application.repayments.some((entry) => String(entry.paymentTransactionId || "") === String(transaction._id))) {
    application.repayments.push({
      amount,
      mpesaReceiptNumber: transaction.mpesaReceiptNumber,
      paymentTransactionId: transaction._id,
      paidAt: new Date(),
      method: "M-PESA",
    });
  }
  await application.save();

  await createNotification({
    recipient: application.member,
    recipientModel: "Member",
    title: "Education Loan Repayment Received",
    message: `M-PESA repayment of KSh ${amount.toLocaleString("en-KE")} received. Remaining balance: KSh ${Number(application.balance).toLocaleString("en-KE")}. Receipt: ${transaction.mpesaReceiptNumber || "pending"}.`,
    type: "education",
    referenceId: application._id,
    referenceModel: "EducationSupport",
    icon: "payments",
  });
  return application;
}

async function applyGenericSupportRepayment(transaction) {
  const application = await SupportRequest.findById(transaction.referenceId);
  if (!application) throw new Error("Support repayment record was not found.");
  if (String(application.member) !== String(transaction.member)) throw new Error("Support repayment ownership validation failed.");
  if (!application.repaymentEnabled) throw new Error("This support request is not repayable.");
  const amount = Math.min(Number(transaction.amount), Number(application.balance || 0));
  if (amount <= 0) return application;
  application.amountPaid = Number(application.amountPaid || 0) + amount;
  application.balance = Math.max(0, Number(application.balance || 0) - amount);
  if (application.balance === 0) application.status = "Completed";
  if (!Array.isArray(application.timeline)) application.timeline = [];
  application.timeline.push({ status: application.status, remarks: `M-PESA repayment of KSh ${amount.toLocaleString("en-KE")} recorded.`, updatedBy: transaction.member, date: new Date() });
  await application.save();
  await createNotification({ recipient: application.member, recipientModel: "Member", title: "Support Repayment Received", message: `M-PESA repayment of KSh ${amount.toLocaleString("en-KE")} received. Remaining balance: KSh ${Number(application.balance).toLocaleString("en-KE")}. Receipt: ${transaction.mpesaReceiptNumber || "pending"}.`, type: "payment", referenceId: application._id, referenceModel: "SupportRequest", icon: "payments" });
  return application;
}

async function applyCommunityContribution(transaction) {
  const campaign = await CommunityAssistance.findById(transaction.referenceId);
  if (!campaign) throw new Error("Community assistance case was not found.");
  if (!campaign.enabled || !["open", "target_reached"].includes(campaign.status)) throw new Error("This community assistance case is closed.");
  const remaining = Math.max(0, Number(campaign.targetAmount) - Number(campaign.raisedAmount || 0));
  const amount = Math.min(Number(transaction.amount), remaining);
  if (amount <= 0) throw new Error("This community assistance target has already been reached.");
  campaign.raisedAmount = Number(campaign.raisedAmount || 0) + amount;
  if (campaign.raisedAmount >= campaign.targetAmount) campaign.status = "target_reached";
  await campaign.save();
  await createNotification({
    recipient: campaign.recipientMember,
    recipientModel: "Member",
    title: "Community Assistance Contribution Received",
    message: `A verified M-PESA contribution of KSh ${amount.toLocaleString("en-KE")} has been received toward your assistance case.`,
    type: "claim",
    referenceId: campaign._id,
    referenceModel: "CommunityAssistance",
    icon: "heart",
  });
  return campaign;
}

exports.config = async (_req, res) => {
  const stkConfigured = isConfigured();
  const b2cConfigured = isB2CConfigured();
  res.json({
    success: true,
    configured: stkConfigured,
    stkConfigured,
    b2cConfigured,
    enabled: String(process.env.MPESA_ENABLED || "false").toLowerCase() === "true",
    shortCode: String(process.env.MPESA_SHORTCODE || "247247"),
    accountReference: String(process.env.MPESA_ACCOUNT_REFERENCE || "0650186528835"),
    environment: String(process.env.MPESA_ENVIRONMENT || "production"),
  });
};

exports.myTransactions = async (req, res) => {
  const transactions = await MpesaTransaction.find({ member: req.user._id }).sort({ createdAt: -1 }).limit(100).lean();
  res.json({ success: true, transactions });
};

exports.getTransaction = async (req, res) => {
  try {
    const transaction = await MpesaTransaction.findOne({ _id: req.params.id, member: req.user._id }).lean();
    if (!transaction) return res.status(404).json({ success: false, message: "Payment transaction not found." });
    res.json({ success: true, transaction });
  } catch (error) {
    res.status(400).json({ success: false, message: "Invalid payment transaction reference." });
  }
};

exports.stk = async (req, res) => {
  try {
    const purpose = String(req.body?.purpose || "").trim();
    const referenceId = req.body?.referenceId || null;
    const amount = Number(req.body?.amount);
    const phoneNumber = normalizePhone(req.body?.phoneNumber || req.user?.phone || req.user?.mpesaNumber);
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: "Enter a valid M-PESA amount." });
    if (!phoneNumber || !/^254\d{9}$/.test(phoneNumber)) return res.status(400).json({ success: false, message: "Enter a valid Kenyan M-PESA number." });
    if (!["loan_repayment", "support_repayment", "community_assistance", "contribution", "other"].includes(purpose)) return res.status(400).json({ success: false, message: "Unsupported payment purpose." });

    let referenceModel = "";
    if (purpose === "loan_repayment") {
      const application = await EducationSupport.findById(referenceId);
      if (!application || String(application.member) !== String(req.user._id)) return res.status(404).json({ success: false, message: "Education loan not found." });
      if (Number(application.balance) <= 0) return res.status(400).json({ success: false, message: "This education loan is already fully repaid." });
      if (amount > Number(application.balance)) return res.status(400).json({ success: false, message: "Repayment cannot exceed the current loan balance." });
      referenceModel = "EducationSupport";
    } else if (purpose === "support_repayment") {
      const application = await SupportRequest.findById(referenceId);
      if (!application || String(application.member) !== String(req.user._id)) return res.status(404).json({ success: false, message: "Support repayment record not found." });
      if (!application.repaymentEnabled || !["Approved", "Disbursement Pending", "Paid"].includes(application.status)) return res.status(400).json({ success: false, message: "This support request is not open for repayment." });
      if (Number(application.balance) <= 0) return res.status(400).json({ success: false, message: "This support balance is already fully repaid." });
      if (amount > Number(application.balance)) return res.status(400).json({ success: false, message: "Repayment cannot exceed the current balance." });
      referenceModel = "SupportRequest";
    } else if (purpose === "community_assistance") {
      const campaign = await CommunityAssistance.findById(referenceId);
      if (!campaign || !campaign.enabled || String(campaign.status) !== "open") return res.status(404).json({ success: false, message: "Community assistance case is not available." });
      if (String(campaign.recipientMember) === String(req.user._id)) return res.status(400).json({ success: false, message: "You cannot contribute to your own assistance case." });
      const remaining = Number(campaign.targetAmount) - Number(campaign.raisedAmount || 0);
      if (amount > remaining) return res.status(400).json({ success: false, message: `Maximum remaining contribution is KSh ${remaining.toLocaleString("en-KE")}.` });
      referenceModel = "CommunityAssistance";
    }

    const tx = await MpesaTransaction.create({
      member: req.user._id,
      purpose,
      referenceId,
      referenceModel,
      phoneNumber,
      amount: Math.round(amount),
      businessShortCode: String(process.env.MPESA_SHORTCODE || "247247"),
      accountReference: String(process.env.MPESA_ACCOUNT_REFERENCE || "0650186528835"),
      status: "pending",
    });

    if (!isConfigured()) {
      tx.status = "failed";
      tx.resultDescription = "M-PESA Daraja production credentials are not configured.";
      await tx.save();
      return res.status(503).json({ success: false, configured: false, message: "M-PESA is not enabled yet. Add the Daraja production credentials to the backend environment, then retry.", transaction: tx });
    }

    const result = await stkPush({
      phoneNumber,
      amount: tx.amount,
      accountReference: tx.accountReference,
      transactionDesc: purpose === "loan_repayment" ? "Education repayment" : purpose === "support_repayment" ? "Support repayment" : purpose === "community_assistance" ? "Community help" : "MIDAX payment",
    });

    tx.merchantRequestId = String(result?.MerchantRequestID || "");
    tx.checkoutRequestId = String(result?.CheckoutRequestID || "");
    tx.resultCode = result?.ResponseCode != null ? Number(result.ResponseCode) : null;
    tx.resultDescription = result?.CustomerMessage || result?.ResponseDescription || "STK push sent.";
    tx.status = result?.ResponseCode === "0" ? "pending" : "failed";
    await tx.save();
    res.status(200).json({ success: result?.ResponseCode === "0", configured: true, message: result?.CustomerMessage || result?.ResponseDescription || "STK push submitted.", transactionId: tx._id, checkoutRequestId: tx.checkoutRequestId });
  } catch (error) {
    console.error("M-PESA STK error:", error.response?.data || error);
    res.status(502).json({ success: false, message: error.response?.data?.errorMessage || error.message || "M-PESA payment request failed." });
  }
};

exports.callback = async (req, res) => {
  const callback = req.body?.Body?.stkCallback || req.body?.stkCallback;
  if (!callback) return res.json({ ResultCode: 0, ResultDesc: "Accepted" });
  try {
    const checkoutRequestId = String(callback.CheckoutRequestID || "");
    const transaction = await MpesaTransaction.findOne({ checkoutRequestId });
    if (!transaction) return res.json({ ResultCode: 0, ResultDesc: "Accepted" });

    // Daraja can retry callbacks. Never settle the same transaction twice.
    if (transaction.status === "successful" && transaction.completedAt) {
      return res.json({ ResultCode: 0, ResultDesc: "Already processed" });
    }

    transaction.callbackPayload = req.body;
    transaction.resultCode = Number(callback.ResultCode ?? 1);
    transaction.resultDescription = String(callback.ResultDesc || "");
    transaction.completedAt = new Date();

    if (Number(callback.ResultCode) === 0) {
      const items = Array.isArray(callback.CallbackMetadata?.Item) ? callback.CallbackMetadata.Item : [];
      const getItem = (name) => items.find((item) => item.Name === name)?.Value;
      transaction.mpesaReceiptNumber = String(getItem("MpesaReceiptNumber") || "");
      transaction.status = "successful";
      await transaction.save();
      try {
        if (transaction.purpose === "loan_repayment") await applyEducationRepayment(transaction);
        if (transaction.purpose === "support_repayment") await applyGenericSupportRepayment(transaction);
        else if (transaction.purpose === "community_assistance") await applyCommunityContribution(transaction);
      } catch (applyError) {
        transaction.status = "failed";
        transaction.resultDescription = `Payment received but application update failed: ${applyError.message}`;
        await transaction.save();
        console.error("M-PESA settlement application failed:", applyError);
      }
    } else {
      transaction.status = "failed";
      await transaction.save();
    }
  } catch (error) { console.error("M-PESA callback error:", error); }
  return res.json({ ResultCode: 0, ResultDesc: "Accepted" });
};

exports.enableCommunityAssistance = async (req, res) => {
  try {
    const { referenceModel, referenceId, targetAmount, title, description } = req.body || {};
    const { record, memberId } = await ensureReferenceExists(referenceModel, referenceId);
    if (String(record.status || "") !== "Rejected") return res.status(400).json({ success: false, message: "Community assistance should be enabled only after the claim/support case is declined." });
    const target = Number(targetAmount || record.approvedAmount || record.requestedAmount || record.amount || 0);
    if (!target || target <= 0) return res.status(400).json({ success: false, message: "A positive assistance target is required." });
    const recipient = await Member.findById(memberId).select("fullName phone mpesaNumber");
    if (!recipient) return res.status(404).json({ success: false, message: "Recipient member not found." });
    const existing = await CommunityAssistance.findOne({ referenceModel, referenceId });
    const campaign = existing || new CommunityAssistance({ referenceModel, referenceId, recipientMember: recipient._id, createdBy: req.user._id });
    campaign.title = String(title || `${referenceModel.replace(/([a-z])([A-Z])/g, "$1 $2")} assistance for ${recipient.fullName}`).trim();
    campaign.description = String(description || "The claim was declined by the scheme. Members may voluntarily support this member through M-PESA.").trim();
    campaign.targetAmount = target;
    campaign.enabled = true;
    campaign.status = Number(campaign.raisedAmount || 0) >= target ? "target_reached" : "open";
    campaign.payoutPhoneNumber = normalizePhone(recipient.mpesaNumber || recipient.phone || "");
    await campaign.save();
    res.json({ success: true, campaign });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.communityCases = async (_req, res) => {
  try {
    const campaigns = await CommunityAssistance.find({ enabled: true, status: { $in: ["open", "target_reached"] } })
      .populate("recipientMember", "_id fullName memberNumber profileImage department position")
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, campaigns });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.myCommunityCases = async (req, res) => {
  try {
    const campaigns = await CommunityAssistance.find({ recipientMember: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, campaigns });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.payoutCommunity = async (req, res) => {
  try {
    const campaign = await CommunityAssistance.findById(req.params.id);
    if (!campaign) return res.status(404).json({ success: false, message: "Community assistance case not found." });
    if (!campaign.enabled || !["open", "target_reached"].includes(String(campaign.status))) return res.status(400).json({ success: false, message: "This community assistance case is not open for payout." });
    if (String(campaign.payoutStatus || "not_started") === "pending") return res.status(409).json({ success: false, message: "A payout for this community case is already processing." });
    if (String(campaign.payoutStatus || "not_started") === "successful" || String(campaign.status) === "paid") return res.status(409).json({ success: false, message: "This community case has already been paid." });
    if (Number(campaign.raisedAmount) <= 0) return res.status(400).json({ success: false, message: "No funds are available to disburse." });
    const recipient = await Member.findById(campaign.recipientMember).select("fullName phone mpesaNumber");
    const phone = normalizePhone(req.body?.phoneNumber || campaign.payoutPhoneNumber || recipient?.mpesaNumber || recipient?.phone);
    if (!/^254\d{9}$/.test(phone)) return res.status(400).json({ success: false, message: "Recipient does not have a valid M-PESA number." });
    const amount = Number(campaign.raisedAmount);
    if (!isB2CConfigured()) {
      return res.status(503).json({ success: false, configured: false, message: "M-PESA B2C payout is not configured. Complete the server-side Daraja B2C settings before disbursing community funds." });
    }
    const result = await b2cPayment({ phoneNumber: phone, amount, remarks: campaign.title, occasion: `CASE-${campaign._id.toString().slice(-8)}` });
    campaign.payoutPhoneNumber = phone;
    campaign.payoutAmount = amount;
    campaign.payoutConversationId = String(result?.ConversationID || "");
    campaign.payoutOriginatorConversationId = String(result?.OriginatorConversationID || "");
    campaign.payoutStatus = "pending";
    campaign.status = "payout_pending";
    await campaign.save();
    res.json({ success: true, message: "M-PESA payout submitted for processing.", campaign });
  } catch (error) { res.status(502).json({ success: false, message: error.message }); }
};

exports.b2cResult = async (req, res) => {
  try {
    const result = req.body?.Result || {};
    const conversationId = String(result.ConversationID || result.OriginatorConversationID || "");
    const campaign = await CommunityAssistance.findOne({ $or: [{ payoutConversationId: conversationId }, { payoutOriginatorConversationId: conversationId }] });
    if (campaign) {
      const code = Number(result.ResultCode);
      campaign.payoutStatus = code === 0 ? "successful" : "failed";
      campaign.status = code === 0 ? "paid" : (Number(campaign.raisedAmount) >= Number(campaign.targetAmount) ? "target_reached" : "open");
      await campaign.save();
      if (code === 0) await createNotification({ recipient: campaign.recipientMember, recipientModel: "Member", title: "Community Assistance Paid", message: `KSh ${Number(campaign.payoutAmount).toLocaleString("en-KE")} has been submitted to your M-PESA number.`, type: "claim", referenceId: campaign._id, referenceModel: "CommunityAssistance", icon: "payments" });
    }
  } catch (error) { console.error("B2C callback error:", error); }
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
};

exports.b2cTimeout = async (_req, res) => res.json({ ResultCode: 0, ResultDesc: "Accepted" });
