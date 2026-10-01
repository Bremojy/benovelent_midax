#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const SRC = path.join(ROOT, "src");
const APP = path.join(SRC, "App.jsx");
const quickActions = path.join(SRC, "components/member/QuickActions.jsx");

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});
const sourceFiles = walk(SRC).filter((file) => /\.(jsx?|tsx?)$/.test(file));
const source = sourceFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
const app = fs.readFileSync(APP, "utf8");
const quick = fs.readFileSync(quickActions, "utf8");

const routes = new Set([...app.matchAll(/<Route\s+path=["']([^"']+)["']/g)].map((m) => m[1]));
const required = ["/", "/login", "/member/messages", "/admin/messages", "/member/accounts"];
for (const route of required) {
  if (!routes.has(route)) throw new Error(`Missing canonical application route: ${route}`);
}
if (routes.has("/superadmin/messages")) throw new Error("SuperAdmin must not expose a normal chat-center route.");
if (quick.includes("/member/statements")) throw new Error("Stale /member/statements navigation reference remains.");
if (!quick.includes('/member/accounts')) throw new Error("Member quick action must target the existing Accounts route.");

// Detect literal internal page references in navigation/actions. API endpoints and external URLs are excluded.
const suspicious = [];
const routePattern = /\/(?:member|admin|superadmin|about|services|leaders|constitution|gallery|news|contact|login|privacy-policy|terms-conditions|disclaimer|verify-membership|resources|events)(?:[^"'\s]*)/;
const routeExists = (value) => {
  const base = value.split("?")[0].split("#")[0];
  if (base.includes("${") || base.includes(":")) return true;
  return Array.from(routes).some((route) => route === base || route.endsWith("/*") && base.startsWith(route.slice(0, -1)));
};
for (const file of sourceFiles) {
  const text = fs.readFileSync(file, "utf8");
  for (const match of text.matchAll(/(?:path|to|href)\s*[:=]\s*["'](\/(?:member|admin|superadmin|about|services|leaders|constitution|gallery|news|contact|login|privacy-policy|terms-conditions|disclaimer|verify-membership|resources|events)(?:[^"']*)?)["']/g)) {
    const value = match[1];
    if (!routeExists(value)) suspicious.push(`${path.relative(ROOT, file)} -> ${value}`);
  }
  for (const match of text.matchAll(/navigate\(\s*["'](\/(?:member|admin|superadmin|about|services|leaders|constitution|gallery|news|contact|login|privacy-policy|terms-conditions|disclaimer|verify-membership|resources|events)(?:[^"']*)?)["']/g)) {
    const value = match[1];
    if (!routeExists(value)) suspicious.push(`${path.relative(ROOT, file)} -> navigate(${value})`);
  }
  for (const match of text.matchAll(/window\.location(?:\.href)?\s*=\s*["'](\/(?:member|admin|superadmin|about|services|leaders|constitution|gallery|news|contact|login|privacy-policy|terms-conditions|disclaimer|verify-membership|resources|events)(?:[^"']*)?)["']/g)) {
    const value = match[1];
    if (!routeExists(value)) suspicious.push(`${path.relative(ROOT, file)} -> window.location=${value}`);
  }
}
if (suspicious.length) throw new Error(`Stale/nonexistent internal routes found:\n${suspicious.join("\n")}`);

// Ensure every statically lazy-loaded page module exists.
for (const match of app.matchAll(/import\(\s*["'](\.\/pages\/[^"']+)["']\s*\)/g)) {
  const relative = match[1].replace(/^\.\//, "");
  const candidates = [path.join(SRC, relative), path.join(SRC, `${relative}.jsx`), path.join(SRC, `${relative}.js`)];
  if (!candidates.some(fs.existsSync)) throw new Error(`Lazy-loaded page module missing: ${relative}`);
}

console.log(`PASS route/page inventory: ${routes.size} declared routes, all canonical lazy page modules exist, and no stale internal page references were found.`);
