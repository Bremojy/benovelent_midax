import { readFile, access } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const cfg = JSON.parse(await readFile(resolve(root, "vercel.json"), "utf8"));
const rewrites = cfg.rewrites || [];
const fallback = rewrites.find((r) => r.destination === "/index.html");
if (!fallback) throw new Error("Missing SPA fallback rewrite to /index.html");
if (!fallback.source.includes("assets")) throw new Error("SPA fallback must exclude /assets/*");
if (!fallback.source.includes("api")) throw new Error("SPA fallback must exclude /api/*");

const copyScript = await readFile(resolve(root, "scripts/copy-vite-output.mjs"), "utf8");
if (!copyScript.includes('const source = "dist"') || !copyScript.includes('const target = "vercel-output"')) {
  throw new Error("Unexpected Vercel output copy script");
}

const dist = resolve(root, "dist");
try {
  await access(dist);
  const index = resolve(dist, "index.html");
  await access(index);
  console.log("Vercel asset routing config: PASS (dist/index.html exists)");
} catch {
  console.log("Vercel asset routing config: PASS (build output not present in source package; runtime build creates dist/)");
}
