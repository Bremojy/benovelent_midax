# Benevolent MIDAX — lastUpdate

## Release
Application/backend version remains **18.2.0**. The deliverable archive is named **lastUpdate.zip** as requested.

## Final upgrade scope

### Phase 1
- Fixed and regression-tested the `MEMBER_STATUS` eligibility reference.
- Expanded Redis cache coverage for public website content, news, carousel, current leadership, assistant context, member dashboards/accounts, notifications, conversations, and finance reads, with targeted invalidation.
- Current leadership combines active Admin and SuperAdmin records and exposes profile/contact/role details through the public leadership endpoint.
- Home renders the dynamic leadership cards and improved quick-link presentation.
- Public assistant is grounded in current website data and configured FAQs; portal assistant respects the authenticated role.
- Assistant UI derives page-specific suggested questions and quick links.

### Phase 2
- Member primary navigation contains only core portal pages; Notifications, Announcements, Benefits and Portal Guide remain secondary dashboard areas.
- Member profile uses canonical `position` mapping and strict profile validation.
- Dependants have add/edit/delete support with cache invalidation.
- Member Accounts now support explicit opening/closing dates, with `Money In` and `Money Out` terminology and server-side date-range filtering.
- Member M-PESA history is timestamped and clickable for a privacy-safe detail view.
- Member support requests enforce two documents from two categories; `Other` requires a label; edit/delete is permitted only while `Under Review`.
- Community support uses Daraja STK Push with callback and STK Query fallback.
- Chat/calls/presence/security contracts remain green, with push/ringtone/native hooks retained.

### Phase 3
- Admin members support site-station filtering.
- Admin finance supports add/edit but no Admin delete; permanent delete and visibility controls are SuperAdmin-only at route and controller layers.
- Admin news supports picture uploads through the multipart public-news flow.
- Existing email/SMS invite/broadcast infrastructure remains wired to Resend/TextBee.

### Phase 4
- SuperAdmin navigation contains full management areas but no Chat page.
- Legacy `/superadmin/messages` safely redirects to the SuperAdmin dashboard.
- SuperAdmin Feedback is present in navigation and management UI.
- Backend-only secrets remain outside frontend source and environment examples.
- Frontend/backend environment examples are synchronized to release 18.2.0.

## Validation completed

- Upgrade contract test: PASS
- Security contract test: PASS
- Source quality test: PASS (281 source files)
- Static integrity test: PASS (161 backend JS files)
- Route contract test: PASS (296 backend route contracts, 153 frontend API calls)
- Portal UI contract test: PASS
- Page parity test: PASS
- Call flow contract test: PASS
- Call/auth regression test: PASS
- Chat contract test: PASS
- Verification flow contract test: PASS
- Member database contract test: PASS
- Portal shell test: PASS
- Regression audit: PASS
- Presence contract test: PASS
- Community M-PESA contract test: PASS
- Production configuration contract test: PASS
- M-PESA callback/query contract test: PASS
- `node --check` across all backend JavaScript files: PASS

## Build limitation
A fresh dependency installation was attempted with `npm ci --ignore-scripts --no-audit --no-fund`, but the environment execution window expired before installation completed. Therefore a fresh Vite production build is **not claimed as executed** in this environment. All available source, route, UI, security, regression, M-PESA, chat, call, and backend-syntax validation completed successfully.

## Production safety
Do not place backend secrets in the frontend `.env`. Rotate any production credentials that were exposed during the development conversation before deployment. The ZIP contains no production `.env` files.
