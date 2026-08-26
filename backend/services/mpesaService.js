const axios = require("axios");
const crypto = require("crypto");

const env = (name, fallback = "") => String(process.env[name] || fallback).trim();
const isPlaceholder = (value) => { const v=String(value||"").trim().toUpperCase(); return !v || v.startsWith("YOUR_") || v.includes("YOUR_DARAJA_") || v === "CHANGE_ME" || v === "REPLACE_ME"; };
const DEFAULT_MPESA_SHORTCODE = "650014";
const DEFAULT_MPESA_ACCOUNT_REFERENCE = "BENMIDAX";
const isDarajaConfigured = () => Boolean(
  !isPlaceholder(env("MPESA_CONSUMER_KEY")) &&
  !isPlaceholder(env("MPESA_CONSUMER_SECRET"))
);
const isValidTransactionType = () => ["CustomerPayBillOnline", "CustomerBuyGoodsOnline"].includes(env("MPESA_TRANSACTION_TYPE", "CustomerPayBillOnline"));

const isConfigured = () => {
  const enabled = env("MPESA_ENABLED", "false").toLowerCase() === "true";
  return enabled && isDarajaConfigured() && Boolean(
    !isPlaceholder(env("MPESA_PASSKEY")) &&
    !isPlaceholder(env("MPESA_SHORTCODE")) &&
    !isPlaceholder(env("MPESA_ACCOUNT_REFERENCE")) &&
    !isPlaceholder(env("MPESA_CALLBACK_URL")) &&
    /^https:\/\//i.test(env("MPESA_CALLBACK_URL")) &&
    isValidTransactionType()
  );
};

const isB2CConfigured = () => {
  const b2cEnabled = env("MPESA_B2C_ENABLED", "true").toLowerCase() === "true";
  if (!b2cEnabled) return false;
  const required = [
    "MPESA_CONSUMER_KEY",
    "MPESA_CONSUMER_SECRET",
    "MPESA_B2C_SHORTCODE",
    "MPESA_INITIATOR_NAME",
    "MPESA_SECURITY_CREDENTIAL",
    "MPESA_B2C_RESULT_URL",
    "MPESA_B2C_TIMEOUT_URL",
  ];
  return env("MPESA_ENABLED", "false").toLowerCase() === "true" && required.every((name) => !isPlaceholder(env(name)));
};
const baseUrl = () => env("MPESA_ENVIRONMENT", "production").toLowerCase() === "sandbox"
  ? "https://sandbox.safaricom.co.ke"
  : "https://api.safaricom.co.ke";

const endpointSummary = () => ({
  oauth: `${baseUrl()}/oauth/v1/generate`,
  stk: `${baseUrl()}/mpesa/stkpush/v1/processrequest`,
  stkQuery: `${baseUrl()}/mpesa/stkpushquery/v1/query`,
  b2c: `${baseUrl()}/mpesa/b2c/v1/paymentrequest`,
});

const extractUpstreamError = (error) => ({
  paymentStage: String(error?.paymentStage || "unknown"),
  status: Number(error?.response?.status || 0) || null,
  code: String(error?.response?.data?.errorCode || error?.code || ""),
  message: String(error?.response?.data?.errorMessage || error?.response?.data?.message || error?.response?.data?.ResponseDescription || error?.message || "M-PESA upstream request failed."),
});

const timestamp = () => {
  const d = new Date();
  const pad = (v) => String(v).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

const normalizeAccountReference = (value) => String(value || DEFAULT_MPESA_ACCOUNT_REFERENCE).trim().replace(/[^A-Za-z0-9._-]/g, "").slice(0, 13) || DEFAULT_MPESA_ACCOUNT_REFERENCE;

const normalizePhone = (value) => {
  const raw = String(value || "").replace(/\s+/g, "").replace(/^\+/, "");
  if (/^2547\d{8}$/.test(raw)) return raw;
  if (/^07\d{8}$/.test(raw)) return `254${raw.slice(1)}`;
  if (/^01\d{8}$/.test(raw)) return `254${raw.slice(1)}`;
  if (/^7\d{8}$/.test(raw)) return `254${raw}`;
  if (/^1\d{8}$/.test(raw)) return `254${raw}`;
  return raw;
};

async function getAccessToken() {
  if (!isDarajaConfigured()) throw Object.assign(new Error("M-PESA Daraja API credentials are not configured on the server."), { paymentStage: "oauth" });
  const token = Buffer.from(`${env("MPESA_CONSUMER_KEY")}:${env("MPESA_CONSUMER_SECRET")}`).toString("base64");
  let response;
  try {
    response = await axios.get(`${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${token}` },
      timeout: 15000,
    });
  } catch (error) {
    error.paymentStage = "oauth";
    throw error;
  }
  if (!response.data?.access_token) throw Object.assign(new Error("Daraja did not return an access token."), { paymentStage: "oauth" });
  return response.data.access_token;
}

async function stkPush({ phoneNumber, amount, accountReference, transactionDesc }) {
  const accessToken = await getAccessToken();
  const timestampValue = timestamp();
  const shortcode = env("MPESA_SHORTCODE", DEFAULT_MPESA_SHORTCODE);
  const password = Buffer.from(`${shortcode}${env("MPESA_PASSKEY")}${timestampValue}`).toString("base64");
  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestampValue,
    TransactionType: env("MPESA_TRANSACTION_TYPE", "CustomerPayBillOnline"),
    Amount: Math.max(1, Math.round(Number(amount))),
    PartyA: normalizePhone(phoneNumber),
    PartyB: shortcode,
    PhoneNumber: normalizePhone(phoneNumber),
    CallBackURL: env("MPESA_CALLBACK_URL"),
    AccountReference: normalizeAccountReference(accountReference || env("MPESA_ACCOUNT_REFERENCE", DEFAULT_MPESA_ACCOUNT_REFERENCE)),
    TransactionDesc: String(transactionDesc || "Benevolent MIDAX payment").slice(0, 20),
  };
  let response;
  try {
    response = await axios.post(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, payload, {
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      timeout: 20000,
    });
  } catch (error) {
    error.paymentStage = "stk";
    throw error;
  }
  return response.data;
}

async function stkQuery({ checkoutRequestId }) {
  const accessToken = await getAccessToken();
  const timestampValue = timestamp();
  const shortcode = env("MPESA_SHORTCODE", DEFAULT_MPESA_SHORTCODE);
  const password = Buffer.from(`${shortcode}${env("MPESA_PASSKEY")}${timestampValue}`).toString("base64");
  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestampValue,
    CheckoutRequestID: String(checkoutRequestId || ""),
  };
  let response;
  try {
    response = await axios.post(`${baseUrl()}/mpesa/stkpushquery/v1/query`, payload, {
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      timeout: 20000,
    });
  } catch (error) {
    error.paymentStage = "stk_query";
    throw error;
  }
  return response.data;
}

async function b2cPayment({ phoneNumber, amount, remarks, occasion }) {
  const required = [
    "MPESA_CONSUMER_KEY",
    "MPESA_CONSUMER_SECRET",
    "MPESA_B2C_SHORTCODE",
    "MPESA_INITIATOR_NAME",
    "MPESA_SECURITY_CREDENTIAL",
    "MPESA_B2C_RESULT_URL",
    "MPESA_B2C_TIMEOUT_URL",
  ];
  if (!isB2CConfigured() || required.some((name) => !env(name))) {
    throw new Error("M-PESA B2C payout is not fully configured on the server.");
  }
  const accessToken = await getAccessToken();
  const response = await axios.post(`${baseUrl()}/mpesa/b2c/v1/paymentrequest`, {
    InitiatorName: env("MPESA_INITIATOR_NAME"),
    SecurityCredential: env("MPESA_SECURITY_CREDENTIAL"),
    CommandID: env("MPESA_B2C_COMMAND_ID", "BusinessPayment"),
    Amount: Math.max(1, Math.round(Number(amount))),
    PartyA: env("MPESA_B2C_SHORTCODE") || env("MPESA_SHORTCODE"),
    PartyB: normalizePhone(phoneNumber),
    Remarks: String(remarks || "Benevolent MIDAX assistance").slice(0, 100),
    QueueTimeOutURL: env("MPESA_B2C_TIMEOUT_URL"),
    ResultURL: env("MPESA_B2C_RESULT_URL"),
    Occasion: String(occasion || "Benevolent MIDAX").slice(0, 100),
  }, {
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 20000,
  });
  return response.data;
}

const idempotencyKey = () => crypto.randomBytes(12).toString("hex");

const getConfigurationSummary = () => {
  const environment = env("MPESA_ENVIRONMENT", "production").toLowerCase();
  const callbackUrl = env("MPESA_CALLBACK_URL");
  const warnings = [];
  if (environment === "production" && /^https:\/\/sandbox\./i.test(baseUrl())) warnings.push("Sandbox Daraja endpoint selected while production mode is enabled.");
  if (environment === "production" && !/^https:\/\/api\.safaricom\.co\.ke$/i.test(baseUrl())) warnings.push("Production mode is not using the Safaricom production API host.");
  if (environment === "production" && callbackUrl && !/^https:\/\//i.test(callbackUrl)) warnings.push("Production M-PESA callback URL must use HTTPS.");
  if (!isValidTransactionType()) warnings.push("MPESA_TRANSACTION_TYPE must be CustomerPayBillOnline or CustomerBuyGoodsOnline.");
  return {
    enabled: env("MPESA_ENABLED", "false").toLowerCase() === "true",
    environment,
    configured: isConfigured(),
    darajaConfigured: isDarajaConfigured(),
    transactionType: env("MPESA_TRANSACTION_TYPE", "CustomerPayBillOnline"),
    b2cConfigured: isB2CConfigured(),
    b2cEnabled: env("MPESA_B2C_ENABLED", "true").toLowerCase() === "true",
    shortcode: env("MPESA_SHORTCODE"),
    callbackUrl,
    b2cResultUrl: env("MPESA_B2C_RESULT_URL"),
    b2cTimeoutUrl: env("MPESA_B2C_TIMEOUT_URL"),
    warnings,
  };
};

module.exports = { isConfigured, isB2CConfigured, isDarajaConfigured, normalizePhone, normalizeAccountReference, stkPush, stkQuery, b2cPayment, idempotencyKey, getConfigurationSummary, endpointSummary, extractUpstreamError };
