'use strict';
const { buildNotificationEventId } = require('../services/notificationIdentity');
const { assert, pass } = require('./testUtils');

const base = { recipient: 'member-1', recipientModel: 'Member', type: 'support', referenceId: 'request-123', referenceModel: 'SupportRequest', title: 'Support request updated', message: 'Approved' };
const a = buildNotificationEventId(base, 1);
const b = buildNotificationEventId(base, 987654321);
assert(a === b, 'reference-backed notifications must have stable event IDs');
assert(a.startsWith('evt_'), 'event IDs must have a stable namespace');
const noReferenceA = buildNotificationEventId({ ...base, referenceId: '' }, 20000);
const noReferenceB = buildNotificationEventId({ ...base, referenceId: '' }, 29999);
assert(noReferenceA === noReferenceB, 'notifications in the same time bucket should deduplicate');
const later = buildNotificationEventId({ ...base, referenceId: '' }, 30000);
assert(later !== noReferenceA, 'unreferenced notifications can represent a distinct later event');
pass('notification event identity/dedupe rules verified');
