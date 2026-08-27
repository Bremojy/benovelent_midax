const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const api = read("src/services/api.js");
const env = read(".env.example");
const vercel = read("vercel.json");
const pkg = JSON.parse(read("package.json"));

if (pkg.version !== "18.5.0") throw new Error(`Expected current release package, found ${pkg.version}`);
for (const value of ["isVercelHost", "window.location.origin", "/api"]) {
  if (!api.includes(value)) throw new Error(`API configuration missing ${value}`);
}
if (!env.includes("VITE_API_URL=/api")) throw new Error("Frontend env example should use the Vercel same-origin /api proxy.");
if (!env.includes("VITE_SOCKET_UPGRADE=true")) throw new Error("Frontend env example should enable Socket.IO WebSocket upgrade with polling fallback.");
if (!vercel.includes('"source": "/api/:path*"') || !vercel.includes('"destination": "https://benovelent-midax.onrender.com/api/:path*"')) throw new Error("Vercel API rewrite is missing.");
console.log("Production configuration contract test: PASS");
