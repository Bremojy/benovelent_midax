'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function walk(dir, extensions = null) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, extensions));
    else if (!extensions || extensions.includes(path.extname(entry.name))) out.push(full);
  }
  return out;
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function pass(message) { console.log(`PASS ${message}`); }
module.exports = { ROOT, read, exists, walk, assert, pass };
