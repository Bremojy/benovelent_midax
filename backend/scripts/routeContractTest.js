const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "../..");
const backendRoot = path.join(projectRoot, "backend");
const frontendRoot = path.join(projectRoot, "src");
const serverFile = fs.readFileSync(path.join(backendRoot, "server.js"), "utf8");

const normalize = (value) => {
  let out = String(value || "").trim();
  out = out.replace(/:\w+/g, "{}");
  out = out.replace(/\/+$/g, "");
  return out || "/";
};

function walk(dir, predicate, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git"].includes(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file, predicate, out);
    else if (predicate(file)) out.push(file);
  }
  return out;
}

const routeRequires = new Map();
for (const match of serverFile.matchAll(/const\s+(\w+)\s*=\s*require\("(\.\/routes\/[^"]+)"\)/g)) {
  routeRequires.set(match[1], match[2]);
}

const mounts = new Map();
for (const match of serverFile.matchAll(/app\.use\(\s*"([^"]+)"\s*,\s*(\w+)\s*\)/g)) {
  mounts.set(match[2], match[1]);
}

const backendRoutes = new Set();
const backendDetails = [];

for (const [name, relative] of routeRequires.entries()) {
  const mount = mounts.get(name);
  if (!mount) continue;

  const file = path.join(backendRoot, `${relative.slice(2)}.js`);
  if (!fs.existsSync(file)) continue;

  const source = fs.readFileSync(file, "utf8");
  for (const match of source.matchAll(/router\.(get|post|put|patch|delete)\(\s*"([^"]+)"/gi)) {
    const method = match[1].toUpperCase();
    const route = `${mount}${match[2]}`;
    backendRoutes.add(`${method} ${normalize(route)}`);
    backendDetails.push(`${method} ${route} (${path.relative(projectRoot, file)})`);
  }
}

// Include app-level endpoints such as /api/health.
for (const match of serverFile.matchAll(/app\.(get|post|put|patch|delete)\(\s*"([^"]+)"/gi)) {
  const method = match[1].toUpperCase();
  const route = match[2];
  backendRoutes.add(`${method} ${normalize(route)}`);
  backendDetails.push(`${method} ${route} (backend/server.js)`);
}

const frontendFiles = walk(frontendRoot, (file) => /\.(js|jsx)$/.test(file));
const frontendCalls = [];

for (const file of frontendFiles) {
  const source = fs.readFileSync(file, "utf8");
  for (const match of source.matchAll(/API\.(get|post|put|patch|delete)\(\s*["']([^"']+)["']/g)) {
    const method = match[1].toUpperCase();
    const route = `/api${match[2]}`;
    frontendCalls.push({
      method,
      route,
      file: path.relative(projectRoot, file),
    });
  }
}

const mismatches = frontendCalls.filter((call) => {
  const key = `${call.method} ${normalize(call.route)}`;
  return !backendRoutes.has(key);
});

console.log(`Backend route contracts found: ${backendRoutes.size}`);
console.log(`Frontend API calls checked: ${frontendCalls.length}`);

if (mismatches.length) {
  console.error("\nROUTE CONTRACT TEST FAILED");
  for (const mismatch of mismatches) {
    console.error(`- ${mismatch.method} ${mismatch.route} <- ${mismatch.file}`);
  }
  process.exit(1);
}

console.log("ROUTE CONTRACT TEST PASSED");
console.log("All literal frontend API calls map to a backend route or app-level API endpoint.");
