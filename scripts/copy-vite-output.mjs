import { cp, rm, mkdir } from "node:fs/promises";

const source = "dist";
const target = "vercel-output";

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });

console.log(`Vercel static output copied from ${source}/ to ${target}/`);
