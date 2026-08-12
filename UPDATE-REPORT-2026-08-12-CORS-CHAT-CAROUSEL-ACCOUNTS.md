# Benevolent Midax — 12 Aug 2026 follow-up audit

## Fixed from the latest production console

### 1. Cross-origin CORS / preflight failures
- Added `Cache-Control` and `Pragma` to the backend CORS allowed headers.
- Reused one CORS configuration for both normal middleware and OPTIONS preflight handling.
- Removed custom `Cache-Control` request headers from the frontend carousel and SuperAdmin Data Integrity requests; the cache-busting `_ts` query parameter remains.
- The production allow-list continues to include `https://benovelent-midax.vercel.app`.

### 2. Admin self-chat problem
- Chat identity now uses the JWT `chatId` consistently.
- Admin accounts are represented in chat by their mirrored Member chat-profile ID, which is the ID type used by the Conversation/Message models.
- Current-user filtering now happens against the real chat identity, preventing an administrator from appearing as their own contact.
- Backend conversation creation still rejects any self-conversation as a second safety layer.
- Added detection and safe cleanup of legacy self-conversations.

### 3. Carousel duplication
- Carousel uploads now calculate a SHA-256 content hash for Cloudinary uploads.
- Re-uploading the same image is rejected as `DUPLICATE_CAROUSEL` instead of creating another slide.
- Data Integrity recognizes duplicate carousel content using the content hash when available and falls back to normalized image/title/description for legacy records.
- Added a dedicated SuperAdmin **Clean carousel duplicates** action so carousel cleanup can be performed without cleaning member/admin records.
- Existing Safe Cleanup still removes duplicate carousel records while preserving finance/support data.

### 4. Member Accounts consistency
- Member Accounts now shows the member's own support cases and requested/approved amounts, including approved funeral/medical/education support values.
- Added an `Approved support` total to the member account summary.
- Corrected monthly contribution statistics to use the current member's own contribution records instead of scheme-wide contribution counts.
- Corrected `Cases helped` to count the current member's approved/completed cases instead of all scheme cases.
- Personal monthly income remains excluded from frontend collection/exposure.

### 5. SuperAdmin Data Integrity
- The existing integrity route remains `/api/superadmin/data-integrity`.
- Added `/api/superadmin/data-integrity/cleanup/carousels` for isolated carousel cleanup.
- Data Integrity now reports self-conversations in addition to duplicate accounts, duplicate conversations, orphaned chat data and duplicate carousel groups.

## Cloudinary
All persistent user uploads continue to use Cloudinary when production Cloudinary variables are present. The carousel hash is computed before Cloudinary upload, while the stored image URL remains the Cloudinary URL.

## Verification performed
- All backend JavaScript files were passed through `node --check` successfully.
- Frontend route references were cross-checked against the registered backend API prefixes.
- No frontend references to the personal `monthlyIncome` field remain.
- The ZIP is intended to be deployed with the backend redeployed on Render and the frontend rebuilt/redeployed on Vercel.
