# Benevolent MIDAX v17 — Production Fixes

## Member verification / membership numbers
- Member numbers are now generated server-side in the permanent format `BM001`, `BM002`, `BM003`, etc.
- The member creation endpoint no longer trusts a client-supplied employee number or numeric member number.
- Legacy member records containing values such as `101` are automatically assigned the next valid Benevolent MIDAX number when an Admin/SuperAdmin verifies the member.
- Existing valid `BM...` numbers remain immutable.
- Added an atomic `Sequence` collection for collision-resistant member-number allocation.

## Logout / account switching
- Added an explicit browser logout marker so the AuthContext cannot immediately restore an HttpOnly cookie after a failed/interrupted logout request.
- Login clears the explicit-logout marker and establishes the new session normally.
- Inactivity logout now uses the same explicit logout protection.
- Clearing a session also clears the local active-account marker.
- Server-side session-version invalidation remains enabled.

## Chat / notifications
- Direct messages continue to create persistent in-app notifications.
- Added web-push delivery for direct-message notifications without delaying the HTTP message response.
- Open conversations automatically acknowledge newly received messages as read.
- Read acknowledgements are sent through both the authenticated API and Socket.IO.
- Conversation unread counts are updated in the same conversation database write as the latest-message metadata, reducing race conditions and duplicate saves.
- Existing realtime typing, presence, call, missed-call, audio/video and call-summary paths remain intact.

## Admin member UI
- New members no longer need to type a membership number.
- The admin create-member form clearly states that the Benevolent MIDAX Number is generated automatically.
- Existing member numbers remain read-only during edits.
- Credential/result UI displays the server-generated member number.

## Production verification
The following tests were run after the changes and all passed:
- SECURITY CONTRACT TEST
- SOURCE QUALITY TEST
- V1 STATIC INTEGRITY TEST
- ROUTE CONTRACT TEST — 253 backend routes / 122 frontend API calls
- PORTAL UI CONTRACT TEST
- CALL FLOW CONTRACT TEST
- CALL/AUTH REGRESSION TEST
- VERIFICATION FLOW CONTRACT TEST
- PORTAL SHELL TEST
- REGRESSION AUDIT
- V12 UI CONTRACT TEST
- V13 PORTAL SHELL TEST
- Node syntax checks for every newly/modified backend JavaScript file.

## Deployment note
This ZIP contains the corrected source code. The live Vercel deployment will not change until this ZIP is committed/pushed and the Vercel/Render deployments are rebuilt with the current production environment variables.
