const assert = require("assert");
const Module = require("module");
const originalLoad = Module._load;
let oauthCalls = 0;
let stkCalls = 0;
let mode = "success";
Module._load = function(request, parent, isMain) {
  if (request === "axios") {
    return {
      get: async () => {
        oauthCalls += 1;
        if (mode === "timeout") {
          const error = new Error("timeout of 15000ms exceeded");
          error.code = "ECONNABORTED";
          throw error;
        }
        if (mode === "invalid") {
          const error = new Error("Unauthorized");
          error.response = { status: 401, data: { errorCode: "invalid_client" } };
          throw error;
        }
        return { status: 200, data: { access_token: "token-test", expires_in: 3600 } };
      },
      post: async () => {
        stkCalls += 1;
        return { status: 200, data: { ResponseCode: "0", MerchantRequestID: "M1", CheckoutRequestID: "C1" } };
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};
process.env.MPESA_ENABLED = "true";
process.env.MPESA_ENVIRONMENT = "production";
process.env.MPESA_CONSUMER_KEY = "key-test";
process.env.MPESA_CONSUMER_SECRET = "secret-test";
process.env.MPESA_PASSKEY = "pass-test";
process.env.MPESA_SHORTCODE = "123456";
process.env.MPESA_TRANSACTION_TYPE = "CustomerPayBillOnline";
process.env.MPESA_ACCOUNT_REFERENCE = "BENMIDAX";
process.env.MPESA_CALLBACK_URL = "https://example.test/api/payments/callback";
const service = require("../services/mpesaService");
(async () => {
  try {
    service.clearAccessToken();
    mode = "success";
    oauthCalls = 0; stkCalls = 0;
    await Promise.all([service.stkPush({ phoneNumber: "0712345678", amount: 10 }), service.stkPush({ phoneNumber: "0712345678", amount: 20 })]);
    assert.strictEqual(oauthCalls, 1, "Concurrent STK requests must share one OAuth request.");
    assert.strictEqual(stkCalls, 2, "Both STK requests must still be sent.");
    service.clearAccessToken();
    mode = "timeout";
    oauthCalls = 0;
    await assert.rejects(() => service.stkPush({ phoneNumber: "0712345678", amount: 10 }), (error) => error.code === "ECONNABORTED");
    assert.strictEqual(service.classifyUpstreamError({ code: "ECONNABORTED" }), "network");
    service.clearAccessToken();
    mode = "invalid";
    oauthCalls = 0;
    await assert.rejects(() => service.stkPush({ phoneNumber: "0712345678", amount: 10 }), (error) => error.response?.status === 401);
    assert.strictEqual(oauthCalls, 1, "Invalid OAuth credentials must not be retried.");
    console.log("MPESA SERVICE UNIT TEST PASSED");
  } finally {
    Module._load = originalLoad;
  }
})().catch((error) => { Module._load = originalLoad; console.error(error); process.exit(1); });
