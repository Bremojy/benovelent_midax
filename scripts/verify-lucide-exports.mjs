import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = process.cwd();
const sourceRoot = path.join(root, "src");
const forbiddenBrandImports = new Set([
  "Instagram",
  "Facebook",
  "Whatsapp",
  "WhatsApp",
  "LinkedIn",
  "Linkedin",
  "YouTube",
  "Youtube",
  "TikTok",
  "Twitter",
  "Snapchat",
  "Telegram",
]);

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (/\.(?:js|jsx|ts|tsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const files = walk(sourceRoot);
const sourceBrandViolations = [];
const imports = [];

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  for (const match of text.matchAll(/import\s*\{([\s\S]*?)\}\s*from\s*["']lucide-react["']/g)) {
    const names = match[1]
      .split(",")
      .map((value) => value.trim().split(/\s+as\s+/i)[0].trim())
      .filter(Boolean);
    for (const name of names) {
      imports.push({ file, name });
      if (forbiddenBrandImports.has(name)) {
        sourceBrandViolations.push({ file, name });
      }
    }
  }
}

if (sourceBrandViolations.length) {
  console.error("FAIL: brand-logo imports detected from lucide-react:");
  for (const item of sourceBrandViolations) console.error(`  ${path.relative(root, item.file)} -> ${item.name}`);
  process.exit(1);
}

let packageInstalled = false;
let exportedNames = null;
try {
  const require = createRequire(import.meta.url);
  const packageJsonPath = require.resolve("lucide-react/package.json");
  const packageDir = path.dirname(packageJsonPath);
  const esmPath = path.join(packageDir, "dist", "esm", "lucide-react.mjs");
  if (fs.existsSync(esmPath)) {
    packageInstalled = true;
    const content = fs.readFileSync(esmPath, "utf8");
    const exportMatch = content.match(/export\s*\{([\s\S]*?)\};?\s*$/m);
    if (exportMatch) {
      exportedNames = new Set();
      for (const part of exportMatch[1].split(",")) {
        const cleaned = part.trim();
        if (!cleaned) continue;
        const alias = cleaned.match(/^([A-Za-z0-9_$]+)(?:\s+as\s+[A-Za-z0-9_$]+)?$/);
        if (alias) exportedNames.add(alias[1]);
      }
    }
  }
} catch {
  packageInstalled = false;
}

if (packageInstalled && exportedNames && exportedNames.size) {
  const missing = imports.filter(({ name }) => !exportedNames.has(name));
  if (missing.length) {
    console.error("FAIL: lucide-react imports missing from the installed package:");
    for (const item of missing) console.error(`  ${path.relative(root, item.file)} -> ${item.name}`);
    process.exit(1);
  }
  console.log(`PASS lucide-react export compatibility verified for ${imports.length} imported icons.`);
} else {
  console.log(`PASS source-level Lucide brand audit passed for ${imports.length} imports (lucide-react package not installed in this environment).`);
}
