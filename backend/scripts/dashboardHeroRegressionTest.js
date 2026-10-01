"use strict";
const { read, assert, pass } = require('./testUtils');

const hero = read('src/components/dashboard/AnimatedWelcomeDashboardHero.jsx');
const heroCss = read('src/components/dashboard/AnimatedWelcomeDashboardHero.css');
const member = read('src/pages/member/MemberDashboard.jsx');
const admin = read('src/pages/admin/AdminDashboard.jsx');
const superadmin = read('src/pages/superadmin/SuperAdminDashboard.jsx');

assert(/Welcome back, \{firstName\}/.test(hero), 'shared hero renders the authenticated first name');
assert(/Your Benevolent MIDAX member space is ready for you\./.test(hero), 'member hero uses the requested member subtitle');
assert(/Here’s your Benevolent MIDAX operations overview\./.test(hero), 'admin hero uses the requested admin subtitle');
assert(/Your Benevolent MIDAX management center is ready\./.test(hero), 'SuperAdmin hero uses the requested SuperAdmin subtitle');
assert(/role === "member"|normalizedRole === "member"/.test(hero), 'hero provides a member role variant');
assert(/animated-dashboard-hero--admin/.test(heroCss) && /animated-dashboard-hero--superadmin/.test(heroCss), 'hero CSS provides role variants');
assert(/prefers-reduced-motion:reduce/.test(heroCss), 'hero respects reduced-motion preferences');
assert(/AnimatedWelcomeDashboardHero/.test(member) && /displayName=\{member\.fullName\}/.test(member), 'member dashboard uses the shared hero with live member identity');
assert(/AnimatedWelcomeDashboardHero/.test(admin) && /useAuth\(\)/.test(admin) && /displayName=\{user\?\.fullName/.test(admin), 'admin dashboard uses the shared hero with authenticated identity');
assert(/AnimatedWelcomeDashboardHero/.test(superadmin) && /useAuth\(\)/.test(superadmin) && /displayName=\{user\?\.fullName/.test(superadmin), 'SuperAdmin dashboard uses the shared hero with authenticated identity');
assert(!/Welcome back, Brian|Welcome back, Princess/.test(`${member}\n${admin}\n${superadmin}`), 'dashboard greetings contain no hardcoded personal names');

pass('Dashboard hero regression contract passed');
