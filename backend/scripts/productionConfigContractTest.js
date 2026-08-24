const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const api = read("src/services/api.js");
const env = read(".env.example");
const vercel = read("vercel.json");
const pkg = JSON.parse(read("package.json"));

if (pkg.version !== "18.0.0") throw new Error(`Expected v17 package, found ${pkg.version}`);
for (const value of ["isVercelHost", "window.location.origin", "/api"]) {
  if (!api.includes(value)) throw new Error(`API configuration missing ${value}`);
}
if (!env.includes("VITE_API_URL=\n")) throw new Error("Frontend env example should leave VITE_API_URL blank for Vercel same-origin API proxying.");
if (!env.includes("VITE_SOCKET_UPGRADE=false")) throw new Error("Frontend env example should enable Socket.IO WebSocket upgrade with polling fallback.");
if (!vercel.includes('"source": "/api/:path*"') || !vercel.includes('"destination": "https://benovelent-midax.onrender.com/api/:path*"')) throw new Error("Vercel API rewrite is missing.");
console.log("Production configuration contract test: PASS");
