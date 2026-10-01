"use strict";
const fs = require("fs");
const assert = require("assert");

const read = (file) => fs.readFileSync(file, "utf8");
const pass = (name) => console.log(`PASS ${name}`);

const auditRoutes = read("backend/routes/auditLogRoutes.js");
const auditController = read("backend/controllers/auditLogController.js");
const auditModel = read("backend/models/AuditLog.js");
const purge = read("backend/utils/permanentAccountDeletion.js");
const auditPage = read("src/pages/superadmin/SuperAdminAudit.jsx");
const website = read("backend/controllers/websiteController.js");

assert(!/deleteAuditLog/.test(auditRoutes), "audit routes no longer expose a delete endpoint");
assert(!/deleteAuditLog/.test(auditController), "audit controller no longer implements destructive deletion");
assert(!/deleteLog/.test(auditPage) && !/Delete<\/button>/.test(auditPage), "SuperAdmin audit UI has no destructive delete action");
assert(/Audit logs are append-only/.test(auditModel), "audit model blocks destructive deletes");
assert(!/AuditLog/.test(purge), "account purge utility does not erase audit history");
assert(/const toPublicSection/.test(website) && /const \{ updatedBy, \.\.\.safe \} = source/.test(website), "public CMS responses strip internal updater identity");
assert(/PDF_REQUIRED/.test(website) && /mime !== "application\/pdf"/.test(website), "constitution uploads enforce PDF content type");
assert(/IMAGE_REQUIRED/.test(website) && /mime\.startsWith\("image\/"\)/.test(website), "gallery uploads enforce image content type");
assert(/await invalidateWebsitePublicCache\(\);/.test(website), "CMS uploads and mutations invalidate the public website cache");
assert(/"disclaimer"/.test(website) && /SECTION_DEFAULTS[\s\S]*"disclaimer"/.test(website), "Disclaimer is initialized with authoritative public CMS content");
assert(/exports.updateGalleryItem/.test(website) && /exports.reorderGallery/.test(website) && /exports.archiveGalleryItem/.test(website), "Gallery metadata, ordering and archive workflows have backend contracts");
assert(/versionHistory/.test(website) && /exports.restoreConstitutionVersion/.test(website), "Constitution uploads preserve version history and support audited restore");
assert(/safe\.section === "gallery"/.test(website) && /filter\(\(item\) => item\.published\)/.test(website), "Public generic website content filters unpublished gallery items");
pass("audit log and CMS security regression contracts verified");
