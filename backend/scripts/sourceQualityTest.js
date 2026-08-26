#!/usr/bin/env node
/**
 * Dependency-free Benevolent MIDAX source-quality gate.
 * It is intentionally separate from the optional Oxlint binary.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const SOURCE_DIRS = [path.join(ROOT, "src"), path.join(ROOT, "backend")];
const EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".cjs"]);

function walk(dir){
  const out=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(["node_modules",".git","dist","dist-ssr","coverage"].includes(entry.name)) continue;
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()) out.push(...walk(full));
    else if(EXTENSIONS.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

const files=SOURCE_DIRS.flatMap(walk)
  .filter((f)=>!f.endsWith("sourceQualityTest.js"))
  .filter((f)=>!f.endsWith(`${path.sep}backend${path.sep}vite.config.js`));

const isFrontendFile = (file) => {
  const relative = path.relative(ROOT, file);
  return relative === "src" || relative.startsWith(`src${path.sep}`);
};
const failures=[];

for(const file of files){
  const rel=path.relative(ROOT,file);
  const text=fs.readFileSync(file,"utf8");

  if(isFrontendFile(file) && /(CLOUDINARY_API_SECRET|RESEND_API_KEY|TEXTBEE_API_KEY|JWT_SECRET|MONGO_URI|VAPID_PRIVATE_KEY)\s*=/.test(text)){
    failures.push(`${rel}: possible server secret in frontend source`);
  }

  if(isFrontendFile(file) && /\bconsole\.log\s*\(/.test(text)){
    failures.push(`${rel}: console.log found in frontend application source`);
  }

  if(/\bTODO\b|\bFIXME\b/.test(text)){
    failures.push(`${rel}: TODO/FIXME marker left in application source`);
  }
}

for(const file of files.filter((f)=>f.includes(`${path.sep}backend${path.sep}`))){
  const result=spawnSync(process.execPath,["--check",file],{encoding:"utf8"});
  if(result.status!==0){
    failures.push(`${path.relative(ROOT,file)}: Node syntax check failed\n${result.stderr||result.stdout}`);
  }
}

const indexHtml=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");
const themeCount=(indexHtml.match(/name=["']theme-color["']/g)||[]).length;
if(themeCount!==1) failures.push(`index.html: expected exactly one theme-color meta tag, found ${themeCount}`);

if(failures.length){
  console.error("SOURCE QUALITY TEST FAILED");
  failures.forEach((f)=>console.error(`- ${f}`));
  process.exit(1);
}
console.log(`SOURCE QUALITY TEST PASSED (${files.length} source files checked)`);
