const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..", "..");
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");
const fail = (message) => { throw new Error(`FAIL: ${message}`); };
const check = (condition, message) => condition ? console.log(`PASS: ${message}`) : fail(message);

const commandCenter = read("src/components/dashboard/PortalCommandCenter.jsx");
const app = read("src/App.jsx");
const main = read("src/main.jsx");
const auth = read("src/context/AuthContext.jsx");

const loaderIndex = commandCenter.indexOf("const loadActivity = useCallback");
const refreshEffectIndex = commandCenter.indexOf('window.addEventListener("benovelent:refresh-action-center"');
const refreshDependencyIndex = commandCenter.indexOf("}, [loadActivity]);", refreshEffectIndex);
check(loaderIndex >= 0 && refreshEffectIndex > loaderIndex && refreshDependencyIndex > loaderIndex, "PortalCommandCenter initializes loadActivity before any dependency array references it");
check((app.match(/import SmartAssistant from/g) || []).length === 1, "App imports one SmartAssistant component");
check((app.match(/<SmartAssistant \/>/g) || []).length === 1 && app.includes("!dashboardRoute && !isLogin"), "App renders the public Assistant outside portal routes and Login");
check(!main.includes('/notifications/push/subscribe'), "Global service-worker bootstrap does not POST to protected push-subscribe before authentication");
check(main.includes('navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" })'), "Service-worker registration remains enabled globally");
check(auth.includes("const hasCachedSession = Boolean(getStoredUser()?.id)"), "Auth bootstrap distinguishes an expected anonymous 401 from an expired authenticated session");
check(auth.includes('setAuthError("")') && auth.includes("clearStoredSession();"), "Anonymous session verification 401 is handled without a false session error");
console.log("AUTH + ASSISTANT RUNTIME REGRESSION CONTRACTS PASSED");
