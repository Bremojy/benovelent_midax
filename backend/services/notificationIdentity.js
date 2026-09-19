'use strict';

const crypto = require('crypto');

function buildNotificationEventId(doc = {}, now = Date.now()) {
  if (doc?.eventId) return String(doc.eventId);
  const stable = [
    doc?.recipient,
    doc?.recipientModel || 'Member',
    doc?.type || 'system',
    doc?.referenceModel || '',
    doc?.referenceId || '',
    doc?.title || '',
    doc?.message || '',
  ].map((value) => String(value || '').trim()).join('|');
  if (!stable) return '';
  const timeBucket = doc?.referenceId ? 'stable' : String(Math.floor(now / 10000));
  return `evt_${crypto.createHash('sha256').update(`${stable}|${timeBucket}`).digest('hex')}`;
}

module.exports = { buildNotificationEventId };
