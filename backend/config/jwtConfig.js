const env = (name, fallback = "") => String(process.env[name] ?? fallback).trim();

const jwtConfig = Object.freeze({
  secret: env("JWT_SECRET"),
  expiresIn: env("JWT_EXPIRE", "7d"),
});

if (!jwtConfig.secret && String(process.env.NODE_ENV || "").toLowerCase() === "production") {
  console.warn("JWT_SECRET is not configured; authentication will fail until it is supplied.");
}

module.exports = jwtConfig;
