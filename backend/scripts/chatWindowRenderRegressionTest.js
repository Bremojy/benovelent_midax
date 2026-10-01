'use strict';
const vm = require('node:vm');
const { read, assert, pass } = require('./testUtils');

const source = read('src/components/chat/ChatWindow.jsx');
const componentStart = source.indexOf('function ChatWindow(');
const helpersStart = source.indexOf('\nfunction normalizeMessage', componentStart);
assert(componentStart >= 0 && helpersStart > componentStart, 'ChatWindow function is present');

let componentSource = source.slice(componentStart, helpersStart);
// The smoke test intentionally replaces JSX return paths with plain objects/null so
// the component function can be executed without a DOM. The hooks still initialize
// in the same order, which catches render-time TDZ/use-before-declaration failures.
componentSource = componentSource.replace(`  if (!conversation) {
    return <div className="chat-window-empty">Select a conversation to begin chatting.</div>;
  }`, `  if (!conversation) {
    return null;
  }`);
const returnStart = componentSource.indexOf('\n  return (');
const returnEnd = componentSource.lastIndexOf('\n  );\n}');
assert(returnStart >= 0 && returnEnd > returnStart, 'ChatWindow main render return is located');
componentSource = componentSource.slice(0, returnStart) + '\n  return { currentId, partner, ownIds, muted, pinned, archived };\n}\n';

let helpers = source.slice(helpersStart, source.indexOf('\nexport default ChatWindow'));
helpers = helpers.replace(/\bexport default ChatWindow;\s*$/, '');

const code = `
${helpers}
${componentSource}
this.__ChatWindow = ChatWindow;
`;

const stateValues = [];
const context = {
  __ChatWindow: null,
  useState(initial) { const index = stateValues.length; stateValues.push(initial); return [initial, () => {}]; },
  useEffect() {},
  useMemo(factory) { return factory(); },
  useRef(initial = null) { return { current: initial }; },
  isChatSoundEnabled: true,
  setChatSoundEnabled() {},
  unlockChatSound() {},
  applyMessageDelivered(messages) { return messages; },
  API: { get() { throw new Error('API should not be called during render'); }, put() { throw new Error('API should not be called during render'); } },
  toast: { error() {} },
  ChatHeader: function ChatHeader() {},
  MessageBubble: function MessageBubble() {},
  MessageInput: function MessageInput() {},
  TypingIndicator: function TypingIndicator() {},
  BellOff: function BellOff() {}, BellRing: function BellRing() {}, Pin: function Pin() {}, Trash2: function Trash2() {},
  X: function X() {}, Volume2: function Volume2() {}, VolumeX: function VolumeX() {}, Search: function Search() {},
  Archive: function Archive() {}, ArchiveRestore: function ArchiveRestore() {},
};
vm.runInNewContext(code, context, { filename: 'ChatWindow.render.smoke.js' });

const renderResult = context.__ChatWindow({
  currentUser: { chatId: 'member-brian-id', _id: 'portal-brian-id' },
  conversation: {
    _id: 'conversation-1',
    participants: [
      { _id: 'member-brian-id', fullName: 'Brian' },
      { _id: 'member-princess-id', fullName: 'Princess' },
    ],
  },
  socket: null,
  availableConversations: [],
});

assert(renderResult.currentId === 'member-brian-id', 'ChatWindow render resolves canonical current chat identity before state initializers');
assert(renderResult.partner?._id === 'member-princess-id', 'ChatWindow render resolves the other canonical participant');
assert(renderResult.ownIds.has('member-brian-id'), 'ChatWindow render includes the canonical current chat ID in ownIds');

pass('ChatWindow actual component-render smoke regression passed');
