# Benevolent MIDAX Patch Report

## Fixed

1. **Invalid Admin/SuperAdmin chat member numbers**
   - Removed generation of `AD...` / `SA...` identifiers inside `Member.memberNumber`.
   - New portal chat profiles now receive valid `BM###` numbers through the existing member-number sequence allocator.
   - Existing legacy chat profiles with invalid immutable numbers are repaired to a valid `BM###` number before synchronization.

2. **M-PESA STK/OAuth diagnostics**
   - Daraja OAuth failures are explicitly tagged as `paymentStage: "oauth"`.
   - STK request failures are explicitly tagged as `paymentStage: "stk"`.
   - The API no longer mislabels OAuth failures as Safaricom STK rejections.
   - Failed pending transactions are marked `failed` and their failure description is persisted.
   - Frontend payment messages distinguish authentication failures from STK failures.

3. **M-PESA configuration hardening**
   - STK configuration now validates the transaction type against supported Daraja values.
   - Removed the misleading hard-coded manual account-number fallback from the payment config response.

4. **Contribution payment validation**
   - `purpose=contribution` now requires a real contribution record belonging to the authenticated member.
   - Payment cannot exceed the outstanding contribution balance.

5. **M-PESA contract test**
   - Updated stale source-pattern assertions to match the current implementation.
   - Added checks for explicit OAuth/STK error-stage handling.

## Verification

`npm test` PASSED all configured project regression/contract gates.

The dedicated `mpesaStkContractTest.js` also PASSED.

A Vite production build could not be executed because the uploaded source package does not contain installed `node_modules` and dependency installation was not available within the execution window.

No real `.env`, `.env.local`, or `.env.production` files are included in the patched package.
