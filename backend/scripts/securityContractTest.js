#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "../..");
const failures = [];
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const authMiddleware = read("backend/middleware/authMiddleware.js");
const authController = read("backend/controllers/authController.js");
const jwt = read("backend/utils/generateToken.js");
const socketServer = read("backend/sockets/socket.js");
const csrf = read("backend/middleware/csrfMiddleware.js");
const api = read("src/services/api.js");
const server = read("backend/server.js");
const authContext = read("src/context/AuthContext.jsx");
const socketClient = read("src/sockets/socket.js");

for (const needle of ['ACCESS_COOKIE', 'algorithms: ["HS256"]', 'issuer: "benevolent-midax"', 'audience: "benevolent-midax-users"']) {
  if (!authMiddleware.includes(needle)) failures.push(`HTTP auth verification missing: ${needle}`);
}
for (const needle of ["setAuthCookies", "csrfToken", "clearAuthCookies"]) {
  if (!authController.includes(needle)) failures.push(`Auth controller cookie flow missing: ${needle}`);
}
for (const needle of ["httpOnly: true", 'sameSite: isProduction ? "none" : "lax"']) {
  if (!read("backend/utils/authCookies.js").includes(needle)) failures.push(`Secure cookie contract missing: ${needle}`);
}
for (const needle of ["X-CSRF-Token", 'code: "CSRF_INVALID"']) {
  if (!csrf.includes(needle)) failures.push(`CSRF middleware missing: ${needle}`);
}
for (const needle of ["withCredentials: true", "setCsrfToken", "getCsrfToken"]) {
  if (!api.includes(needle)) failures.push(`Frontend cookie/CSRF transport missing: ${needle}`);
}
if (!server.includes('"X-CSRF-Token"')) failures.push("CORS must allow X-CSRF-Token for cookie-authenticated browser requests.");
for (const needle of ["sessionStorage.setItem(\"user\"", "saveSession(normalizedUser)"]) {
  if (!authContext.includes(needle)) failures.push(`Frontend user-only session contract missing: ${needle}`);
}
if (!authContext.includes("const [user, setUser] = useState(null);")) failures.push("AuthContext must not treat cached sessionStorage user data as authenticated before server verification.");
if (!authContext.includes("Connection is temporarily unavailable. Please wait and try again.")) failures.push("Temporary verification failures must not restore a stale cached authenticated dashboard.");if (/sessionStorage\.(getItem|setItem)\(["'](?:memberToken|adminToken|superAdminToken)/.test(authContext)) {
  failures.push("AuthContext still stores a bearer token in sessionStorage.");
}
if (!socketClient.includes("withCredentials: true")) failures.push("Socket client must send credentials with cross-origin cookies.");
for (const needle of ["AUTH_COOKIE_NAME", "parseCookies", "issuer: \"benevolent-midax\""]) {
  if (!socketServer.includes(needle)) failures.push(`Socket server cookie auth missing: ${needle}`);
}
if (failures.length) {
  console.error("SECURITY CONTRACT TEST FAILED");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("SECURITY CONTRACT TEST PASSED");
console.log("Verified HttpOnly cookie authentication, CSRF protection, JWT claim pinning, and cookie-authenticated Socket.IO.");
