'use strict';
const fs = require('fs');
const path = require('path');
const { ROOT, walk, assert, pass } = require('./testUtils');

function resolves(specifier, fromFile) {
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [base, `${base}.js`, `${base}.jsx`, `${base}.mjs`, `${base}.css`, `${base}.json`, path.join(base, 'index.js'), path.join(base, 'index.jsx')];
  return candidates.some((candidate) => fs.existsSync(candidate));
}

const sourceFiles = walk(path.join(ROOT, 'src'), ['.js', '.jsx', '.mjs']);
const missing = [];
for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const specs = [];
  for (const m of text.matchAll(/(?:from\s*|import\s*\()(['"`])([^'"`]+)\1/g)) specs.push(m[2]);
  for (const spec of specs) {
    if (!spec.startsWith('.')) continue;
    if (!resolves(spec, file)) missing.push(`${file.replace(`${ROOT}/`, '')} -> ${spec}`);
  }
}
assert(missing.length === 0, `missing frontend relative imports:\n${missing.join('\n')}`);
pass(`frontend relative import resolution passed for ${sourceFiles.length} source files`);
