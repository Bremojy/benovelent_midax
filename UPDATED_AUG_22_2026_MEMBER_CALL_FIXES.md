# Benevolent MIDAX — Member & Calling Fixes (2026-08-22)

## Fixed
- Member-number allocation no longer fails with:
  `Cannot pass an array to query updates unless the updatePipeline option is set.`
  `backend/utils/memberNumber.js` now explicitly uses `updatePipeline: true` for the aggregation pipeline update.
- Call-mode switching now relays the normalized audio/video mode through Socket.IO for both offer and answer.
- Browser call-mode negotiation now clears pending negotiation state only after the answer is applied and keeps local media state synchronized.
- Service-worker cache version bumped so deployed phones can receive the corrected call assets instead of stale cached code.

## Verification completed
- `backend/scripts/memberDatabaseContractTest.js` — PASSED
- `backend/scripts/callFlowContractTest.js` — PASSED
- `backend/scripts/callAuthRegressionTest.js` — PASSED
- `backend/scripts/staticIntegrityTest.js` — PASSED
- Backend JavaScript files were syntax-checked by the static integrity test.

## Validation limitation
A full Vite production build could not be run in this sandbox because package installation timed out, and the sandbox could not resolve the Render hostname for a live authenticated API test. The public Vercel page itself was reachable.
