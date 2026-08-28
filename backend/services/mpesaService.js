const axios = require("axios");
const crypto = require("crypto");
const https = require("https");

const env = (name, fallback = "") => String(process.env[name] || fallback).trim();
const isPlaceholder = (value) => {
  const v = String(value || "").trim().toUpperCase();
  return !v || v.startsWith("YOUR_") || v.includes("YOUR_DARAJA_") || v === "CHANGE_ME" || v === "REPLACE_ME";
};
const DEFAULT_MPESA_SHORTCODE = "650014";
const DEFAULT_MPESA_ACCOUNT_REFERENCE = "BENMIDAX";
const MPESA_TIMEZONE = env("MPESA_TIMEZONE", "Africa/Nairobi") || "Africa/Nairobi";
const MPESA_OAUTH_TIMEOUT_MS = Math.min(Math.max(Number(env("MPESA_OAUTH_TIMEOUT_MS", 15000)) || 15000, 3000), 30000);
const MPESA_REQUEST_TIMEOUT_MS = Math.min(Math.max(Number(env("MPESA_REQUEST_TIMEOUT_MS", 20000)) || 20000, 5000), 45000);
const MPESA_OAUTH_RETRIES = Math.min(Math.max(Number(env("MPESA_OAUTH_RETRIES", 2)) || 2, 0), 3);
const MPESA_RETRY_BASE_MS = Math.min(Math.max(Number(env("MPESA_RETRY_BASE_MS", 250)) || 250, 100), 1500);

// A single keep-alive agent reduces connection churn. family: 4 avoids intermittent
// IPv6 routing problems on hosts where the upstream is reachable over IPv4 only.
const darajaAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 25,
  maxFreeSockets: 10,
  timeout: 45000,
  family: 4,
});

let tokenCache = { token: "", expiresAt: 0, environment: "", fingerprint: "" };
let tokenInFlight = null;

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
  const b2cEnabled = env("MPESA_B2C_ENABLED", "false").toLowerCase() === "true";
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

const maskPhone = (value) => {
  const phone = String(value || "").replace(/\s+/g, "");
  if (/^\d{12}$/.test(phone)) return `${phone.slice(0, 5)}*******${phone.slice(-2)}`;
  return "invalid";
};

const logMpesa = (event, details = {}) => {
  try { console.info(`[mpesa][${event}]`, details); } catch (_) {}
};

const getErrorCode = (error) => String(error?.response?.data?.errorCode || error?.code || "");
const isNetworkError = (error) => [
  "ECONNABORTED", "ETIMEDOUT", "ECONNRESET", "EAI_AGAIN", "ENETUNREACH", "EHOSTUNREACH", "ECONNREFUSED", "EPIPE",
].includes(getErrorCode(error));
const isTransientHttp = (status) => [408, 425, 429, 500, 502, 503, 504].includes(Number(status));
const classifyUpstreamError = (error) => {
  const status = Number(error?.response?.status || 0) || null;
  if (error?.errorCategory === "configuration" || error?.errorCategory === "validation") return error.errorCategory;
  if (isNetworkError(error) || !error?.response) return "network";
  if (status === 401 || status === 403) return "authentication";
  if (isTransientHttp(status)) return "transient_provider";
  if (status >= 400 && status < 500) return "provider_rejection";
  if (status >= 500) return "provider_error";
  return "unknown";
};

const extractUpstreamError = (error) => ({
  paymentStage: String(error?.paymentStage || "unknown"),
  status: Number(error?.response?.status || 0) || null,
  code: getErrorCode(error),
  message: String(error?.response?.data?.errorMessage || error?.response?.data?.message || error?.response?.data?.ResponseDescription || error?.message || "M-PESA upstream request failed."),
  category: classifyUpstreamError(error),
});

const getStkCallback = (body) => body?.Body?.stkCallback || body?.stkCallback || null;
const toResultCode = (callback) => (callback?.ResultCode != null ? Number(callback.ResultCode) : null);
const parseMetadata = (callback) => {
  const items = Array.isArray(callback?.CallbackMetadata?.Item) ? callback.CallbackMetadata.Item : [];
  return Object.fromEntries(items.filter((item) => item?.Name).map((item) => [String(item.Name), item.Value]));
};

const timestamp = () => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: MPESA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}${get("month")}${get("day")}${get("hour")}${get("minute")}${get("second")}`;
};

const normalizeAccountReference = (value) => String(value || DEFAULT_MPESA_ACCOUNT_REFERENCE).trim().replace(/[^A-Za-z0-9._-]/g, "").slice(0, 13) || DEFAULT_MPESA_ACCOUNT_REFERENCE;

const normalizePhone = (value) => {
  const raw = String(value || "").replace(/\s+/g, "").replace(/^\+/, "");
  if (/^254[17]\d{8}$/.test(raw)) return raw;
  if (/^07\d{8}$/.test(raw)) return `254${raw.slice(1)}`;
  if (/^01\d{8}$/.test(raw)) return `254${raw.slice(1)}`;
  if (/^7\d{8}$/.test(raw)) return `254${raw}`;
  if (/^1\d{8}$/.test(raw)) return `254${raw}`;
  return raw;
};

const credentialsFingerprint = () => crypto.createHash("sha256")
  .update(`${env("MPESA_ENVIRONMENT", "production")}|${env("MPESA_CONSUMER_KEY")}|${env("MPESA_CONSUMER_SECRET")}`)
  .digest("hex");

const isCachedTokenValid = () => Boolean(tokenCache.token && tokenCache.expiresAt > Date.now() + 30000 && tokenCache.environment === env("MPESA_ENVIRONMENT", "production") && tokenCache.fingerprint === credentialsFingerprint());
const clearAccessToken = () => { tokenCache = { token: "", expiresAt: 0, environment: "", fingerprint: "" }; };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getRetryDelay = (attempt) => MPESA_RETRY_BASE_MS * (2 ** attempt) + Math.floor(Math.random() * 100);
const shouldRetryOAuth = (error, attempt) => {
  if (attempt >= MPESA_OAUTH_RETRIES) return false;
  const category = classifyUpstreamError(error);
  if (category === "authentication" || category === "provider_rejection") return false;
  return category === "network" || category === "transient_provider";
};

async function fetchAccessToken() {
  if (!isDarajaConfigured()) {
    throw Object.assign(new Error("M-PESA Daraja API credentials are not configured on the server."), { paymentStage: "oauth", errorCategory: "configuration" });
  }
  const basic = Buffer.from(`${env("MPESA_CONSUMER_KEY")}\:${env("MPESA_CONSUMER_SECRET")}`).toString("base64");
  let lastError = null;
  for (let attempt = 0; attempt <= MPESA_OAUTH_RETRIES; attempt += 1) {
    logMpesa("oauth:init", { endpoint: endpointSummary().oauth, credentialsPresent: true, attempt: attempt + 1 });
    try {
      const response = await axios.get(`${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: { Authorization: `Basic ${basic}`, Accept: "application/json" },
        timeout: MPESA_OAUTH_TIMEOUT_MS,
        httpsAgent: darajaAgent,
        family: 4,
        transitional: { clarifyTimeoutError: true },
        validateStatus: (status) => status >= 200 && status < 300,
        proxy: false,
      });
      if (!response.data?.access_token) throw Object.assign(new Error("Daraja did not return an access token."), { paymentStage: "oauth", errorCategory: "provider_error" });
      const expiresInSeconds = Math.max(60, Number(response.data?.expires_in) || 3600);
      tokenCache = {
        token: String(response.data.access_token),
        expiresAt: Date.now() + Math.max(30000, (expiresInSeconds - 60) * 1000),
        environment: env("MPESA_ENVIRONMENT", "production"),
        fingerprint: credentialsFingerprint(),
      };
      logMpesa("oauth:response", { httpStatus: response.status, tokenReceived: true, expiresIn: expiresInSeconds });
      return tokenCache.token;
    } catch (error) {
      error.paymentStage = "oauth";
      lastError = error;
      logMpesa("oauth:error", {
        httpStatus: error?.response?.status || null,
        code: error?.response?.data?.errorCode || error?.code || null,
        category: classifyUpstreamError(error),
        attempt: attempt + 1,
      });
      if (!shouldRetryOAuth(error, attempt)) break;
      await sleep(getRetryDelay(attempt));
    }
  }
  throw lastError || Object.assign(new Error("M-PESA OAuth request failed."), { paymentStage: "oauth" });
}

async function getAccessToken({ forceRefresh = false } = {}) {
  if (!forceRefresh && isCachedTokenValid()) return tokenCache.token;
  if (tokenInFlight) return tokenInFlight;
  tokenInFlight = fetchAccessToken()
    .finally(() => { tokenInFlight = null; });
  return tokenInFlight;
}

async function postWithToken(path, payload, { timeout = MPESA_REQUEST_TIMEOUT_MS, paymentStage, retryAuth = true } = {}) {
  let token = await getAccessToken();
  for (let attempt = 0; attempt < (retryAuth ? 2 : 1); attempt += 1) {
    try {
      return await axios.post(`${baseUrl()}${path}`, payload, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
        timeout,
        httpsAgent: darajaAgent,
        family: 4,
        transitional: { clarifyTimeoutError: true },
        proxy: false,
      });
    } catch (error) {
      error.paymentStage = paymentStage;
      if (retryAuth && Number(error?.response?.status) === 401 && attempt === 0) {
        clearAccessToken();
        token = await getAccessToken({ forceRefresh: true });
        continue;
      }
      throw error;
    }
  }
  throw Object.assign(new Error("M-PESA request failed."), { paymentStage });
}

async function stkPush({ phoneNumber, amount, accountReference, transactionDesc }) {
  if (!isConfigured()) {
    throw Object.assign(new Error("M-PESA STK Push is not fully configured on the server."), { paymentStage: "configuration", errorCategory: "configuration" });
  }
  const numericAmount = Number(amount);
  if (!Number.isInteger(numericAmount) || numericAmount < 1) {
    throw Object.assign(new Error("M-PESA amount must be a positive whole number."), { paymentStage: "validation", errorCategory: "validation" });
  }
  const normalizedPhone = normalizePhone(phoneNumber);
  if (!/^254[17]\d{8}$/.test(normalizedPhone)) {
    throw Object.assign(new Error("Enter a valid Kenyan M-PESA phone number."), { paymentStage: "validation", errorCategory: "validation" });
  }
  const accessToken = await getAccessToken();
  const timestampValue = timestamp();
  const shortcode = env("MPESA_SHORTCODE", DEFAULT_MPESA_SHORTCODE);
  const transactionType = env("MPESA_TRANSACTION_TYPE", "CustomerPayBillOnline");
  const callbackUrl = env("MPESA_CALLBACK_URL");
  const password = Buffer.from(`${shortcode}${env("MPESA_PASSKEY")}${timestampValue}`).toString("base64");
  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestampValue,
    TransactionType: transactionType,
    Amount: numericAmount,
    PartyA: normalizedPhone,
    PartyB: shortcode,
    PhoneNumber: normalizedPhone,
    CallBackURL: callbackUrl,
    AccountReference: normalizeAccountReference(accountReference || env("MPESA_ACCOUNT_REFERENCE", DEFAULT_MPESA_ACCOUNT_REFERENCE)),
    TransactionDesc: String(transactionDesc || "Benevolent MIDAX payment").slice(0, 20),
  };
  logMpesa("stk:init", { endpoint: endpointSummary().stk, environment: env("MPESA_ENVIRONMENT", "production"), shortcode, transactionType, phone: maskPhone(normalizedPhone), amount: payload.Amount, callbackConfigured: Boolean(callbackUrl), passkeyPresent: !isPlaceholder(env("MPESA_PASSKEY")) });
  const response = await postWithToken("/mpesa/stkpush/v1/processrequest", payload, { paymentStage: "stk" });
  logMpesa("stk:response", { httpStatus: response.status, responseCode: response.data?.ResponseCode ?? null, responseDescription: response.data?.ResponseDescription ?? null, customerMessage: response.data?.CustomerMessage ?? null, merchantRequestId: response.data?.MerchantRequestID || null, checkoutRequestId: response.data?.CheckoutRequestID || null });
  return response.data;
}

async function stkQuery({ checkoutRequestId }) {
  if (!isConfigured()) throw Object.assign(new Error("M-PESA STK status checks are not fully configured on the server."), { paymentStage: "configuration", errorCategory: "configuration" });
  const id = String(checkoutRequestId || "").trim();
  if (!id) throw Object.assign(new Error("CheckoutRequestID is required for an STK status check."), { paymentStage: "validation", errorCategory: "validation" });
  const accessToken = await getAccessToken();
  const timestampValue = timestamp();
  const shortcode = env("MPESA_SHORTCODE", DEFAULT_MPESA_SHORTCODE);
  const password = Buffer.from(`${shortcode}${env("MPESA_PASSKEY")}${timestampValue}`).toString("base64");
  const response = await postWithToken("/mpesa/stkpushquery/v1/query", { BusinessShortCode: shortcode, Password: password, Timestamp: timestampValue, CheckoutRequestID: id }, { paymentStage: "stk_query" });
  return response.data;
}

async function b2cPayment({ phoneNumber, amount, remarks, occasion }) {
  const required = ["MPESA_CONSUMER_KEY", "MPESA_CONSUMER_SECRET", "MPESA_B2C_SHORTCODE", "MPESA_INITIATOR_NAME", "MPESA_SECURITY_CREDENTIAL", "MPESA_B2C_RESULT_URL", "MPESA_B2C_TIMEOUT_URL"];
  if (!isB2CConfigured() || required.some((name) => !env(name))) throw Object.assign(new Error("M-PESA B2C payout is not fully configured on the server."), { paymentStage: "configuration", errorCategory: "configuration" });
  const numericAmount = Number(amount);
  if (!Number.isInteger(numericAmount) || numericAmount < 1) throw Object.assign(new Error("M-PESA payout amount must be a positive whole number."), { paymentStage: "validation", errorCategory: "validation" });
  const normalizedPhone = normalizePhone(phoneNumber);
  if (!/^254[17]\d{8}$/.test(normalizedPhone)) throw Object.assign(new Error("Enter a valid Kenyan M-PESA phone number."), { paymentStage: "validation", errorCategory: "validation" });
  const response = await postWithToken("/mpesa/b2c/v1/paymentrequest", {
    InitiatorName: env("MPESA_INITIATOR_NAME"),
    SecurityCredential: env("MPESA_SECURITY_CREDENTIAL"),
    CommandID: env("MPESA_B2C_COMMAND_ID", "BusinessPayment"),
    Amount: numericAmount,
    PartyA: env("MPESA_B2C_SHORTCODE") || env("MPESA_SHORTCODE"),
    PartyB: normalizedPhone,
    Remarks: String(remarks || "Benevolent MIDAX assistance").slice(0, 100),
    QueueTimeOutURL: env("MPESA_B2C_TIMEOUT_URL"),
    ResultURL: env("MPESA_B2C_RESULT_URL"),
    Occasion: String(occasion || "Benevolent MIDAX").slice(0, 100),
  }, { paymentStage: "b2c" });
  return response.data;
}

const idempotencyKey = () => crypto.randomBytes(12).toString("hex");
const getConfigurationSummary = () => {
  const environment = env("MPESA_ENVIRONMENT", "production").toLowerCase();
  const callbackUrl = env("MPESA_CALLBACK_URL");
  const warnings = [];
  if (environment === "production" && !/^https:\/\/api\.safaricom\.co\.ke$/i.test(baseUrl())) warnings.push("Production mode is not using the Safaricom production API host.");
  if (environment === "production" && callbackUrl && !/^https:\/\//i.test(callbackUrl)) warnings.push("Production M-PESA callback URL must use HTTPS.");
  if (!isValidTransactionType()) warnings.push("MPESA_TRANSACTION_TYPE must be CustomerPayBillOnline or CustomerBuyGoodsOnline.");
  return { enabled: env("MPESA_ENABLED", "false").toLowerCase() === "true", environment, configured: isConfigured(), darajaConfigured: isDarajaConfigured(), transactionType: env("MPESA_TRANSACTION_TYPE", "CustomerPayBillOnline"), b2cConfigured: isB2CConfigured(), b2cEnabled: env("MPESA_B2C_ENABLED", "false").toLowerCase() === "true", shortcode: env("MPESA_SHORTCODE"), callbackUrl, b2cResultUrl: env("MPESA_B2C_RESULT_URL"), b2cTimeoutUrl: env("MPESA_B2C_TIMEOUT_URL"), warnings };
};

module.exports = { isConfigured, isB2CConfigured, isDarajaConfigured, isValidTransactionType, normalizePhone, normalizeAccountReference, stkPush, stkQuery, b2cPayment, idempotencyKey, getConfigurationSummary, endpointSummary, extractUpstreamError, classifyUpstreamError, clearAccessToken, timestamp, getStkCallback, toResultCode, parseMetadata };
