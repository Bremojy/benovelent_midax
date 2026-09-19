'use strict';
const { ROOT, walk, assert, pass } = require('./testUtils');
const { spawnSync } = require('child_process');
const files = walk(`${ROOT}/backend`, ['.js']);
assert(files.length > 0, 'No backend JavaScript files found.');
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Syntax error in ${pathRelative(file)}\n${result.stderr || result.stdout}`);
}
function pathRelative(file) { return file.replace(`${ROOT}/`, ''); }
pass(`backend syntax check passed for ${files.length} JavaScript files`);
