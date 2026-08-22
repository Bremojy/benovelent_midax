import { access, readFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(projectRoot, "dist");
const indexPath = resolve(dist, "index.html");

const fail = (message) => {
  console.error(`VERCEL ASSET VERIFICATION FAILED: ${message}`);
  process.exit(1);
};

const exists = async (file) => {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
};

if (!(await exists(indexPath))) {
  fail("dist/index.html is missing. Run the Vite production build first.");
}

const cfg = JSON.parse(await readFile(resolve(projectRoot, "vercel.json"), "utf8"));
if (cfg.outputDirectory !== "dist") fail(`vercel.json outputDirectory must be dist, got ${cfg.outputDirectory}`);
if (cfg.buildCommand !== "npm run vercel-build") fail(`vercel.json buildCommand must be npm run vercel-build, got ${cfg.buildCommand}`);

const html = await readFile(indexPath, "utf8");
const refs = new Set();
const patterns = [
  /<script[^>]+src=["']([^"']+)["']/gi,
  /<link[^>]+href=["']([^"']+)["']/gi,
];
for (const pattern of patterns) {
  for (const match of html.matchAll(pattern)) refs.add(match[1]);
}

const checked = [];
for (const ref of refs) {
  if (!ref.startsWith("/") || ref.startsWith("//")) continue;
  const clean = decodeURIComponent(ref.split("?")[0].split("#")[0]);
  const local = resolve(dist, `.${clean}`);
  if (!(await exists(local))) fail(`index.html references missing asset: ${ref}`);
  checked.push({ ref, local, ext: extname(local).toLowerCase() });
}

const jsAssets = checked.filter((item) => item.ext === ".js");
if (!jsAssets.length) fail("No JavaScript module asset is referenced by the production index.html.");

for (const item of jsAssets) {
  const body = await readFile(item.local);
  const textStart = body.subarray(0, 256).toString("utf8").trimStart();
  if (/^<!doctype html|^<html[\s>]/i.test(textStart)) {
    fail(`JavaScript asset contains HTML instead of JavaScript: ${item.ref}`);
  }
}

const rewrites = cfg.rewrites || [];
const spaFallback = rewrites.find((rule) => rule?.destination === "/index.html");
if (!spaFallback) fail("SPA fallback rewrite to /index.html is missing.");
const spaSource = String(spaFallback.source);
if (!spaSource.includes("assets") || !spaSource.includes("api")) {
  fail(`SPA fallback must explicitly exclude /assets/* and /api/*: ${spaSource}`);
}
// Guard against the exact failure mode this check is intended to prevent.
// The fallback must not match API or built asset requests, while still matching client-side routes.
const excludes = [
  { path: "/assets/index-ABC123.js", label: "/assets/*" },
  { path: "/api/health", label: "/api/*" },
];
for (const item of excludes) {
  const pattern = new RegExp(`^${spaSource.replace(/^\//, "")}`);
  if (pattern.test(item.path.replace(/^\//, ""))) {
    fail(`SPA fallback still matches ${item.label}: ${spaSource}`);
  }
}
const normalized = spaSource.replace(/^\//, "");
const routeCandidate = "/member/dashboard".replace(/^\//, "");
const routePattern = new RegExp(`^${normalized}`);
if (!routePattern.test(routeCandidate)) {
  fail(`SPA fallback does not match a client-side route such as /member/dashboard: ${spaSource}`);
}

console.log(`VERCEL ASSET VERIFICATION PASSED: ${checked.length} local index assets checked; ${jsAssets.length} JavaScript assets verified as non-HTML.`);
