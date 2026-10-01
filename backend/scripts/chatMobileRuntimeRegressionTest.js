'use strict';
const { read, assert, pass } = require('./testUtils');

const chatWindow = read('src/components/chat/ChatWindow.jsx');
const messageCenter = read('src/components/chat/MessageCenterPage.jsx');
const deliveryHelper = read('src/components/chat/messageDelivery.js');
const sidebar = read('src/components/dashboard/DashboardSidebar.jsx');
const sidebarCss = read('src/styles/sidebar.css');
const portalShellCss = read('src/styles/portal-shell-final.css');

const deliveredHandler = chatWindow.indexOf('const handleMessageDelivered = (payload) =>');
const deliveredListener = chatWindow.indexOf('socket.on("message-delivered", handleMessageDelivered)');
assert(deliveredHandler >= 0, 'ChatWindow defines the delivered-message handler before registering the listener');
assert(deliveredHandler < deliveredListener, 'ChatWindow registers message-delivered only after defining the handler');
assert(/applyMessageDelivered\(/.test(chatWindow.slice(deliveredHandler, deliveredListener)), 'delivered acknowledgements flow through the shared delivery-state helper');
assert(/delivered:\s*true/.test(deliveryHelper), 'delivery helper marks acknowledged messages as delivered');
assert(!/\bhandleDelivered\b/.test(messageCenter), 'MessageCenterPage does not contain a free handleDelivered reference that can trigger a runtime ReferenceError');

const mobileBranch = sidebar.slice(sidebar.indexOf('if (mobileBottomNav)'));
const bottomNavStart = mobileBranch.indexOf('<aside className="dashboard-sidebar mobile-bottom-nav"');
const bottomNavClose = mobileBranch.indexOf('</aside>', bottomNavStart);
const morePanelAfterDock = mobileBranch.indexOf('{renderMorePanel()}', bottomNavClose);
assert(bottomNavStart >= 0 && bottomNavClose > bottomNavStart, 'mobile bottom navigation markup is present');
assert(mobileBranch.slice(bottomNavStart, bottomNavClose).includes('setMoreOpen((value) => !value)'), 'More button retains its existing toggle action');
assert(!mobileBranch.slice(bottomNavStart, bottomNavClose).includes('{renderMorePanel()}'), 'More panel is not trapped inside the fixed bottom navigation container');
assert(morePanelAfterDock > bottomNavClose, 'More panel is rendered as a sibling of the fixed bottom navigation');

const primaryRender = sidebar.slice(sidebar.indexOf('const renderMenuLinks'), sidebar.indexOf('const renderMorePanel'));
assert(/if \(!grouped\) return items\.map\(renderLink\);/.test(primaryRender), 'mobile primary links render as individual navigation items instead of one grouped flex column');
assert(/\.dashboard-sidebar\.mobile-bottom-nav \.sidebar-menu\s*\{[\s\S]*display:\s*flex/.test(sidebarCss), 'base mobile dock keeps a horizontal navigation row');
assert(/\.dashboard-content\s*\{[\s\S]*padding-bottom:\s*calc\(var\(--dashboard-bottom-nav-height/.test(portalShellCss), 'portal content reserves space for the mobile dock');
assert(/\.mobile-more-panel\s*\{[\s\S]*position:\s*fixed/.test(sidebarCss), 'More panel is viewport-positioned');
assert(/\.mobile-more-panel\s*\{[\s\S]*z-index:\s*12100/.test(portalShellCss), 'More panel sits above the bottom dock');

pass('chat runtime handler and mobile More navigation regression controls passed');
