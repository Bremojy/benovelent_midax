"use strict";
const { read, assert, pass } = require("./testUtils");

const icons = read("src/config/iconography.js");
const navbar = read("src/components/Navbar.jsx");
const menu = read("src/config/dashboardMenu.js");
const sections = read("src/config/portalSections.js");
const statusBadge = read("src/components/common/StatusBadge.jsx");
const statusStyles = read("src/styles/iconography.css");
const memberClaims = read("src/pages/member/Claims.jsx");
const adminClaims = read("src/pages/admin/AdminClaims.jsx");
const support = read("src/pages/admin/AdminSupport.jsx");
const mpesa = read("src/components/accounts/MpesaTransactionViewer.jsx");
const manager = read("src/pages/superadmin/SuperAdminWebsiteManager.jsx");
const main = read("src/main.jsx");

assert(/publicNavigationItems\s*=\s*\[/.test(icons) && /label: "Home"/.test(icons) && /label: "About"/.test(icons) && /label: "Services"/.test(icons) && /label: "News"/.test(icons) && /label: "Contact"/.test(icons), "Public navigation has one shared icon mapping for the core site sections");
assert(/publicNavigationItems\.map/.test(navbar) && /aria-label="Primary navigation"/.test(navbar), "Public navbar renders the shared icon mapping with accessible navigation labeling");
assert(/import\s*\{[^}]*\bPhone\b[^}]*\}\s*from\s*['\"]lucide-react['\"]/.test(navbar) && /<Phone\b/.test(navbar), "Public navbar imports every directly rendered contact icon used in JSX");
assert(/title: "Help & Guide", icon: HelpCircle/.test(menu) && /title: "Website Manager", icon: Globe2/.test(menu), "Portal navigation uses semantically appropriate Help and Website Manager icons");
assert(/Branding & Appearance/.test(sections) && /Palette/.test(sections) && /Home \/ Carousel/.test(sections) && /Images/.test(sections), "Portal section shortcuts use specific appearance and carousel iconography");
assert(/getStatusVariant/.test(statusBadge) && /statusIconography/.test(statusBadge) && /aria-hidden="true"/.test(statusBadge), "Shared status badge displays a semantic icon without duplicating its visible text to screen readers");
for (const variant of ["success", "pending", "danger", "warning", "info", "neutral"]) assert(statusStyles.includes(`bene-status--${variant}`), `Shared status styles define the ${variant} state`);
assert(/StatusBadge/.test(memberClaims) && /StatusBadge/.test(adminClaims) && /StatusBadge/.test(support) && /StatusBadge/.test(mpesa), "Member/admin claim, support, and cross-portal M-PESA states share icon-backed status badges");
assert(/Brand & Appearance/.test(manager) && /Contact & Social/.test(manager) && /History/.test(manager) && /PUBLISH CENTRE/.test(manager), "Website Manager exposes semantic icons for appearance, contact, audit history, and publishing");
assert(/styles\/iconography\.css/.test(main), "Shared iconography styles are loaded application-wide");
pass("BENEvolent MIDAX iconography regression passed");
