const MpesaTransaction = require("../models/MpesaTransaction");
const EducationSupport = require("../models/EducationSupport");
const CommunityAssistance = require("../models/CommunityAssistance");
const Contribution = require("../models/Contribution");
const SupportRequest = require("../models/SupportRequest");
const MedicalSupport = require("../models/MedicalSupport");
const FuneralSupport = require("../models/FuneralSupport");
const Member = require("../models/Member");
const createNotification = require("../utils/createNotification");
const createAuditLog = require("../utils/createAuditLog");
const Finance = require("../models/Finance");
const MpesaB2CTransaction = require("../models/MpesaB2CTransaction");
const { ensureChatProfile } = require("../utils/chatProfile");
const { stkPush, stkQuery, b2cPayment, normalizePhone, normalizeAccountReference, isConfigured, isB2CConfigured, getConfigurationSummary, idempotencyKey, endpointSummary, extractUpstreamError } = require("../services/mpesaService");

const env = (name, fallback = "") => String(process.env[name] ?? fallback).trim();
const DEFAULT_MPESA_SHORTCODE = "650014";
const DEFAULT_MPESA_ACCOUNT_REFERENCE = "BENMIDAX";
const MANUAL_PAYBILL = () => env("MPESA_MANUAL_PAYBILL", "247247");
const MANUAL_ACCOUNT = () => env("MPESA_MANUAL_ACCOUNT_NUMBER", "0650186528835");
const normalizeManualCode = (value) => String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32);

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
  if (!Array.isArray(application.timeline)) application.timeline = [];
  const existing = application.timeline.find((entry) => String(entry.paymentTransactionId || "") === String(transaction._id));
  if (existing) return application;
  const amount = Math.min(Number(transaction.amount), Number(application.balance || 0));
  if (amount <= 0) return application;
  application.amountPaid = Number(application.amountPaid || 0) + amount;
  application.balance = Math.max(0, Number(application.balance || 0) - amount);
  if (application.balance === 0) application.status = "Completed";
  application.timeline.push({ status: application.status, remarks: `M-PESA repayment of KSh ${amount.toLocaleString("en-KE")} recorded.`, updatedBy: transaction.member, paymentTransactionId: transaction._id, date: new Date() });
  await application.save();
  await createNotification({ recipient: application.member, recipientModel: "Member", title: "Support Repayment Received", message: `M-PESA repayment of KSh ${amount.toLocaleString("en-KE")} received. Remaining balance: KSh ${Number(application.balance).toLocaleString("en-KE")}. Receipt: ${transaction.mpesaReceiptNumber || "pending"}.`, type: "payment", referenceId: application._id, referenceModel: "SupportRequest", icon: "payments" });
  return application;
}

async function applyCommunityContribution(transaction) {
  const campaign = await CommunityAssistance.findById(transaction.referenceId).lean();
  if (!campaign) throw new Error("Community assistance case was not found.");
  const closedBeforePayment = campaign.status === "closed" && campaign.closedAt && transaction.initiatedAt && new Date(transaction.initiatedAt) <= new Date(campaign.closedAt);
  if (!campaign.enabled && !closedBeforePayment) throw new Error("This community assistance case is closed.");
  if (!["open", "target_reached", "closed"].includes(String(campaign.status))) throw new Error("This community assistance case is not accepting this payment settlement.");
  const amount = Number(transaction.amount);
  if (!amount || amount <= 0) throw new Error("Invalid community contribution amount.");
  const remaining = Math.max(0, Number(campaign.targetAmount || 0) - Number(campaign.raisedAmount || 0));
  if (amount > remaining) throw new Error("The contribution exceeds the remaining assistance target and needs finance review.");
  const updated = await CommunityAssistance.findOneAndUpdate(
    { _id: campaign._id, enabled: campaign.enabled, status: campaign.status, contributionTransactionIds: { $ne: transaction._id }, raisedAmount: { $lte: Math.max(0, Number(campaign.targetAmount || 0) - amount) } },
    { $inc: { raisedAmount: amount }, $addToSet: { contributionTransactionIds: transaction._id } },
    { new: true }
  );
  if (!updated) {
    const alreadyApplied = await CommunityAssistance.findOne({ _id: campaign._id, contributionTransactionIds: transaction._id }).lean();
    if (alreadyApplied) return alreadyApplied;
    throw new Error("The community contribution could not be reconciled safely. Finance review is required.");
  }
  if (updated.raisedAmount >= updated.targetAmount && updated.status !== "closed") {
    await CommunityAssistance.updateOne({ _id: updated._id }, { $set: { status: "target_reached" } });
    updated.status = "target_reached";
  }
  await createNotification({
    recipient: updated.recipientMember,
    recipientModel: "Member",
    title: "Community Assistance Contribution Received",
    message: `A verified M-PESA contribution of KSh ${amount.toLocaleString("en-KE")} has been received toward your assistance case.`,
    type: "claim",
    referenceId: updated._id,
    referenceModel: "CommunityAssistance",
    icon: "heart",
  });
  return updated;
}

async function resolvePaymentMember(req) {
  const role = String(req.user?.role || req.userRole || "").toLowerCase();
  if (role === "member") return req.user;
  if (["admin", "superadmin"].includes(role)) {
    const profile = await ensureChatProfile(req.user);
    if (!profile?._id) throw new Error("Your portal contribution profile could not be prepared.");
    return profile;
  }
  throw new Error("This account is not allowed to make a contribution.");
}

async function ensureContributionForPayment(paymentMember, referenceId, amount) {
  if (referenceId) {
    const existing = await Contribution.findOne({ _id: referenceId, member: paymentMember._id });
    if (!existing) throw new Error("Contribution record not found for this account.");
    if (Number(existing.balance) <= 0) throw new Error("This contribution is already fully paid.");
    if (Number(amount) > Number(existing.balance)) throw new Error("Payment cannot exceed the current contribution balance.");
    return existing;
  }

  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();
  let contribution = await Contribution.findOne({ member: paymentMember._id, month, year });
  if (!contribution) {
    try {
      contribution = await Contribution.create({
        member: paymentMember._id,
        month,
        year,
        expectedAmount: Math.max(1, Number(amount)),
        paidAmount: 0,
        paymentMethod: "M-PESA",
        notes: "Self-service contribution created from portal M-PESA payment.",
      });
    } catch (error) {
      if (error?.code !== 11000) throw error;
      contribution = await Contribution.findOne({ member: paymentMember._id, month, year });
    }
  }
  if (!contribution) throw new Error("Unable to prepare your current contribution record.");
  if (Number(contribution.balance) <= 0) {
    // A fully paid current-month record should not block a new top-up.
    // Create the next payment as an additional contribution only when the
    // current record is already complete is undesirable because of the unique
    // monthly index, so direct additional payment requires the existing balance.
    throw new Error("Your current monthly contribution is already fully paid.");
  }
  if (Number(amount) > Number(contribution.balance)) throw new Error("Payment cannot exceed the current contribution balance.");
  return contribution;
}

exports.publicConfig = async (_req, res) => {
  res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=900");
  return res.json({ success:true, enabled:env("MPESA_ENABLED","false").toLowerCase()==="true", configured:isConfigured(), environment:env("MPESA_ENVIRONMENT","production"), shortCode:env("MPESA_SHORTCODE",DEFAULT_MPESA_SHORTCODE), accountReference:normalizeAccountReference(env("MPESA_ACCOUNT_REFERENCE",DEFAULT_MPESA_ACCOUNT_REFERENCE)), manualPaybill:env("MPESA_MANUAL_PAYBILL","247247"), manualAccountNumber:MANUAL_ACCOUNT(), transactionType:env("MPESA_TRANSACTION_TYPE","CustomerPayBillOnline") });
};

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
    ready: Boolean(stkConfigured || MANUAL_PAYBILL()),
    manualCollectionReady: Boolean(MANUAL_PAYBILL() && MANUAL_ACCOUNT()),
    shortCode: String(process.env.MPESA_SHORTCODE || "650014"),
    manualPaybill: String(process.env.MPESA_MANUAL_PAYBILL || "247247"),
    manualAccountNumber: MANUAL_ACCOUNT(),
    accountReference: normalizeAccountReference(process.env.MPESA_ACCOUNT_REFERENCE || "BENMIDAX"),
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
      stkQuery: "/api/payments/stk-query",
      callback: "/api/payments/callback",
      b2c: "/api/payments/b2c/disburse",
      b2cResult: "/api/payments/b2c/result",
      b2cTimeout: "/api/payments/b2c/timeout",
      manual: "/api/payments/manual",
      manualAdmin: "/api/payments/manual/admin",
      manualVerify: "/api/payments/manual/:id/verify",
      manualReject: "/api/payments/manual/:id/reject",
    },
    daraja: endpointSummary(),
    configuration: getConfigurationSummary(),
    timestamp: new Date().toISOString(),
  });
};

exports.myTransactions = async (req, res) => {
  try {
    const paymentMember = await resolvePaymentMember(req);
    const transactions = await MpesaTransaction.find({ member: paymentMember._id }).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ success: true, transactions });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || "Unable to load your M-PESA transactions." });
  }
};

exports.getTransaction = async (req, res) => {
  try {
    const paymentMember = await resolvePaymentMember(req);
    const transaction = await MpesaTransaction.findOne({ _id: req.params.id, member: paymentMember._id }).lean();
    if (!transaction) return res.status(404).json({ success: false, message: "Payment transaction not found." });
    res.json({ success: true, transaction });
  } catch (error) {
    res.status(400).json({ success: false, message: "Invalid payment transaction reference." });
  }
};

exports.allTransactions = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query?.limit) || 100, 1), 500);
    const transactions = await MpesaTransaction.find({})
      .populate("member", "fullName memberNumber email phone role portalOwnerId portalOwnerRole")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json({ success: true, count: transactions.length, transactions });
  } catch (error) {
    console.error("M-PESA transaction list error:", error);
    res.status(500).json({ success: false, message: "Unable to load M-PESA transactions." });
  }
};

exports.deleteTransaction = async (req, res) => {
  try {
    const transaction = await MpesaTransaction.findById(req.params.id);
    if (!transaction) return res.status(404).json({ success: false, message: "M-PESA transaction not found." });
    if (transaction.reconciled || transaction.status === "successful") {
      return res.status(409).json({ success: false, code: "SETTLED_TRANSACTION_PROTECTED", message: "Settled M-PESA transactions cannot be permanently deleted. Use the finance audit/visibility controls instead so the contribution and ledger remain traceable." });
    }
    await MpesaTransaction.deleteOne({ _id: transaction._id });
    await createAuditLog({
      user: req.user._id,
      userRole: req.user.role,
      action: "MPESA_TRANSACTION_DELETED",
      module: "M-PESA",
      description: `SuperAdmin deleted an unsettled M-PESA transaction ${transaction._id}.`,
      req,
      metadata: { transactionId: transaction._id, status: transaction.status, purpose: transaction.purpose, amount: transaction.amount, paymentMethod: transaction.paymentMethod },
    });
    res.json({ success: true, message: "Unsettled M-PESA transaction deleted successfully." });
  } catch (error) {
    console.error("M-PESA transaction delete error:", error);
    res.status(500).json({ success: false, message: "Unable to delete the M-PESA transaction." });
  }
};

exports.stk = async (req, res) => {
  let tx = null;
  const requestId = String(req.requestId || req.get("X-Request-ID") || "unknown");
  try {
    const purpose = String(req.body?.purpose || "").trim();
    const referenceId = req.body?.referenceId || null;
    const amount = Number(req.body?.amount);
    const paymentMember = await resolvePaymentMember(req);
    const role = String(req.user?.role || req.userRole || "").toLowerCase();
    if (role !== "member" && purpose !== "contribution") {
      return res.status(403).json({ success: false, message: "Administrators may use M-PESA here only for their own Benevolent MIDAX contribution." });
    }
    const phoneNumber = normalizePhone(req.body?.phoneNumber || paymentMember?.phone || paymentMember?.mpesaNumber || req.user?.phone);
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
    } else if (purpose === "contribution") {
      const contribution = await ensureContributionForPayment(paymentMember, referenceId, amount);
      referenceModel = "Contribution";
      if (!referenceId) req.body.referenceId = String(contribution._id);
    }

    tx = await MpesaTransaction.create({
      member: paymentMember._id,
      purpose,
      referenceId: purpose === "contribution" ? (req.body.referenceId || referenceId) : referenceId,
      referenceModel,
      phoneNumber,
      amount: Math.round(amount),
      businessShortCode: String(process.env.MPESA_SHORTCODE || "650014"),
      accountReference: normalizeAccountReference(process.env.MPESA_ACCOUNT_REFERENCE || "BENMIDAX"),
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
    const paymentStage = upstream.paymentStage === "oauth" ? "oauth" : upstream.paymentStage === "stk" ? "stk" : "unknown";
    console.error("M-PESA STK error:", { requestId, stage: paymentStage, ...upstream });

    if (tx) {
      tx.status = "failed";
      tx.resultCode = upstream.status || null;
      tx.resultDescription = paymentStage === "oauth"
        ? "Safaricom Daraja authentication failed. Verify the production consumer key and consumer secret."
        : upstream.message || "M-PESA STK request failed.";
      try { await tx.save(); } catch (saveError) { console.error("M-PESA transaction failure update:", saveError); }
    }

    const isDatabaseError = String(upstream.code || "").toUpperCase().startsWith("E11000") || /Mongo|Mongoose|duplicate key/i.test(String(upstream.message || ""));
    const isOauth404 = paymentStage === "oauth" && upstream.status === 404;
    const isStk404 = paymentStage === "stk" && upstream.status === 404;
    const clientStatus = isDatabaseError ? 500 : (upstream.status && upstream.status >= 500 ? 502 : 502);
    const diagnosticMessage = paymentStage === "oauth"
      ? (upstream.status === 401 || upstream.status === 403
        ? "M-PESA authentication was rejected by Safaricom. Verify the production consumer key, consumer secret and Daraja application permissions."
        : isOauth404
          ? "Safaricom Daraja OAuth endpoint returned 404. Verify that production mode is using the correct Daraja host."
          : "M-PESA authentication with Safaricom could not be completed. Verify the production consumer credentials.")
      : isStk404
        ? "Safaricom returned HTTP 404 for the STK request. Verify the production Daraja application, shortcode and endpoint configuration."
        : upstream.status === 400
          ? "Safaricom rejected the STK request. Verify the production shortcode, passkey, consumer credentials, transaction type and callback URL."
          : upstream.status === 401
            ? "Safaricom rejected the Daraja credentials. Verify the production consumer key and consumer secret."
            : upstream.status === 403
              ? "Safaricom denied the Daraja request. Verify that the production application and shortcode are enabled for STK Push."
              : /ETIMEDOUT|ECONNABORTED/i.test(String(upstream.code || ""))
                ? "The M-PESA request timed out before Safaricom returned a response. The transaction may still be processing; check the payment again shortly."
                : isDatabaseError
        ? "The payment record could not be prepared safely. Your payment was not sent to Safaricom. Please retry once, and contact an administrator if it continues."
        : "The M-PESA service could not complete the STK request. Your portal session is unchanged.";

    return res.status(clientStatus).json({
      success: false,
      code: isOauth404 ? "MPESA_OAUTH_404" : isStk404 ? "MPESA_DARAJA_404" : paymentStage === "oauth" ? "MPESA_OAUTH_FAILED" : "MPESA_STK_FAILED",
      upstreamStatus: upstream.status,
      paymentStage,
      message: diagnosticMessage,
      endpoint: paymentStage === "oauth" ? endpointSummary().oauth : endpointSummary().stk,
      upstreamCode: upstream.code || null,
      transactionId: tx?._id || null,
      requestId,
      details: process.env.NODE_ENV === "production" ? undefined : error.response?.data,
    });
  }
};

async function applyContributionPayment(transaction) {
  const contribution = await Contribution.findOne({ _id: transaction.referenceId, member: transaction.member });
  if (!contribution) throw new Error("Contribution record was not found.");
  const amount = Number(transaction.amount);
  const alreadyApplied = Array.isArray(contribution.paymentTransactionIds) && contribution.paymentTransactionIds.some((id) => String(id) === String(transaction._id));
  if (!alreadyApplied) {
    const remaining = Math.max(0, Number(contribution.expectedAmount || 0) - Number(contribution.paidAmount || 0));
    if (amount > remaining) throw new Error("Payment exceeds the contribution balance and needs finance review.");
    contribution.paidAmount = Number(contribution.paidAmount || 0) + amount;
    contribution.paymentTransactionIds = Array.isArray(contribution.paymentTransactionIds) ? contribution.paymentTransactionIds : [];
    contribution.paymentTransactionIds.push(transaction._id);
    contribution.paymentDate = contribution.paymentDate || new Date();
    contribution.paymentMethod = "M-PESA";
    await contribution.save();
  }
  const referenceNumber = `MPESA-${transaction._id}`;
  const existingFinance = await Finance.findOne({ referenceNumber });
  if (!existingFinance) {
    await Finance.create({
      member: contribution.member,
      transactionNumber: referenceNumber,
      type: "contribution",
      category: "Contribution",
      amount,
      paymentMethod: "M-PESA",
      referenceNumber,
      description: `M-PESA contribution for ${contribution.member}`,
      status: "completed",
      transactionDate: transaction.completedAt || new Date(),
    });
  }
  return contribution;
}

async function reconcileSuccessfulTransaction(transaction) {
  if (!transaction || transaction.reconciled) return transaction;
  try {
    if (transaction.purpose === "loan_repayment") await applyEducationRepayment(transaction);
    else if (transaction.purpose === "support_repayment") await applyGenericSupportRepayment(transaction);
    else if (transaction.purpose === "community_assistance") await applyCommunityContribution(transaction);
    else if (transaction.purpose === "contribution") await applyContributionPayment(transaction);
    transaction.reconciled = true;
    transaction.reconciledAt = transaction.reconciledAt || new Date();
    if (String(transaction.resultDescription || "").startsWith("Payment received; application reconciliation requires review:")) {
      transaction.resultDescription = transaction.resultDescription.split(":").slice(1).join(":").trim();
    }
    await transaction.save();
  } catch (applyError) {
    transaction.status = "successful";
    transaction.reconciled = false;
    transaction.resultDescription = `Payment received; application reconciliation requires review: ${applyError.message}`;
    await transaction.save();
    console.error("M-PESA settlement application failed:", { transactionId: transaction._id, message: applyError.message });
    throw applyError;
  }
  return transaction;
}

exports.manualPayment = async (req, res) => {
  try {
    const amount = Number(req.body?.amount);
    const purpose = String(req.body?.purpose || "").trim();
    const referenceId = req.body?.referenceId || null;
    const paymentMember = await resolvePaymentMember(req);
    const role = String(req.user?.role || req.userRole || "").toLowerCase();
    if (role !== "member" && purpose !== "contribution") return res.status(403).json({ success: false, message: "Administrators may use M-PESA here only for their own Benevolent MIDAX contribution." });
    const manualTransactionCode = normalizeManualCode(req.body?.transactionCode || req.body?.manualTransactionCode);
    const suppliedPhone = req.body?.phoneNumber ? normalizePhone(req.body.phoneNumber) : "";
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: "Enter a valid M-PESA amount." });
    if (!manualTransactionCode || manualTransactionCode.length < 6) return res.status(400).json({ success: false, message: "Enter the M-PESA transaction code from the payment confirmation." });
    if (suppliedPhone && !/^254\d{9}$/.test(suppliedPhone)) return res.status(400).json({ success: false, message: "Enter a valid Kenyan M-PESA number, or leave it blank." });
    if (!["loan_repayment", "support_repayment", "community_assistance", "contribution", "other"].includes(purpose)) return res.status(400).json({ success: false, message: "Select a valid payment purpose." });
    if (!MANUAL_PAYBILL() || !MANUAL_ACCOUNT()) return res.status(503).json({ success: false, message: "Manual M-PESA PayBill collection is not configured." });
    if (purpose === "loan_repayment" || purpose === "support_repayment") {
      const referenceModel = purpose === "loan_repayment" ? "EducationSupport" : "SupportRequest";
      const { memberId } = await ensureReferenceExists(referenceModel, referenceId);
      if (memberId !== String(req.user._id)) return res.status(403).json({ success: false, message: "You are not authorised to submit a repayment for this record." });
    }
    if (purpose === "community_assistance") {
      const campaign = await CommunityAssistance.findById(referenceId);
      if (!campaign || !campaign.enabled || String(campaign.status) !== "open") return res.status(404).json({ success: false, message: "Community assistance case is not available." });
      if (String(campaign.recipientMember) === String(req.user._id)) return res.status(400).json({ success: false, message: "You cannot contribute to your own assistance case." });
      const remaining = Number(campaign.targetAmount) - Number(campaign.raisedAmount || 0);
      if (amount > remaining) return res.status(400).json({ success: false, message: `Maximum remaining contribution is KSh ${remaining.toLocaleString("en-KE")}.` });
    } else if (purpose === "contribution") {
      const contribution = await ensureContributionForPayment(paymentMember, referenceId, amount);
      req.body.referenceId = String(contribution._id);
    }
    const existing = await MpesaTransaction.findOne({ manualTransactionCode }).lean();
    if (existing) {
      if (String(existing.member) !== String(req.user._id)) return res.status(409).json({ success: false, message: "This M-PESA transaction code has already been submitted." });
      return res.json({ success: true, duplicate: true, transaction: existing, message: "This M-PESA transaction is already recorded and is awaiting verification." });
    }
    const tx = await MpesaTransaction.create({
      member: paymentMember._id,
      purpose,
      referenceId: purpose === "contribution" ? (req.body.referenceId || referenceId) : referenceId,
      referenceModel: purpose === "contribution" ? "Contribution" : purpose === "community_assistance" ? "CommunityAssistance" : purpose === "loan_repayment" ? "EducationSupport" : purpose === "support_repayment" ? "SupportRequest" : "",
      phoneNumber: suppliedPhone,
      amount: Math.round(amount),
      businessShortCode: MANUAL_PAYBILL(),
      accountReference: MANUAL_ACCOUNT(),
      paymentMethod: "manual_paybill",
      manualPaybill: MANUAL_PAYBILL(),
      manualAccountNumber: MANUAL_ACCOUNT(),
      manualTransactionCode,
      status: "pending",
      initiatedAt: new Date(),
      resultDescription: "Manual M-PESA payment submitted; awaiting administrator verification.",
    });
    await createAuditLog({ user: req.user._id, userRole: req.user.role, action: "mpesa_manual_submitted", module: "payments", description: "Member submitted a manual M-PESA PayBill payment for verification.", req, metadata: { transactionId: String(tx._id), amount: tx.amount, purpose } });
    return res.status(201).json({ success: true, message: "Payment recorded as pending. It will remain pending until an authorised administrator verifies the M-PESA transaction.", transaction: tx });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ success: false, message: "This M-PESA transaction code has already been submitted." });
    console.error("Manual M-PESA payment error:", { message: error.message });
    return res.status(500).json({ success: false, message: "The manual M-PESA payment could not be recorded. Please try again." });
  }
};

exports.manualPaymentsAdmin = async (_req, res) => {
  const transactions = await MpesaTransaction.find({ paymentMethod: "manual_paybill" }).populate("member", "fullName email memberNumber phone").sort({ createdAt: -1 }).limit(200).lean();
  return res.json({ success: true, transactions, paybill: MANUAL_PAYBILL(), accountNumber: MANUAL_ACCOUNT() });
};

exports.manualVerify = async (req, res) => {
  try {
    let transaction = await MpesaTransaction.findOne({ _id: req.params.id, paymentMethod: "manual_paybill" });
    if (!transaction) return res.status(404).json({ success: false, message: "Manual M-PESA transaction not found." });
    if (transaction.status === "reversed" || transaction.status === "failed") return res.status(400).json({ success: false, message: "This payment cannot be verified from its current status." });
    if (transaction.status !== "successful") {
      const claimed = await MpesaTransaction.findOneAndUpdate(
        { _id: transaction._id, status: "pending", paymentMethod: "manual_paybill" },
        { $set: { status: "successful", completedAt: new Date(), resultCode: 0, resultDescription: "Manual M-PESA payment verified by an authorised administrator." } },
        { new: true }
      );
      transaction = claimed || await MpesaTransaction.findById(transaction._id);
    }
    if (!transaction.reconciled) await reconcileSuccessfulTransaction(transaction);
    const fresh = await MpesaTransaction.findById(transaction._id).lean();
    await createAuditLog({ user: req.user._id, userRole: req.user.role, action: "mpesa_manual_verified", module: "payments", description: "Administrator verified a manual M-PESA PayBill payment.", req, metadata: { transactionId: String(transaction._id), reconciled: Boolean(fresh?.reconciled), amount: transaction.amount } });
    if (!fresh?.reconciled) return res.status(409).json({ success: false, code: "MPESA_RECONCILIATION_REVIEW", message: "Payment verified, but the linked contribution/support record needs finance review before it can be treated as fully reconciled.", transaction: fresh });
    return res.json({ success: true, message: "M-PESA payment verified and reconciled successfully.", transaction: fresh });
  } catch (error) {
    console.error("Manual M-PESA verification error:", { message: error.message });
    return res.status(500).json({ success: false, message: error.message || "The payment could not be verified." });
  }
};

exports.manualReject = async (req, res) => {
  try {
    const reason = String(req.body?.reason || "Rejected by administrator").trim().slice(0, 500);
    const transaction = await MpesaTransaction.findOneAndUpdate(
      { _id: req.params.id, paymentMethod: "manual_paybill", status: "pending" },
      { $set: { status: "failed", completedAt: new Date(), resultCode: 1, resultDescription: reason } },
      { new: true }
    );
    if (!transaction) return res.status(404).json({ success: false, message: "Pending manual M-PESA transaction not found." });
    await createAuditLog({ user: req.user._id, userRole: req.user.role, action: "mpesa_manual_rejected", module: "payments", description: "Administrator rejected a manual M-PESA PayBill payment.", req, metadata: { transactionId: String(transaction._id), reason } });
    if (transaction.member) await createNotification({ recipient: transaction.member, recipientModel: "Member", title: "M-PESA Payment Update", message: `Your manual M-PESA payment was rejected. Reason: ${reason}`, type: "payment", referenceId: transaction._id, referenceModel: "MpesaTransaction", icon: "payments" });
    return res.json({ success: true, message: "Manual M-PESA payment rejected.", transaction });
  } catch (error) {
    console.error("Manual M-PESA rejection error:", { message: error.message });
    return res.status(500).json({ success: false, message: "The payment could not be rejected." });
  }
};

exports.callbackHealth = async (_req, res) => {
  res.status(405).json({
    success: false,
    code: "CALLBACK_POST_ONLY",
    message: "M-PESA callback endpoint is active. Safaricom must call this endpoint with HTTP POST; a browser GET request is not a valid callback test.",
    allowedMethod: "POST",
    route: "/api/payments/callback",
    callbackConfigured: Boolean(process.env.MPESA_CALLBACK_URL),
    callbackUrl: process.env.MPESA_CALLBACK_URL || null,
    timestamp: new Date().toISOString(),
  });
};

exports.stkQuery = async (req, res) => {
  try {
    const transactionId = String(req.body?.transactionId || req.body?.id || "").trim();
    const checkoutRequestId = String(req.body?.checkoutRequestId || "").trim();
    if (!transactionId && !checkoutRequestId) {
      return res.status(400).json({ success: false, code: "MPESA_QUERY_REFERENCE_REQUIRED", message: "A payment transaction ID or CheckoutRequestID is required." });
    }

    const paymentMember = await resolvePaymentMember(req);
    const transaction = transactionId
      ? await MpesaTransaction.findOne({ _id: transactionId, member: paymentMember._id })
      : await MpesaTransaction.findOne({ checkoutRequestId, member: paymentMember._id });
    if (!transaction) return res.status(404).json({ success: false, code: "MPESA_TRANSACTION_NOT_FOUND", message: "Payment transaction not found." });

    if (transaction.status === "successful" || transaction.status === "failed" || transaction.status === "reversed") {
      return res.json({ success: true, settled: true, source: "database", transaction });
    }
    if (!transaction.checkoutRequestId) {
      return res.status(409).json({ success: false, code: "MPESA_CHECKOUT_REQUEST_PENDING", settled: false, message: "Safaricom has not returned a CheckoutRequestID yet.", transaction });
    }
    if (!isConfigured()) {
      return res.status(503).json({ success: false, code: "MPESA_NOT_CONFIGURED", settled: false, message: "M-PESA production credentials are not configured on the server." });
    }

    const result = await stkQuery({ checkoutRequestId: transaction.checkoutRequestId });
    const resultCode = result?.ResultCode != null ? Number(result.ResultCode) : null;
    transaction.resultCode = resultCode;
    transaction.resultDescription = String(result?.ResultDesc || result?.ResponseDescription || transaction.resultDescription || "M-PESA status query completed.");

    if (resultCode === 0) {
      const claimed = await MpesaTransaction.findOneAndUpdate(
        { _id: transaction._id, status: { $in: ["pending", "initiated"] } },
        { $set: { status: "successful", completedAt: transaction.completedAt || new Date(), resultCode, resultDescription: transaction.resultDescription } },
        { new: true }
      );
      const settled = claimed || await MpesaTransaction.findById(transaction._id);
      if (settled && !settled.reconciled) await reconcileSuccessfulTransaction(settled);
      return res.json({ success: true, settled: true, source: "safaricom-query", message: settled?.resultDescription || transaction.resultDescription, transaction: settled });
    }

    if (resultCode != null && resultCode !== 0) {
      await MpesaTransaction.findOneAndUpdate(
        { _id: transaction._id, status: { $in: ["pending", "initiated"] } },
        { $set: { status: "failed", completedAt: transaction.completedAt || new Date(), resultCode, resultDescription: transaction.resultDescription } },
        { new: true }
      );
      return res.json({ success: true, settled: true, source: "safaricom-query", message: transaction.resultDescription || "M-PESA payment was not completed.", transaction });
    }

    await transaction.save();
    return res.json({ success: true, settled: false, source: "safaricom-query", message: transaction.resultDescription || "M-PESA payment is still being processed.", transaction });
  } catch (error) {
    const upstream = extractUpstreamError(error);
    console.error("M-PESA STK query error:", upstream);
    return res.status(502).json({
      success: false,
      code: upstream.paymentStage === "oauth" ? "MPESA_OAUTH_FAILED" : "MPESA_STK_QUERY_FAILED",
      upstreamStatus: upstream.status,
      paymentStage: upstream.paymentStage,
      message: upstream.paymentStage === "oauth"
        ? "M-PESA authentication failed while checking the STK request. Verify the production Daraja consumer credentials."
        : upstream.status === 400
          ? "Safaricom rejected the STK status query. The original request may still be pending or may have expired."
          : "Unable to confirm the M-PESA transaction status from Safaricom.",
      endpoint: upstream.paymentStage === "oauth" ? endpointSummary().oauth : endpointSummary().stkQuery,
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

    transaction.callbackPayload = req.body;
    transaction.resultCode = Number(callback.ResultCode ?? 1);
    transaction.resultDescription = String(callback.ResultDesc || transaction.resultDescription || "");

    const items = Array.isArray(callback.CallbackMetadata?.Item) ? callback.CallbackMetadata.Item : [];
    const getItem = (name) => items.find((item) => item.Name === name)?.Value;
    const receipt = String(getItem("MpesaReceiptNumber") || "");
    if (receipt) transaction.mpesaReceiptNumber = receipt;

    if (Number(callback.ResultCode) === 0) {
      const claimed = await MpesaTransaction.findOneAndUpdate(
        { _id: transaction._id, status: { $in: ["pending", "initiated"] } },
        { $set: { status: "successful", completedAt: transaction.completedAt || new Date(), callbackPayload: req.body, resultCode: transaction.resultCode, resultDescription: transaction.resultDescription, mpesaReceiptNumber: transaction.mpesaReceiptNumber } },
        { new: true }
      );
      const settled = claimed || await MpesaTransaction.findById(transaction._id);
      if (settled && !settled.reconciled) await reconcileSuccessfulTransaction(settled);
    } else {
      const failed = await MpesaTransaction.findOneAndUpdate(
        { _id: transaction._id, status: { $in: ["pending", "initiated"] } },
        { $set: { status: "failed", completedAt: transaction.completedAt || new Date(), callbackPayload: req.body, resultCode: transaction.resultCode, resultDescription: transaction.resultDescription, mpesaReceiptNumber: transaction.mpesaReceiptNumber } },
        { new: true }
      );
      if (failed?.member) {
        await createNotification({
          recipient: transaction.member,
          recipientModel: "Member",
          title: "M-PESA Payment Update",
          message: `Your M-PESA payment was not completed. ${transaction.resultDescription || "Please retry or contact the scheme administrator."}`,
          type: "payment",
          referenceId: transaction._id,
          referenceModel: "MpesaTransaction",
          link: "/member/mpesa-records",
          icon: "payments",
        });
      }
    }
  } catch (error) {
    console.error("M-PESA callback error:", error);
  }
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
