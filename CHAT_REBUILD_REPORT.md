# BENEvolent MIDAX Messaging Center Rebuild Report

Date: 2026-10-01

## Primary defect fixed

The reported Vercel build error in `src/pages/member/Support.jsx` was a real JSX syntax defect: the ternary expression used for the optional/required document panel was closed with `)` but was missing the JSX expression terminator `}` immediately before `Requested Amount (KES)`.

The source now closes that expression correctly with `)}`.

A regression assertion was added to `backend/scripts/chatOneToOneRegressionTest.js` to prevent this exact malformed fragment from returning.

## Chat work completed

The existing shared Member/Admin `MessageCenterPage` architecture was retained and hardened rather than duplicating the chat implementation.

Implemented/refined:

- Member/Admin shared messaging center.
- Member/Admin-only chat roles; SuperAdmin excluded at route and chat-identity layers.
- Self-recipient filtering and backend self-chat rejection.
- Direct 1-to-1 conversation enforcement in the normal chat center.
- Viewer-specific archive, pin, mute and delete-for-me state.
- Re-opening a hidden direct conversation restores only the current viewer's deleted/archived state.
- Conversation archive/restore API and UI.
- Message search API and UI scoped to the authorized conversation.
- Message forward API and UI between existing authorized conversations.
- Reply context wiring in the composer.
- Own-message edit UI with server ownership/type validation.
- Delete-for-me and delete-for-everyone actions with server authorization.
- Reaction add/remove support.
- Failed optimistic messages retain retry state instead of silently disappearing.
- Explicit delivered-message socket acknowledgement plus read/seen state.
- Date separators in the message stream.
- Existing Socket.IO/WebRTC authentication and authorization paths preserved.
- Existing PWA pending-call recovery path preserved.
- No SuperAdmin chat center or normal SuperAdmin chat recipient.

## Exact files changed

1. `package.json`
2. `CHAT_REBUILD_REPORT.md`
3. `backend/scripts/chatOneToOneRegressionTest.js`
4. `backend/controllers/messageController.js`
5. `backend/controllers/conversationController.js`
6. `backend/routes/conversationRoutes.js`
7. `backend/routes/messageRoutes.js`
8. `backend/models/Message.js`
9. `backend/sockets/messageSocket.js`
10. `src/components/chat/MessageInput.jsx`
11. `src/components/chat/MessageBubble.jsx`
12. `src/components/chat/MessageBubble.css`
13. `src/components/chat/ChatWindow.jsx`
14. `src/components/chat/ChatWindow.css`
15. `src/components/chat/ChatSidebar.jsx`
16. `src/components/chat/MessageCenterPage.jsx`
17. `src/pages/member/Support.jsx`

## Tests executed

### PASS

- `npm test`
- Backend JavaScript syntax regression suite: 183 files.
- Frontend relative-import contract suite: 136 source files.
- API route contract suite: 302 frontend API calls.
- Chat notification reliability regression.
- New 1-to-1 messaging A-AE source-control regression.
- Presence regression.
- SuperAdmin chat regression.
- Production contract regression suite.
- Workflow integrity regression suite.
- Audit/CMS security regression suite.
- Public CMS wiring regression suite.
- Other existing finance, notification, M-PESA, access-control and integrity suites included by `npm test`.

### BLOCKED

- `npm run build`: blocked because the repository dependencies were not available after `npm ci` could not complete in this environment. The direct build failure was `Cannot find module .../node_modules/vite/bin/vite.js`.
- `npm run lint`: blocked because the `oxlint` executable was not installed for the same dependency-availability reason.
- `npm run vercel-build`: blocked at the same Vite dependency step before `verify-vercel-assets.mjs` could execute.

`npm ci --offline --include=dev --no-audit --no-fund` also confirmed the local npm cache was incomplete (`xmlhttprequest-ssl` was not cached).

No build, lint, Vercel deployment, live browser test, or physical-device call test is represented here as passing.

## Migration notes

No MongoDB collection was dropped or reset. No destructive migration was added. The new message fields `forwarded` and `forwardedFrom` are optional schema fields and are backward-compatible with existing Message documents.

## Security / secret handling

No production credentials, JWT secrets, Cloudinary secrets, M-PESA credentials, SMTP passwords, VAPID private keys, TURN credentials, cookies, or tokens were added to source. Only the existing environment templates are retained.

## Browser/device verification limitation

Live browser/PWA/WebRTC verification was not executed in this container. The source preserves the repository's authenticated Socket.IO/WebRTC/PWA architecture and the regression suite verifies the relevant server-side contracts, but browser media permissions, push delivery, TURN connectivity, and mobile keyboard/safe-area behavior still require a real deployment/browser/device verification run.
