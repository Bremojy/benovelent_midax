const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const controller = fs.readFileSync(path.join(root, 'backend/controllers/dataIntegrityController.js'), 'utf8');
const memberNumber = fs.readFileSync(path.join(root, 'backend/utils/memberNumber.js'), 'utf8');
const admin = fs.readFileSync(path.join(root, 'backend/controllers/adminController.js'), 'utf8');

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

expect(controller.includes('const liveMembers = live;'), 'Reconciliation must define liveMembers before returning it.');
expect(controller.includes('const archivedMembers = archived;'), 'Reconciliation must define archivedMembers before returning it.');
expect(controller.includes('const portalChatProfiles = all.filter('), 'Reconciliation must define portalChatProfiles before returning it.');
expect(controller.includes('liveMembers: liveMembers.length'), 'Reconciliation summary must use the normalized liveMembers array.');
expect(admin.includes('const cleanMemberNumber = await generateMemberNumber();'), 'Create member must generate a Benevolent MIDAX number.');
expect(admin.indexOf('const cleanMemberNumber = await generateMemberNumber();') > admin.indexOf('if (\n      !cleanFullName'), 'Member-number allocation should occur after required-field validation.');
expect(memberNumber.includes('findOneAndUpdate') && memberNumber.includes('$add'), 'Sequence allocator must use an atomic pipeline increment.');
expect(!memberNumber.includes('$max: { seq: floor }, $inc: { seq: 1 }'), 'Sequence allocator must not combine conflicting $max/$inc updates.');
console.log('LIVE RECONCILIATION REGRESSION TEST PASSED');
