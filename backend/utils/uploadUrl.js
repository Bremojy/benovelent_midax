const isPublicUrl = (value) => typeof value === "string" && /^(https?:\/\/|data:|blob:)/i.test(value);

const resolveStoredFileUrl = (file, fallbackPrefix = "") => {
  if (!file) return "";

  const direct = file.secure_url || file.url || file.path || "";
  if (isPublicUrl(direct)) return direct;

  const prefix = String(fallbackPrefix || "").replace(/\/$/, "");
  if (prefix && file.filename) {
    return `${prefix}/${file.filename}`;
  }

  return direct;
};

const resolveStoredFiles = (files, fallbackPrefix = "") =>
  (files || []).map((file) => resolveStoredFileUrl(file, fallbackPrefix)).filter(Boolean);

module.exports = {
  isPublicUrl,
  resolveStoredFileUrl,
  resolveStoredFiles,
};
