# Benevolent MIDAX v19 — Production Fixes

## Fixes in this release

1. **SuperAdmin Data Integrity runtime error**
   - Reconciliation data is now normalized to safe arrays on every render.
   - Added a direct live MongoDB member table.
   - The page explicitly distinguishes live scheme members, archived members, and administrator/chat profiles.
   - No bare `liveMembers`, `archivedMembers`, or `portalChatProfiles` references can execute before reconciliation data exists.

2. **Member creation `seq` conflict**
   - Replaced the conflicting MongoDB update `{ $max: { seq: floor }, $inc: { seq: 1 } }`.
   - Member-number allocation now uses one atomic aggregation-pipeline update.
   - Next number is calculated as `max(stored sequence, highest live BM###) + 1`.
   - Client/employee numbers are never required.
   - Generated identifiers remain `BM001`, `BM002`, etc.

3. **Member-create error handling**
   - Duplicate-key failures return a clear 409 response.
   - Sequence allocation failures return a specific `MEMBER_NUMBER_SEQUENCE_ERROR`.
   - No raw MongoDB conflict text is shown to administrators.

4. **Live-data principle**
   - SuperAdmin reconciliation reads MongoDB on demand and disables cache via the existing no-store response headers.
   - Administrative counts are derived from database records rather than hard-coded values.

## Validation

Passed:
- Security contract
- Source quality / Node syntax
- Static integrity
- Frontend/backend route contracts
- Portal UI contract
- Call flow
- Call/auth regression
- Member verification flow
- Member database contract
- Portal shell
- Regression audit
- V12 UI contract
- V13 portal shell

Route validation: 254 backend routes / 123 frontend API calls.

A full Vite production build was not available in this execution environment because the project dependencies (`node_modules`) are not installed. The source/build scripts remain in the project for the deployment environment.
