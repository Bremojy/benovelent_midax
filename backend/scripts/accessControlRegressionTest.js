'use strict';
const { read, assert, pass } = require('./testUtils');

const medicalController = read('backend/controllers/medicalSupportController.js');
const paymentController = read('backend/controllers/paymentController.js');
const medicalRoutes = read('backend/routes/medicalSupportRoutes.js');
const paymentRoutes = read('backend/routes/paymentRoutes.js');
const pollController = read('backend/controllers/pollController.js');
const pollRoutes = read('backend/routes/pollRoutes.js');

const medicalStart = medicalController.indexOf('exports.getApplicationById = async');
const medicalEnd = medicalController.indexOf('// ======================================================\n// CANCEL APPLICATION', medicalStart);
const medicalGet = medicalStart >= 0 && medicalEnd > medicalStart
  ? medicalController.slice(medicalStart, medicalEnd)
  : '';

assert(medicalGet, 'medical single-application handler must be present');
assert(/role === "member"/.test(medicalGet), 'medical single-application handler must distinguish member access');
assert(/_id:\s*req\.params\.id,\s*member:\s*req\.user\._id/.test(medicalGet), 'medical members must be scoped to their own application records');
assert(/\["member",\s*"admin",\s*"superadmin"\]/.test(medicalGet), 'medical handler must reject unsupported authenticated roles');
assert(/router\.get\(\s*"\/:id",\s*verifyToken,\s*medicalController\.getApplicationById\s*\)/.test(medicalRoutes), 'medical single-application route must remain authenticated');

const communityStart = paymentController.indexOf('exports.communityCases = async');
const communityEnd = paymentController.indexOf('exports.myCommunityCases', communityStart);
const communityGet = communityStart >= 0 && communityEnd > communityStart
  ? paymentController.slice(communityStart, communityEnd)
  : '';
assert(communityGet, 'community-assistance listing handler must be present');
assert(/const recipientProjection = isAdminView/.test(communityGet), 'community-assistance recipient fields must vary by viewer role');
assert(/"_id fullName profileImage"/.test(communityGet), 'ordinary members must receive only the safe beneficiary projection');
assert(/phone mpesaNumber/.test(communityGet), 'administrator community view may retain operational beneficiary contact fields');
assert(/router\.get\("\/community-assistance",\s*protect,\s*isMember,\s*controller\.communityCases\)/.test(paymentRoutes), 'member community-assistance listing must remain member-only');


const pollStart = pollController.indexOf('exports.getPollById = async');
const pollEnd = pollController.indexOf('/* =====================================================\n   UPDATE POLL', pollStart);
const pollGet = pollStart >= 0 && pollEnd > pollStart ? pollController.slice(pollStart, pollEnd) : '';
assert(pollGet, 'single-poll handler must be present');
assert(/active:\s*true/.test(pollGet) && /endDate:\s*\{ \$gte: new Date\(\) \}/.test(pollGet), 'members must only resolve currently active polls by ID');
assert(/router\.get\(\"\/:id\",\s*protect,\s*getPoll\)/.test(pollRoutes), 'single-poll route must remain authenticated');

const feedbackRoutes = read('backend/routes/feedbackRoutes.js');
const feedbackController = read('backend/controllers/feedbackController.js');
assert(feedbackRoutes.includes('router.get("/published/:id/download", protect, isAdminOrSuperAdmin, controller.memberDownload);'), 'published feedback full-response downloads are administrator-only at the route layer');
assert(/Only authorised administrators can download full feedback responses/.test(feedbackController), 'published feedback full-response downloads reject non-administrator roles');

console.log("PASS medical ownership, community beneficiary privacy, poll access, and published feedback download access-control regression contracts verified");
