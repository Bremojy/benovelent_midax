"use strict";
const { read, assert, pass } = require('./testUtils');

const conversation = read('backend/controllers/conversationController.js');
const messages = read('backend/controllers/messageController.js');
const socket = read('backend/sockets/messageSocket.js');
const center = read('src/components/chat/MessageCenterPage.jsx');
const windowSource = read('src/components/chat/ChatWindow.jsx');
const overlay = read('src/components/chat/CallOverlay.jsx');
const smartAssistant = read('src/styles/smart-assistant.css');

assert(/deletedFor:\s*\{ \$ne: actorId \}/.test(conversation), 'conversation reads exclude the current viewer deleted state');
assert(/active:\s*true/.test(conversation), 'conversation reads exclude inactive threads');
assert(/conversation\.active = true/.test(conversation), 'reopening a direct chat restores active=true');
assert(/participants:\s*\{ \$all: \[canonicalMe, canonicalTarget\] \}/.test(conversation), 'reopening falls back to canonical participant pair for legacy rows');
assert(/getAuthorizedDirectConversation\(req\.params\.id, actorId\)/.test(conversation), 'conversation mutations share one authorization helper');
assert(/deletedFor:\s*\{ \$ne: actorId \}/.test(messages), 'message operations use the viewer-specific active lifecycle');
assert(/getAuthorizedDirectConversation\(conversationId, actorId\)/.test(messages), 'message search uses the same authorization helper');
assert(/onRepairConversation/.test(windowSource) && /onRepairConversation\(conversation\)/.test(windowSource), 'stale chat loads trigger canonical conversation repair');
assert(/clientMessageId: tempId/.test(windowSource) && /X-Idempotency-Key": tempId/.test(windowSource), 'message retry keeps one idempotency identity');
assert(/retry\.clientMessageId \|\| item\._id/.test(windowSource), 'failed-message retry reuses its original idempotency key');
assert(/crypto\.randomUUID\(\)/.test(socket), 'server generates an authoritative call id');
assert(/deletedFor: \{ \$ne: socket\.data\.chatId \}/.test(socket), 'socket call/typing access excludes viewer-deleted conversations');
assert(/ensureRemoteAudioPlayback/.test(overlay) && /Enable call audio/.test(overlay), 'browser autoplay blocking has an explicit call-audio recovery control');
assert(/iceRestart: true/.test(overlay) && /call-mode-offer/.test(overlay), 'ICE failure/disconnect attempts same-call renegotiation with ICE restart');
assert(/SOCKET_STATE_TOPOLOGY=single-instance/.test(read('backend/.env.example')), 'in-memory call state has an explicit non-horizontal topology requirement');
assert(/benevolent-chat-active/.test(center) && /body\.benevolent-chat-active \.smart-assistant/.test(smartAssistant), 'assistant spacing is adjusted on active chat pages');

pass('conversation lifecycle, idempotent retry, and call media recovery regression passed');
