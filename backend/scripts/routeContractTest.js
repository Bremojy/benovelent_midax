'use strict';
const fs = require('fs');
const path = require('path');
const { ROOT, walk, read, assert, pass } = require('./testUtils');

function normalizePath(value) {
  let s = String(value || '').trim();
  s = s.replace(/\$\{[^}]+\}/g, '__PARAM__');
  s = s.replace(/\/+/g, '/').replace(/\?.*$/, '');
  if (!s.startsWith('/')) s = '/' + s;
  if (s.length > 1) s = s.replace(/\/$/, '');
  s = s.split('/').map(seg => seg.startsWith(':') ? ':param' : seg).join('/');
  return s;
}
function compatible(actual, expected) {
  const a = normalizePath(actual), e = normalizePath(expected);
  if (a === e) return true;
  const aa = a.split('/'), ee = e.split('/');
  if (aa.length !== ee.length) return false;
  return aa.every((x, i) => {
    const y = ee[i];
    if (x === y || x === ':param' || y === ':param') return true;
    const wildcardMatch = (pattern, value) => {
      if (!pattern.includes('__PARAM__')) return false;
      const [prefix, suffix] = pattern.split('__PARAM__');
      return value.startsWith(prefix) && value.endsWith(suffix);
    };
    return wildcardMatch(x, y) || wildcardMatch(y, x);
  });
}

const mounts = [];
const server = read('backend/server.js');
for (const m of server.matchAll(/app\.use\((['"`])([^'"`]+)\1,\s*([A-Za-z0-9_]+)/g)) mounts.push({ prefix: m[2], variable: m[3] });
const required = new Map();
for (const mount of mounts) {
  const re = new RegExp(`const\\s+${mount.variable}\\s*=\\s*require\\(["']\\.\\/routes\\/([^"']+)["']\\)`);
  const m = server.match(re);
  if (!m) continue;
  const file = path.join(ROOT, 'backend/routes', m[1].endsWith('.js') ? m[1] : `${m[1]}.js`);
  if (!fs.existsSync(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const r of text.matchAll(/router\.(get|post|put|patch|delete|head|options)\(\s*(['"`])([^'"`]+)\2/g)) {
    const method = r[1].toUpperCase();
    required.set(`${method} ${normalizePath(`${mount.prefix}${r[3]}`)}`, true);
  }
}
for (const r of server.matchAll(/app\.(get|post|put|patch|delete|head|options)\(\s*(['"`])([^'"`]+)\2/g)) required.set(`${r[1].toUpperCase()} ${normalizePath(r[3])}`, true);

const calls = [];
for (const file of walk(path.join(ROOT, 'src'), ['.js','.jsx'])) {
  const text = fs.readFileSync(file, 'utf8');
  for (const m of text.matchAll(/\bAPI\.(get|post|put|patch|delete|head|options)\(\s*(['"`])([\s\S]*?)\2/g)) {
    calls.push({ method: m[1].toUpperCase(), path: m[3], file: file.replace(`${ROOT}/`, '') });
  }
}
assert(calls.length > 0, 'No frontend API calls found to verify.');
const missing = [];
for (const c of calls) {
  const normalizedFrontend = normalizePath('/api' + (c.path.startsWith('/') ? c.path : '/' + c.path));
  const exists = [...required.keys()].some(key => {
    const [method, ...parts] = key.split(' ');
    return method === c.method && compatible(parts.join(' '), normalizedFrontend);
  });
  if (!exists) missing.push(`${c.method} ${normalizedFrontend} (${c.file})`);
}
assert(missing.length === 0, `frontend API route contract mismatch:\n${missing.join('\n')}`);
pass(`verified ${calls.length} frontend API calls against mounted backend routes (API /api baseURL normalized)`);
