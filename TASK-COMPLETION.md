# Benevolent Midax — Task-by-task completion record

Basis used:
- WEBSITE UPDATES AND CORRECTION.pdf
- BENEVOLENT SCHEME CONSTITUTION Nov - 2025.pdf
- Original Benevolent Midax ZIP

## Task 1 — Public website

### 1.1 Footer — COMPLETED IN CODE
- Removed public disclaimer link/content from the public footer.
- Added privacy policy and terms links with Benevolent/constitution context.
- Added privacy/cookie acceptance banner.
- Added Instagram link to `bremojy`.
- Removed member portal from the footer.
- Kept Portal in the navbar as requested.

### 1.2 Home — COMPLETED IN CODE
- Reworked carousel presentation to show the whole image instead of aggressive cropping.
- Removed AI-generated wording found in the public pages.
- Added the constitution-based slogan: “Better life is better when you stand together.”
- Added constitution introduction and source-based funeral/medical facts.
- Added disappearing quick links for Leaders and Gallery.
- Added leaders preview and member portal benefits.

### 1.3 Navbar — COMPLETED IN CODE
- Modern shell-style Benevolent Midax mark.
- Home, About, Services, News, Contact and Portal navigation.
- Responsive mobile menu.

### 1.4 About — COMPLETED IN CODE
- Added Midax/Benevolent context and the history supplied in the website brief.
- May 2023 / Ksh 300 and January 2025 / Ksh 500 history added.
- Trust card changed to “Every member has right to speak”.
- Privacy and Support cards now link to their respective pages.
- Added local background video.

### 1.5 Services — COMPLETED IN CODE
- Services and constitution information are combined on the Services page while preserving the Constitution route.
- Added View our Constitution button.
- Added Funeral and Medical support information from the supplied constitution.
- Education Support is clearly marked Coming Soon, with benefits described without inventing constitutional amounts.

### 1.6 Contact — PARTIALLY COMPLETED
- Replaced the static background with a local video background.
- The video is small/local and the page is responsive.
- The supplied environment did not provide a downloadable Pexels video file, and direct Pexels CDN downloading was not available from the editing environment. An existing local video is therefore used instead of claiming a Pexels download that was not actually performed.

### 1.7 Public responsiveness/API — COMPLETED IN CODE; RUNTIME VERIFICATION PENDING
- Public routes and API mounts were reviewed and corrected, including `/api/website/settings`, constitution and carousel routes.
- Responsive layouts were retained/updated.
- Full browser/device testing could not be completed because the supplied Vite/Rolldown native binding is unavailable in this execution environment.

## Task 2 — Member portal

### 2.1 Change password — COMPLETED IN CODE
- Member, Admin and SuperAdmin password-change flows are wired to role-specific backend endpoints.
- SuperAdmin now has a dedicated password route so the settings page does not hide the feature.
- Topbar provides direct Change password & settings access.

### 2.2 Sidebar — COMPLETED IN CODE
- Sidebar starts closed and opens with the top toggle.
- Member order is Dashboard, Profile, Dependents, Accounts, Support, Claim, Chat, Polls, Settings.
- Finance/Contributions public label changed to Accounts with legacy route redirects preserved.
- SuperAdmin has no Messages/Chat menu item.

### 2.3 Member dashboard — COMPLETED IN CODE
- Live profile completion and missing-field display.
- Quick links to portal sections.
- Portal guide page added.
- Live constitution snapshot includes members, leaders, active, suspended, approved claims and account book balance.

### 2.4 Profile — COMPLETED IN CODE
- Completion is calculated from the requested profile fields.
- Profile photo, employee number, phone, National ID, gender, marital status, DOB, physical address, site station and next-of-kin fields implemented.
- Required station dropdown values implemented, including None of above and custom station.
- Data is saved to backend and editable.
- Admin/SuperAdmin can view/edit the fields.
- Completion success video added using an existing small local video.

### 2.5 Dependants — COMPLETED IN CODE
- Add, view, edit and remove dependants.
- Typed/date inputs and schema validation aligned.
- Admin/SuperAdmin can view dependants from the member record.

### 2.6 Accounts — COMPLETED IN CODE
- Member Accounts page uses a ledger-style layout.
- Monthly total contributions for the constitution are calculated for the selected year.
- Number of contributing members per month is calculated using unique member IDs.
- Cases helped and pending claims shown.
- Print/Download uses the browser print-to-PDF workflow.
- Admin Accounts remains connected to Finance/Contributions backend records.

### 2.7 Support — COMPLETED IN CODE
- Medical, Funeral, Education and None of above support choices.
- Custom support type and description for None of above.
- Dependant selection remains connected to the existing support flows.
- Amount/document inputs are validated.
- Support documents are stored through the local document storage adapter.
- A generic SupportRequest model/route was added for None of above requests.

### 2.8 Claim tracking — COMPLETED IN CODE; RUNTIME VERIFICATION PENDING
- Member Claims consumes backend case status.
- Timeline/status information is displayed where available.
- Admin document-open action records the administrator who opened a claim document.
- Approved amount and rejection reason are surfaced.

### 2.9 Chat/Polls — COMPLETED IN CODE; RUNTIME VERIFICATION PENDING
- Member/leader selector added at the top of chat.
- Attachments and voice-note recording added.
- Image/video/audio/document message types supported.
- WebRTC audio/video call signaling was added using Socket.IO and browser media permissions.
- Poll result printing is available to members for closed polls as well as admins.

## Task 3 — Admin/Leader/SuperAdmin

### 3.1 Admin dashboard — COMPLETED IN CODE
- Live profile completion counts.
- Incomplete member list with missing profile fields.
- Member/leader/activity/accounting snapshot.

### 3.2 Members — COMPLETED IN CODE
- Active/inactive/suspended records remain connected to backend.
- Admins can add/edit/suspend/activate.
- Only SuperAdmin can delete or reset a member password.
- Reset returns a temporary credential and sets mustChangePassword so the temporary password can be used for login.
- Member profile fields are editable by authorised administrators.

### 3.3 Accounts/Claims — COMPLETED IN CODE
- Admin/SuperAdmin Accounts remains connected to Finance and Contributions.
- Ledger can be printed/downloaded through browser print.
- Claims page can open uploaded documents.
- Opening a document records the administrator access event.

### 3.4 Support/Chat/Audit/Uploads — COMPLETED IN CODE; DEPLOYMENT STORAGE STEP REQUIRED
- Admin Support broadcasts remain connected to notifications.
- SuperAdmin message center was removed completely.
- Chat is limited to member/admin roles in the public portal routing.
- Audit records retain timestamps.
- Carousel and document upload paths were moved to the central upload configuration.
- Production upload paths use `/var/data/uploads` and `/var/data/documents`.

IMPORTANT: Render's filesystem is ephemeral by default. To make the upload persistence requirement truly survive Render restarts/deploys, a Render persistent disk must be attached at `/var/data` (or the environment variables must point to an equivalent persistent mount). The project includes `DEPLOYMENT-UPLOADS.md` with the exact settings. Without that Render infrastructure step, no code-only solution can make Render's ephemeral filesystem persistent.

## Verification limitation

Backend JavaScript syntax was checked across the backend and passed.

A full Vite production build was attempted. It could not run because the supplied ZIP's Vite/Rolldown native Linux binding is missing, and the package registry available to this execution environment returned a 404 while trying to reinstall dependencies. This is an environment/dependency installation limitation, not a claim that the project build is clean.
