"use strict";
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const root = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const main = read("src/main.jsx");
const boundary = read("src/components/AppErrorBoundary.jsx");
const html = read("index.html");
const sw = read("public/sw.js");
const pkg = JSON.parse(read("package.json"));

assert(/import AppErrorBoundary from ["']\.\/components\/AppErrorBoundary\.jsx["']/.test(main), "Root must import AppErrorBoundary");
assert(/<AppErrorBoundary>[\s\S]*?<AuthProvider>[\s\S]*?<SocketProvider>[\s\S]*?<App \/>[\s\S]*?<\/SocketProvider>[\s\S]*?<\/AuthProvider>[\s\S]*?<\/AppErrorBoundary>/.test(main), "Error boundary must wrap every provider and the main application");
assert(/componentDidCatch/.test(boundary) && /Technical details/.test(boundary) && /Reset this view/.test(boundary), "Error boundary must log and present actionable diagnostics");
assert(/id="app-boot-screen"/.test(html), "HTML must show a startup fallback before React mounts");
assert(/addEventListener\("error"/.test(html) && /addEventListener\("unhandledrejection"/.test(html), "Boot fallback must detect script failures and startup rejections");
assert(/appModuleLoaded/.test(html) && /appModuleLoaded/.test(main), "Boot diagnostics must stop after React entry successfully mounts");
assert(/benevolent-shell-v29-api-pwa-18-5-5-phone-import-fix/.test(sw), "PWA shell cache must be versioned for this recovery release");
assert(/key !== CACHE && key !== VIDEO_CACHE/.test(sw), "Activating a shell update must not purge the separate video cache");
assert(pkg.version === "18.5.5", "Package version must reflect the phone import repair release");
assert(pkg.scripts["test:blank-page-recovery"], "Recovery regression test must be wired into npm scripts");
console.log("Blank-page recovery regression passed: root boundary, startup fallback, module diagnostics, and PWA cache versioning verified.");
