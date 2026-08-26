const MpesaTransaction = require("../models/MpesaTransaction");
const EducationSupport = require("../models/EducationSupport");
const CommunityAssistance = require("../models/CommunityAssistance");
const SupportRequest = require("../models/SupportRequest");
const MedicalSupport = require("../models/MedicalSupport");
const FuneralSupport = require("../models/FuneralSupport");
const Member = require("../models/Member");
const createNotification = require("../utils/createNotification");
const createAuditLog = require("../utils/createAuditLog");
const Finance = require("../models/Finance");
const MpesaB2CTransaction = require("../models/MpesaB2CTransaction");
const { stkPush, b2cPayment, normalizePhone, isConfigured, isB2CConfigured, getConfigurationSummary, idempotencyKey, endpointSummary, extractUpstreamError, normalizeAccountReference, getConfigurationIssues } = require("../services/mpesaService");

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
  const closedBeforePayment = campaign.status === "closed" && campaign.closedAt && transaction.initiatedAt && new Date(transaction.initiatedAt) <= new Date(campaign.closedAt);
  if (!campaign.enabled && !closedBeforePayment) throw new Error("This community assistance case is closed.");
  if (!["open", "target_reached", "closed"].includes(String(campaign.status))) throw new Error("This community assistance case is not accepting this payment settlement.");
  const amount = Number(transaction.amount);
  if (!amount || amount <= 0) throw new Error("Invalid community contribution amount.");
  campaign.raisedAmount = Number(campaign.raisedAmount || 0) + amount;
  if (campaign.raisedAmount >= campaign.targetAmount && campaign.status !== "closed") campaign.status = "target_reached";
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
  const enabled = String(process.env.MPESA_ENABLED || "false").toLowerCase() === "true";
  res.json({
    success: true,
    ...getConfigurationSummary(),
    configured: stkConfigured,
    stkConfigured,
    b2cConfigured,
    enabled,
    ready: stkConfigured && b2cConfigured,
    configurationIssues: getConfigurationIssues(),
    shortCode: String(process.env.MPESA_SHORTCODE || "247247"),
    accountReference: normalizeAccountReference(process.env.MPESA_ACCOUNT_REFERENCE || "BENEVOLENT"),
    environment: String(process.env.MPESA_ENVIRONMENT || "production"),
    message: !enabled
      ? "M-PESA is disabled on the server."
      : stkConfigured
        ? (b2cConfigured ? "STK and B2C are configured." : "STK is configured; B2C payout settings are incomplete.")
        : "STK is not configured. Add the real Daraja consumer key, consumer secret, passkey, shortcode and callback URL.",
  });
};

exports.routeStatus = async (_req, res) => {
  res.json({
    success: true,
    service: "payments",
    routes: {
      stk: "/api/payments/stk",
      callback: "/api/payments/callback",
      b2c: "/api/payments/b2c/disburse",
      b2cResult: "/api/payments/b2c/result",
      b2cTimeout: "/api/payments/b2c/timeout",
    },
    daraja: endpointSummary(),
    configuration: getConfigurationSummary(),
    timestamp: new Date().toISOString(),
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
      accountReference: normalizeAccountReference(process.env.MPESA_ACCOUNT_REFERENCE || "BENEVOLENT"),
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
    tx.status = String(result?.ResponseCode) === "0" ? "pending" : "failed";
    await tx.save();
    res.status(200).json({ success: result?.ResponseCode === "0", configured: true, message: result?.CustomerMessage || result?.ResponseDescription || "STK push submitted.", transactionId: tx._id, checkoutRequestId: tx.checkoutRequestId });
  } catch (error) {
    const upstream = extractUpstreamError(error);
    console.error("M-PESA STK error:", { stage: "daraja", ...upstream });
    const isUpstream404 = upstream.status === 404;
    // Any Daraja failure is an upstream payment-service problem, not an
    // application authentication failure. Keep it in the 5xx family so the
    // member portal can stay signed in and display a payment-specific message.
    const clientStatus = 502;
    const diagnosticMessage = isUpstream404
      ? "Safaricom returned HTTP 404 for the STK request. Verify the Daraja production application, shortcode, environment and callback configuration."
      : upstream.status === 400
        ? "Safaricom rejected the STK request. Check that the production shortcode and Lipa Na M-PESA passkey belong to the same Daraja app, the transaction type matches the shortcode (CustomerPayBillOnline for PayBill), the callback URL is registered/accessible, and the production consumer credentials are active."
        : upstream.status === 401
          ? "Safaricom rejected the Daraja credentials. Verify the production consumer key and consumer secret."
          : upstream.status === 403
            ? "Safaricom denied the Daraja request. Verify that the production application and shortcode are enabled for STK Push."
            : "The M-PESA service could not complete the STK request. Your portal session is unchanged.";
    return res.status(clientStatus).json({
      success: false,
      code: isUpstream404 ? "MPESA_DARAJA_404" : "MPESA_STK_FAILED",
      upstreamStatus: upstream.status,
      paymentStage: "daraja",
      message: diagnosticMessage,
      endpoint: endpointSummary().stk,
      details: process.env.NODE_ENV === "production" ? undefined : error.response?.data,
    });
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
        // Safaricom has already confirmed receipt. Never mark a paid transaction as failed
        // merely because our secondary application reconciliation failed. Keep the money
        // record successful and surface the reconciliation issue for admin review.
        transaction.status = "successful";
        transaction.resultDescription = `Payment received; application reconciliation requires review: ${applyError.message}`;
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

exports.communityCases = async (req, res) => {
  try {
    const isAdminView = ["admin", "superadmin"].includes(String(req.user?.role || "").toLowerCase());
    const filter = isAdminView ? {} : { enabled: true, status: { $in: ["open", "target_reached"] } };
    const campaigns = await CommunityAssistance.find(filter)
      .populate("recipientMember", "_id fullName memberNumber profileImage department position phone mpesaNumber")
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
    if (!campaign.enabled || !["open", "target_reached"].includes(String(campaign.status))) return res.status(400).json({ success: false, message: "This community assistance case is not eligible for payout." });
    if (String(campaign.payoutStatus || "not_started") === "pending") return res.status(409).json({ success: false, message: "A payout for this community case is already processing." });
    if (String(campaign.payoutStatus || "not_started") === "successful" || String(campaign.status) === "paid") return res.status(409).json({ success: false, message: "This community case has already been paid." });
    if (Number(campaign.raisedAmount) <= 0) return res.status(400).json({ success: false, message: "No funds are available to disburse." });
    const recipient = await Member.findById(campaign.recipientMember).select("fullName phone mpesaNumber");
    if (!recipient) return res.status(404).json({ success: false, message: "Recipient member not found." });
    const phone = normalizePhone(req.body?.phoneNumber || campaign.payoutPhoneNumber || recipient?.mpesaNumber || recipient?.phone);
    if (!/^254\d{9}$/.test(phone)) return res.status(400).json({ success: false, message: "Recipient does not have a valid M-PESA number." });
    const amount = Number(campaign.raisedAmount);
    if (!isB2CConfigured()) {
      return res.status(503).json({ success: false, configured: false, message: "M-PESA B2C payout is not configured. Add the real Safaricom initiator and security credential before disbursing funds." });
    }
    const result = await b2cPayment({ phoneNumber: phone, amount, remarks: campaign.title, occasion: `CASE-${campaign._id.toString().slice(-8)}` });
    campaign.payoutPhoneNumber = phone;
    campaign.payoutAmount = amount;
    campaign.payoutConversationId = String(result?.ConversationID || "");
    campaign.payoutOriginatorConversationId = String(result?.OriginatorConversationID || "");
    campaign.payoutStatus = "pending";
    campaign.status = "payout_pending";
    await campaign.save();
    await createAuditLog({ user: req.user._id, userRole: req.user.role, action: "COMMUNITY_PAYOUT_SUBMITTED", module: "M-PESA", description: `SuperAdmin submitted KSh ${amount.toLocaleString("en-KE")} community payout for ${campaign.title}.`, req, metadata: { campaignId: campaign._id, amount, phone, conversationId: campaign.payoutConversationId } });
    res.json({ success: true, message: "M-PESA payout submitted for processing.", campaign });
  } catch (error) { res.status(502).json({ success: false, message: error.response?.data?.errorMessage || error.message }); }
};


exports.b2cHistory = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const query = {};
    const status = String(req.query.status || "").trim().toLowerCase();
    if (["pending", "successful", "failed", "timeout"].includes(status)) query.status = status;
    const [total, transactions] = await Promise.all([
      MpesaB2CTransaction.countDocuments(query),
      MpesaB2CTransaction.find(query).populate("member", "fullName memberNumber phone mpesaNumber").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ]);
    res.json({ success: true, page, limit, total, totalPages: Math.ceil(total / limit), transactions });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.disburseB2C = async (req, res) => {
  let transaction;
  try {
    if (!isB2CConfigured()) return res.status(503).json({ success: false, configured: false, message: "M-PESA B2C payout is not configured. Add the real Safaricom initiator and security credential on the backend before disbursing funds." });
    const rawAmount = Number(req.body?.amount);
    if (!Number.isFinite(rawAmount) || rawAmount <= 0) return res.status(400).json({ success: false, message: "Enter a valid positive disbursement amount." });
    const configuredMax = Number(process.env.MPESA_B2C_MAX_AMOUNT || 0);
    if (configuredMax > 0 && rawAmount > configuredMax) return res.status(400).json({ success: false, message: `This disbursement exceeds the configured B2C maximum of KSh ${configuredMax.toLocaleString("en-KE")}.` });
    const amount = Math.round(rawAmount * 100) / 100;
    let member = null;
    const memberId = String(req.body?.memberId || "").trim();
    const memberNumber = String(req.body?.memberNumber || "").trim().toUpperCase();
    if (memberId) member = await Member.findOne({ _id: memberId, role: "member", isDeleted: false }).select("fullName memberNumber phone mpesaNumber email");
    if (!member && memberNumber) member = await Member.findOne({ memberNumber, role: "member", isDeleted: false }).select("fullName memberNumber phone mpesaNumber email");
    if ((memberId || memberNumber) && !member) return res.status(404).json({ success: false, message: "The selected member could not be found or is not an active member record." });
    const phone = normalizePhone(req.body?.phoneNumber || member?.mpesaNumber || member?.phone);
    if (!/^254\d{9}$/.test(phone)) return res.status(400).json({ success: false, message: "Enter a valid Kenyan M-PESA number or select a member with a valid M-PESA number." });
    const remarks = String(req.body?.remarks || (member ? `Benevolent Midax disbursement to ${member.fullName}` : "Benevolent Midax disbursement")).trim().slice(0, 182);
    const occasion = String(req.body?.occasion || "BENEVOLENT").trim().slice(0, 100);
    const requestReference = idempotencyKey();
    transaction = await MpesaB2CTransaction.create({ requestReference, member: member?._id || null, disbursedBy: req.user._id, disbursedByRole: "superadmin", phoneNumber: phone, amount, remarks, occasion, status: "pending" });
    const result = await b2cPayment({ phoneNumber: phone, amount, remarks, occasion });
    transaction.conversationId = String(result?.ConversationID || "");
    transaction.originatorConversationId = String(result?.OriginatorConversationID || "");
    await transaction.save();
    await createAuditLog({ user: req.user._id, userRole: req.user.role, action: "B2C_DISBURSEMENT_SUBMITTED", module: "M-PESA", description: `SuperAdmin submitted KSh ${amount.toLocaleString("en-KE")} B2C disbursement to ${phone}.`, req, metadata: { transactionId: transaction._id, requestReference, memberId: member?._id || null, amount, phone, conversationId: transaction.conversationId } });
    res.status(202).json({ success: true, message: "B2C disbursement submitted to M-PESA for processing.", transaction });
  } catch (error) {
    if (transaction?._id) { try { transaction.status = "failed"; transaction.resultDescription = error.response?.data?.errorMessage || error.message || "B2C request failed"; transaction.completedAt = new Date(); await transaction.save(); } catch (_) {} }
    res.status(error.response?.status && Number(error.response.status) < 500 ? error.response.status : 502).json({ success: false, message: error.response?.data?.errorMessage || error.message || "Unable to submit B2C disbursement." });
  }
};

exports.closeCommunity = async (req, res) => {
  try {
    const campaign = await CommunityAssistance.findById(req.params.id);
    if (!campaign) return res.status(404).json({ success: false, message: "Community assistance case not found." });
    if (!campaign.enabled && campaign.status === "closed") return res.status(409).json({ success: false, message: "This community M-PESA request is already closed." });
    if (!["open", "target_reached"].includes(String(campaign.status))) return res.status(400).json({ success: false, message: `A ${campaign.status} community request cannot be closed from collection mode.` });
    campaign.enabled = false;
    campaign.status = "closed";
    campaign.closedAt = new Date();
    campaign.closedBy = req.user._id;
    await campaign.save();
    await createAuditLog({ user: req.user._id, userRole: req.user.role, action: "COMMUNITY_COLLECTION_CLOSED", module: "M-PESA", description: `SuperAdmin closed community M-PESA collection for ${campaign.title}.`, req, metadata: { campaignId: campaign._id, raisedAmount: campaign.raisedAmount, targetAmount: campaign.targetAmount } });
    await createNotification({ recipient: campaign.recipientMember, recipientModel: "Member", title: "Community M-PESA Request Closed", message: `Your community support collection has been closed by the SuperAdmin. Collected amount: KSh ${Number(campaign.raisedAmount || 0).toLocaleString("en-KE")}.`, type: "claim", referenceId: campaign._id, referenceModel: "CommunityAssistance", icon: "lock" });
    res.json({ success: true, message: "Community M-PESA collection closed.", campaign });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.b2cResult = async (req, res) => {
  try {
    const result = req.body?.Result || {};
    const conversationId = String(result.ConversationID || result.OriginatorConversationID || "");
    const resultCode = Number(result.ResultCode);
    const params = result.ResultParameters?.ResultParameter || [];
    const receipt = String(params.find?.((x) => x.Key === "TransactionReceipt")?.Value || "");
    const directTransaction = await MpesaB2CTransaction.findOne({ $or: [{ conversationId }, { originatorConversationId: conversationId }] });
    if (directTransaction) {
      directTransaction.status = resultCode === 0 ? "successful" : "failed";
      directTransaction.resultCode = Number.isFinite(resultCode) ? resultCode : null;
      directTransaction.resultDescription = String(result.ResultDesc || "");
      directTransaction.transactionReceipt = receipt;
      directTransaction.resultPayload = result;
      directTransaction.completedAt = new Date();
      await directTransaction.save();
      if (resultCode === 0) {
        const exists = await Finance.findOne({ referenceNumber: directTransaction.conversationId, type: "withdrawal" });
        if (!exists) await Finance.create({ member: directTransaction.member, transactionNumber: `BMX-B2C-${directTransaction._id.toString().slice(-8)}-${Date.now()}`, type: "withdrawal", category: "B2C disbursement", amount: directTransaction.amount, description: directTransaction.remarks, paymentMethod: "M-PESA", referenceNumber: directTransaction.conversationId || directTransaction.requestReference, receiptNumber: receipt, status: "completed", transactionDate: new Date(), notes: `SuperAdmin B2C disbursement confirmed by M-PESA. Request ${directTransaction.requestReference}.` });
        if (directTransaction.member) await createNotification({ recipient: directTransaction.member, recipientModel: "Member", title: "M-PESA Disbursement Received", message: `KSh ${Number(directTransaction.amount).toLocaleString("en-KE")} has been sent to your M-PESA account. Receipt: ${receipt || "pending"}.`, type: "payment", referenceId: directTransaction._id, referenceModel: "MpesaB2CTransaction", icon: "payments" });
      } else if (directTransaction.member) await createNotification({ recipient: directTransaction.member, recipientModel: "Member", title: "M-PESA Disbursement Update", message: `Your M-PESA disbursement of KSh ${Number(directTransaction.amount).toLocaleString("en-KE")} was not completed. ${result.ResultDesc || "Please contact the scheme administrator."}`, type: "payment", referenceId: directTransaction._id, referenceModel: "MpesaB2CTransaction", icon: "payments" });
    }
    const campaign = await CommunityAssistance.findOne({ $or: [{ payoutConversationId: conversationId }, { payoutOriginatorConversationId: conversationId }] });
    if (campaign) {
      const code = resultCode;
      campaign.payoutStatus = code === 0 ? "successful" : "failed";
      campaign.status = code === 0 ? "paid" : (Number(campaign.raisedAmount) >= Number(campaign.targetAmount) ? "target_reached" : (campaign.enabled ? "open" : "closed"));
      await campaign.save();
      if (code === 0) {
        const existing = await Finance.findOne({ referenceNumber: campaign.payoutConversationId, type: "withdrawal" });
        if (!existing) await Finance.create({ member: campaign.recipientMember, transactionNumber: `BMX-PAYOUT-${campaign._id.toString().slice(-8)}-${Date.now()}`, type: "withdrawal", category: "Community assistance disbursement", amount: Number(campaign.payoutAmount || 0), description: campaign.title, paymentMethod: "M-PESA", referenceNumber: campaign.payoutConversationId, receiptNumber: receipt, status: "completed", transactionDate: new Date(), notes: `Community assistance disbursement confirmed by M-PESA. Case ${campaign._id}.` });
        await createNotification({ recipient: campaign.recipientMember, recipientModel: "Member", title: "Community Assistance Paid", message: `KSh ${Number(campaign.payoutAmount).toLocaleString("en-KE")} has been sent to your registered M-PESA number.`, type: "claim", referenceId: campaign._id, referenceModel: "CommunityAssistance", icon: "payments" });
      }
    }
  } catch (error) { console.error("B2C callback error:", error); }
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
};

exports.b2cTimeout = async (req, res) => {
  try {
    const result = req.body?.Result || {};
    const conversationId = String(result.ConversationID || result.OriginatorConversationID || "");
    if (conversationId) {
      const directTransaction = await MpesaB2CTransaction.findOne({ $or: [{ conversationId }, { originatorConversationId: conversationId }] });
      if (directTransaction && directTransaction.status === "pending") {
        directTransaction.status = "timeout";
        directTransaction.resultCode = Number.isFinite(Number(result.ResultCode)) ? Number(result.ResultCode) : null;
        directTransaction.resultDescription = String(result.ResultDesc || "B2C request timed out.");
        directTransaction.resultPayload = result;
        directTransaction.completedAt = new Date();
        await directTransaction.save();
        if (directTransaction.member) await createNotification({ recipient: directTransaction.member, recipientModel: "Member", title: "M-PESA Disbursement Delayed", message: `Your KSh ${Number(directTransaction.amount).toLocaleString("en-KE")} M-PESA disbursement is unresolved because Safaricom reported a timeout. The scheme administrator will review it.`, type: "payment", referenceId: directTransaction._id, referenceModel: "MpesaB2CTransaction", icon: "payments" });
      }
      const campaign = await CommunityAssistance.findOne({ $or: [{ payoutConversationId: conversationId }, { payoutOriginatorConversationId: conversationId }] });
      if (campaign && campaign.payoutStatus === "pending") {
        campaign.payoutStatus = "failed";
        campaign.status = campaign.enabled ? (Number(campaign.raisedAmount) >= Number(campaign.targetAmount) ? "target_reached" : "open") : "closed";
        await campaign.save();
      }
    }
  } catch (error) { console.error("B2C timeout callback error:", error); }
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
};
