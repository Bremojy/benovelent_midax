const toResultCode = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const getStkCallback = (body) => body?.Body?.stkCallback || body?.stkCallback || null;

const getCheckoutRequestId = (callback) => String(callback?.CheckoutRequestID || "").trim();

const classifyResultCode = (value) => {
  const resultCode = toResultCode(value);
  return resultCode === 0 ? "successful" : resultCode === null ? "unknown" : "failed";
};

const parseMetadata = (callback) => {
  const items = Array.isArray(callback?.CallbackMetadata?.Item) ? callback.CallbackMetadata.Item : [];
  return Object.fromEntries(items.filter((item) => item?.Name).map((item) => [item.Name, item.Value]));
};

module.exports = { toResultCode, getStkCallback, getCheckoutRequestId, classifyResultCode, parseMetadata };
