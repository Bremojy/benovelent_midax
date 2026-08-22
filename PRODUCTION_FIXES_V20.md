# Benevolent MIDAX v20 – Render reconciliation crash fix

## Confirmed production error
Render logs showed:

`ReferenceError: liveMembers is not defined`

at `backend/controllers/dataIntegrityController.js` inside `getMemberReconciliation`.

## Fix
The controller now explicitly defines:

- `liveMembers = live`
- `archivedMembers = archived`
- `portalChatProfiles = ...`

before constructing the JSON response. The summary counts use those same normalized arrays.

The SuperAdmin Data Integrity UI already guards these arrays with safe defaults, so the page no longer dereferences an undeclared value.

## Member creation fix
Member-number allocation now occurs **after** required field validation. Invalid create requests therefore do not consume a sequence number.

The allocator continues to use an atomic MongoDB aggregation-pipeline update and does not combine `$max` and `$inc` against `seq`.

Generated IDs remain `BM001`, `BM002`, `BM003`, etc.

## Validation
Passed:

- Security contract
- Source quality
- Static integrity
- Route contract (254 backend routes / 123 frontend API calls)
- Portal UI contract
- Call flow
- Call/auth regression
- Verification flow
- Member database contract
- Portal shell
- Regression audit
- Live reconciliation regression

The frontend Vite production build could not be executed in this environment because `node_modules/vite` is not present and `npm ci` exceeded the available execution window. The source/test suite itself is clean.
