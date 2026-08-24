const axios = require("axios");
const crypto = require("crypto");

const env = (name, fallback = "") => String(process.env[name] || fallback).trim();
const DEFAULT_MPESA_SHORTCODE = "247247";
const DEFAULT_MPESA_ACCOUNT_REFERENCE = "0650186528835";
const isDarajaConfigured = () => Boolean(
  env("MPESA_CONSUMER_KEY") &&
  env("MPESA_CONSUMER_SECRET")
);
const isConfigured = () => {
  const enabled = env("MPESA_ENABLED", "false").toLowerCase() === "true";
  return enabled && isDarajaConfigured() && Boolean(
    env("MPESA_PASSKEY") &&
    env("MPESA_SHORTCODE") &&
    env("MPESA_ACCOUNT_REFERENCE") &&
    env("MPESA_CALLBACK_URL")
  );
};

const isB2CConfigured = () => {
  const required = [
    "MPESA_CONSUMER_KEY",
    "MPESA_CONSUMER_SECRET",
    "MPESA_B2C_SHORTCODE",
    "MPESA_INITIATOR_NAME",
    "MPESA_SECURITY_CREDENTIAL",
    "MPESA_B2C_RESULT_URL",
    "MPESA_B2C_TIMEOUT_URL",
  ];
  return env("MPESA_ENABLED", "false").toLowerCase() === "true" && required.every((name) => Boolean(env(name)));
};
const baseUrl = () => env("MPESA_ENVIRONMENT", "production").toLowerCase() === "sandbox"
  ? "https://sandbox.safaricom.co.ke"
  : "https://api.safaricom.co.ke";

const timestamp = () => {
  const d = new Date();
  const pad = (v) => String(v).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

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
  if (!isDarajaConfigured()) throw new Error("M-PESA Daraja API credentials are not configured on the server.");
  const token = Buffer.from(`${env("MPESA_CONSUMER_KEY")}:${env("MPESA_CONSUMER_SECRET")}`).toString("base64");
  const response = await axios.get(`${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${token}` },
    timeout: 15000,
  });
  if (!response.data?.access_token) throw new Error("Daraja did not return an access token.");
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
    AccountReference: String(accountReference || env("MPESA_ACCOUNT_REFERENCE", DEFAULT_MPESA_ACCOUNT_REFERENCE)).slice(0, 20),
    TransactionDesc: String(transactionDesc || "Benevolent MIDAX payment").slice(0, 20),
  };
  const response = await axios.post(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, payload, {
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    timeout: 20000,
  });
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

module.exports = { isConfigured, isB2CConfigured, isDarajaConfigured, normalizePhone, stkPush, b2cPayment, idempotencyKey };
