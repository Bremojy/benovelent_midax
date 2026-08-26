const PREFIX = String(process.env.REDIS_KEY_PREFIX || "benevolent-midax:v1").replace(/:+$/, "");
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_REST_URL || "";
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_REST_TOKEN || "";

function key(name) { return `${PREFIX}:${String(name).replace(/^:+/, "")}`; }
function makeCacheKey(scope, parts = {}) { return `${scope}:${Object.entries(parts).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${k}=${encodeURIComponent(String(v ?? ""))}`).join("&")}`; }
function enabled() { return Boolean(REDIS_URL && REDIS_TOKEN && typeof fetch === "function"); }

async function command(parts) {
  if (!enabled()) return null;
  try {
    const response = await fetch(REDIS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(parts),
      signal: AbortSignal.timeout(Number(process.env.REDIS_TIMEOUT_MS || 1200)),
    });
    if (!response.ok) throw new Error(`Redis HTTP ${response.status}`);
    const body = await response.json();
    return body?.result ?? null;
  } catch (error) {
    // Performance enhancement must never become a single point of failure.
    console.warn(`[redis-cache] ${error.message}`);
    return null;
  }
}

async function get(name) { return command(["GET", key(name)]); }
async function set(name, value, ttlSeconds = 120) {
  const k = key(name);
  if (ttlSeconds > 0) return command(["SET", k, String(value), "EX", String(Math.max(1, Math.floor(ttlSeconds)))]);
  return command(["SET", k, String(value)]);
}
async function del(name) { return command(["DEL", key(name)]); }
async function getJson(name) { const value = await get(name); if (value == null) return null; try { return JSON.parse(value); } catch (_) { return null; } }
async function setJson(name, value, ttlSeconds = 120) { return set(name, JSON.stringify(value), ttlSeconds); }
async function cacheAside(name, loader, ttlSeconds = 120) {
  const cached = await getJson(name);
  if (cached !== null) return cached;
  const fresh = await loader();
  await setJson(name, fresh, ttlSeconds);
  return fresh;
}
async function invalidateMany(names) { await Promise.all(names.filter(Boolean).map((name) => del(name))); }
async function scan(match = "*") {
  if (!enabled()) return [];
  const result = await command(["SCAN", "0", "MATCH", key(match), "COUNT", "200"]);
  return Array.isArray(result?.[1]) ? result[1] : [];
}
async function invalidatePrefix(prefix) {
  const keys = await scan(`${String(prefix).replace(/^:+|:+$/g, "")}:*`);
  if (!keys.length) return;
  await Promise.all(keys.map((fullKey) => command(["DEL", fullKey])));
}
async function health() {
  if (!enabled()) return { enabled: false, connected: false };
  const pong = await command(["PING"]);
  return { enabled: true, connected: pong === "PONG" };
}
module.exports = { enabled, get, set, del, getJson, setJson, cacheAside, invalidateMany, invalidatePrefix, health, makeCacheKey };
