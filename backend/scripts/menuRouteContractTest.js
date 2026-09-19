const fs = require("fs");
const path = require("path");
const assert = require("assert");

const app = fs.readFileSync(path.resolve(__dirname, "../../src/App.jsx"), "utf8");
const menuSources = [
  "../../src/config/dashboardMenu.js",
  "../../src/config/portalSections.js",
].map((file) => fs.readFileSync(path.resolve(__dirname, file), "utf8")).join("\n");

const normalize = (value) => String(value || "").split(/[?#]/)[0].replace(/\/$/, "") || "/";
const appRoutes = new Set([...app.matchAll(/<Route\s+path=["']([^"']+)["']/g)].map((match) => normalize(match[1])));
const referenced = new Set([...menuSources.matchAll(/["'](\/[^"']+)["']/g)].map((match) => normalize(match[1])));

const missing = [...referenced].filter((route) => !appRoutes.has(route));
assert.deepStrictEqual(missing, [], `Portal menu/section routes missing from App.jsx: ${missing.join(", ")}`);
assert(!menuSources.includes("/superadmin" + "/messages"), "SuperAdmin menu must not contain chat route");
console.log(`Portal menu/section route contract passed (${referenced.size} unique linked paths).`);
