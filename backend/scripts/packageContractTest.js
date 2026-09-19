'use strict';
const fs = require('fs');
const path = require('path');
const { ROOT, assert, pass } = require('./testUtils');

for (const rel of ['package.json', 'backend/package.json']) {
  const file = path.join(ROOT, rel);
  const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const [name, command] of Object.entries(pkg.scripts || {})) {
    const matches = [...String(command).matchAll(/(?:node|nodejs)\s+([^\s;&|]+\.(?:js|mjs|cjs))/g)];
    for (const match of matches) {
      const target = path.resolve(path.dirname(file), match[1]);
      // Vite's node_modules path is dependency-installed, so package-contract only
      // rejects repository-local missing script files.
      if (match[1].startsWith('node_modules/')) continue;
      assert(fs.existsSync(target), `${rel} script '${name}' references missing file: ${match[1]}`);
    }
  }
}
pass('all declared Node script targets exist');
