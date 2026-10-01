"use strict";
const { read, assert, pass } = require('./testUtils');

const controller = read('backend/controllers/memberController.js');
const model = read('backend/models/Member.js');
const diagnostic = read('backend/scripts/nationalIdIntegrityDiagnostic.js');
const memberRoutes = read('backend/routes/memberRoutes.js');

assert(/const normalizeNationalId = \(value\) => String\(value \?\? ""\)\.trim\(\);/.test(controller), 'national ID normalization is centralized before uniqueness checks');
assert(/_id:\s*\{\s*\$ne:\s*member\.\_id\s*\}/.test(controller), 'national ID duplicate lookup excludes the member being updated');
assert(/code:\s*"DUPLICATE_NATIONAL_ID"/.test(controller), 'duplicate national ID returns a stable application error code');
assert(/duplicateNationalIdResponse = \(res\) => res\.status\(409\)/.test(controller), 'duplicate national ID maps to HTTP 409 Conflict');
assert(/This national ID is already registered to another member\./.test(controller), 'duplicate national ID message is safe and does not identify another member');
assert(/error\?\.code === 11000[\s\S]*duplicateNationalIdResponse\(res\)/.test(controller), 'MongoDB duplicate-key errors are caught and translated safely');
assert(!controller.includes('611497883'), 'production controller does not hardcode the reported national ID');
assert(/read-only production diagnostic/i.test(diagnostic) && !/deleteMany|dropIndex|deleteOne|updateMany|bulkWrite/.test(diagnostic), 'national ID integrity diagnostic is read-only and non-destructive');
assert(/nationalIdIndexes/.test(diagnostic) && /duplicateNationalIdGroupCount/.test(diagnostic), 'national ID diagnostic reports duplicate groups and live index configuration');
assert(/nationalId:\s*\{[\s\S]*unique:\s*true,[\s\S]*sparse:\s*true/.test(model), 'MongoDB uniqueness remains enabled with a sparse national ID index');
assert(/router\.get\("\/profile",\s*protect,\s*isMember,\s*getProfile\)/.test(memberRoutes), 'member profile GET is explicitly restricted to the member role');
assert(/router\.put\([\s\S]*"\/profile"[\s\S]*protect,[\s\S]*isMember,[\s\S]*updateProfile/.test(memberRoutes), 'member profile PUT is explicitly restricted to the member role');

pass('National-ID repair regression contract passed');
