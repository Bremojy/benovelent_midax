const assert = require("assert");
const { getStkCallback, getCheckoutRequestId, toResultCode, classifyResultCode, parseMetadata } = require("../services/mpesaCallback");

const success = { Body: { stkCallback: {
  MerchantRequestID: "M1", CheckoutRequestID: "C1", ResultCode: 0, ResultDesc: "Success",
  CallbackMetadata: { Item: [{ Name: "MpesaReceiptNumber", Value: "ABC123" }, { Name: "Amount", Value: 34 }] }
} } };
const failed = { Body: { stkCallback: { CheckoutRequestID: "C2", ResultCode: 2029, ResultDesc: "Failed due to an unresolved reason type." } } };
const unknown = { Body: { stkCallback: { CheckoutRequestID: "C3", ResultCode: 9999, ResultDesc: "Unknown" } } };
const malformed = { foo: "bar" };

assert.strictEqual(getCheckoutRequestId(getStkCallback(success)), "C1");
assert.strictEqual(toResultCode(getStkCallback(success).ResultCode), 0);
assert.strictEqual(classifyResultCode(getStkCallback(success).ResultCode), "successful");
assert.strictEqual(parseMetadata(getStkCallback(success)).MpesaReceiptNumber, "ABC123");
assert.strictEqual(classifyResultCode(getStkCallback(failed).ResultCode), "failed");
assert.strictEqual(getStkCallback(failed).ResultCode, 2029);
assert.strictEqual(classifyResultCode(getStkCallback(unknown).ResultCode), "failed");
assert.strictEqual(getCheckoutRequestId(getStkCallback({ Body: { stkCallback: {} } })), "");
assert.strictEqual(getStkCallback(malformed), null);
assert.strictEqual(toResultCode("not-a-number"), null);
console.log("MPESA CALLBACK UNIT TEST PASSED");
