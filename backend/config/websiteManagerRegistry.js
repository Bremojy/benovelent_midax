const ALLOWED_SECTIONS = new Map([
  ["home", ["title", "subtitle", "description", "content", "images", "published"]],
  ["about", ["title", "subtitle", "description", "content", "images", "published"]],
  ["services", ["title", "subtitle", "description", "content", "images", "published"]],
  ["contact", ["title", "subtitle", "description", "content", "images", "published"]],
  ["footer", ["title", "subtitle", "description", "content", "images", "published"]],
  ["settings", ["title", "subtitle", "description", "content", "images", "published"]],
  ["gallery", ["title", "subtitle", "description", "content", "images", "published"]],
  ["constitution", ["title", "subtitle", "description", "content", "images", "published"]],
  ["privacy-policy", ["title", "subtitle", "description", "content", "images", "published"]],
  ["terms-conditions", ["title", "subtitle", "description", "content", "images", "published"]],
  ["disclaimer", ["title", "subtitle", "description", "content", "images", "published"]],
  ["news", ["title", "subtitle", "description", "content", "images", "published"]],
  ["events", ["title", "subtitle", "description", "content", "images", "published"]],
  ["resources", ["title", "subtitle", "description", "content", "images", "published"]],
  ["chatbot", ["title", "subtitle", "description", "content", "images", "published"]],
]);

const BLOCKED_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function isAllowedSection(section) {
  return ALLOWED_SECTIONS.has(String(section || "").trim().toLowerCase());
}

function allowedFields(section) {
  return ALLOWED_SECTIONS.get(String(section || "").trim().toLowerCase()) || [];
}

function sanitizeValue(value, depth = 0) {
  if (depth > 6) return null;
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 200).map((item) => sanitizeValue(item, depth + 1));
  const output = {};
  for (const [key, nested] of Object.entries(value)) {
    if (BLOCKED_KEYS.has(key) || key.startsWith("$") || key.includes(".")) continue;
    output[key] = sanitizeValue(nested, depth + 1);
  }
  return output;
}

function pickSectionPayload(section, body = {}) {
  const fields = allowedFields(section);
  const input = body && typeof body === "object" ? body : {};
  const payload = {};
  for (const field of fields) {
    if (!(field in input)) continue;
    if (field === "published" && typeof input[field] !== "boolean") continue;
    payload[field] = field === "content" || field === "images" ? sanitizeValue(input[field]) : input[field];
  }
  return payload;
}

module.exports = { ALLOWED_SECTIONS, isAllowedSection, allowedFields, sanitizeValue, pickSectionPayload };
