const redisCache = require("../services/redisCache");

const shouldCacheResponse = (res) => {
  const type = String(res.getHeader("Content-Type") || "").toLowerCase();
  return res.statusCode >= 200 && res.statusCode < 300 && (!type || type.includes("json"));
};

const makeRequestKey = (prefix, req) => {
  const entries = Object.entries(req.query || {}).sort(([a], [b]) => a.localeCompare(b));
  const query = new URLSearchParams(entries.map(([k, v]) => [k, Array.isArray(v) ? v.join(",") : String(v ?? "")])).toString();
  return `${prefix}:${req.path}${query ? `?${query}` : ""}`;
};

const cacheGet = ({ prefix, ttl = 120 }) => async (req, res, next) => {
  if (req.method !== "GET") return next();
  const key = makeRequestKey(prefix, req);

  try {
    const cached = await redisCache.getJson(key);
    if (cached !== null) {
      res.set("X-Benevolent-Cache", "HIT");
      res.set("Cache-Control", `public, max-age=${Math.min(Number(ttl) || 120, 300)}, stale-while-revalidate=600`);
      return res.json(cached);
    }
  } catch (_) {}

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (shouldCacheResponse(res)) {
      redisCache.setJson(key, body, ttl).catch(() => {});
      res.set("X-Benevolent-Cache", "MISS");
      res.set("Cache-Control", `public, max-age=${Math.min(Number(ttl) || 120, 300)}, stale-while-revalidate=600`);
    }
    return originalJson(body);
  };
  return next();
};

module.exports = { cacheGet };
