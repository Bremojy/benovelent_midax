const env = (name, fallback = "") => String(process.env[name] ?? fallback).trim();

const appConfig = Object.freeze({
  port: Number(env("PORT", "5000")) || 5000,
  nodeEnv: env("NODE_ENV", "development"),
  appVersion: env("APP_VERSION", "18.3.0"),
  corsOrigins: env("CORS_ORIGINS", "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  allowVercelPreviews: env("ALLOW_VERCEL_PREVIEWS", "false").toLowerCase() === "true",
});

module.exports = { appConfig, env };
