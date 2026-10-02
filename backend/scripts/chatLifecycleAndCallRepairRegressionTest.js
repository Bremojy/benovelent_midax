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
assert(/onRepairConversation/.test(windowSource) && /(onRepairConversation\(conversation\)|onRepairConversationRef\.current\(conversation\))/.test(windowSource), 'stale chat loads trigger canonical conversation repair');
assert(/clientMessageId: tempId/.test(windowSource) && /X-Idempotency-Key": tempId/.test(windowSource), 'message retry keeps one idempotency identity');
assert(/retry\.clientMessageId \|\| item\._id/.test(windowSource), 'failed-message retry reuses its original idempotency key');
assert(/crypto\.randomUUID\(\)/.test(socket), 'server generates an authoritative call id');
assert(/deletedFor: \{ \$ne: socket\.data\.chatId \}/.test(socket), 'socket call/typing access excludes viewer-deleted conversations');
assert(/ensureRemoteAudioPlayback/.test(overlay) && /Enable call audio/.test(overlay), 'browser autoplay blocking has an explicit call-audio recovery control');
assert(/iceRestart: true/.test(overlay) && /call-mode-offer/.test(overlay), 'ICE failure/disconnect attempts same-call renegotiation with ICE restart');
assert(/SOCKET_STATE_TOPOLOGY=single-instance/.test(read('backend/.env.example')), 'in-memory call state has an explicit non-horizontal topology requirement');
assert(/benevolent-chat-active/.test(center) && /body\.benevolent-chat-active \.smart-assistant/.test(smartAssistant), 'assistant spacing is adjusted on active chat pages');


const globalCenter = read('src/components/GlobalCommunicationCenter.jsx');
const bubble = read('src/components/chat/MessageBubble.jsx');
const footer = read('src/components/Footer.jsx');
assert(/benevolent:active-chat-change/.test(center), 'MessageCenter publishes active-chat identity so the global popup can suppress the open conversation');
assert(/const repairConversation = useCallback/.test(center), 'conversation repair callback is stable');
assert(/\[conversation\?\._id\]/.test(windowSource), 'history loading depends on conversation identity rather than repair callback identity');
assert(/AbortController/.test(windowSource) && /signal:/.test(windowSource), 'history requests support cancellation and stale-response protection');
assert(/mergeMessageLists\(previous/.test(windowSource), 'background history reconciliation merges without blanking visible messages');
assert(/loadingMessages && messages\.length === 0/.test(windowSource), 'loading UI is only full-screen for an empty conversation');
assert(!/MoreVertical/.test(bubble) && !/message-menu-button/.test(bubble), 'visible three-dot message action is removed');
assert(/LONG_PRESS_MS = 600/.test(bubble) && /onContextMenu/.test(bubble) && /ACTION_MENU_EVENT/.test(bubble), 'message actions use long press and context-menu interaction');
assert(/notification-register/.test(globalCenter) && /new-notification/.test(globalCenter) && /incoming-call/.test(globalCenter), 'global communication layer owns authenticated realtime popups and calls');
assert(/conversationId.*encodeURIComponent/.test(globalCenter) && /\?conversationId=/.test(globalCenter), 'global message popup navigation carries the target conversation id');
assert(/https:\/\/wa\.me\/254729353487/.test(footer) && /https:\/\/instagram\.com\/midaxpetroleum/.test(footer), 'footer uses the required official WhatsApp and Instagram URLs');

pass('conversation lifecycle, idempotent retry, and call media recovery regression passed');
