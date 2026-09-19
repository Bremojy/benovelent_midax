'use strict';
const { ROOT, read, walk, assert, pass } = require('./testUtils');
const files = [...walk(`${ROOT}/src`, ['.js','.jsx']), ...walk(`${ROOT}/backend`, ['.js']).filter((file) => !file.includes(`${ROOT}/backend/scripts/`)), ...walk(`${ROOT}/public`, ['.js'])];
const stale = [];
for (const file of files) {
  const text = read(file.replace(`${ROOT}/`, ''));
  const staleRoute = '/superadmin' + '/messages';
  const staleComponent = 'SuperAdmin' + 'Messages';
  if (text.includes(staleRoute) || text.includes(staleComponent)) stale.push(file.replace(`${ROOT}/`, ''));
}
assert(stale.length === 0, `stale SuperAdmin chat references remain: ${stale.join(', ')}`);
const chatProfile = read('backend/utils/chatProfile.js');
const roleMiddleware = read('backend/middleware/roleMiddleware.js');
assert(/CHAT_ROLES\s*=\s*new Set\(\[['"]member['"],\s*['"]admin['"]\]\)/.test(chatProfile), 'chat roles must be limited to member/admin');
assert(/isChatUser\s*=\s*authorize\("member",\s*"admin"\)/.test(roleMiddleware), 'route-level chat authorization must exclude SuperAdmin');
pass('SuperAdmin chat/call UI references and chat-role exposure are removed');
