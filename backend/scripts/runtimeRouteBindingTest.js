/*
 * Route binding/load regression guard.
 *
 * This deliberately stubs external/local route dependencies so each route file
 * can be evaluated without MongoDB, Cloudinary, or other runtime services.
 * It catches module-evaluation failures such as an authorization middleware
 * identifier being referenced without being imported/declared.
 */
const Module = require("module");
const fs = require("fs");
const path = require("path");

const originalLoad = Module._load;
const noop = () => {};
const router = new Proxy({}, { get: () => noop });
const expressMock = { Router: () => router };
const genericMock = new Proxy({}, {
  get: (_, prop) => {
    if (prop === "__esModule") return true;
    return noop;
  },
});

let failed = 0;
let checked = 0;

Module._load = function routeLoadGuard(request, parent, isMain) {
  if (request === "express") return expressMock;
  if (request.startsWith(".") || request.startsWith("/")) return genericMock;
  return genericMock;
};

try {
  const routesDir = path.join(process.cwd(), "backend", "routes");
  for (const file of fs.readdirSync(routesDir).sort()) {
    if (!file.endsWith(".js")) continue;
    checked += 1;
    const full = path.join(routesDir, file);
    try {
      delete require.cache[require.resolve(full)];
      require(full);
      console.log(`PASS route load/binding: ${file}`);
    } catch (error) {
      failed += 1;
      console.error(`FAIL route load/binding: ${file} :: ${error.name}: ${error.message}`);
    }
  }
} finally {
  Module._load = originalLoad;
}

if (failed) {
  process.exitCode = 1;
  console.error(`ROUTE LOAD/BINDING REGRESSION FAILED: ${failed}/${checked} route modules failed.`);
} else {
  console.log(`PASS route load/binding regression: ${checked} route modules evaluated successfully.`);
}
