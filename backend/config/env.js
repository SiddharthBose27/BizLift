// server/config/env.js

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT || 5002),
  SESSION_TTL_HOURS: Number(process.env.SESSION_TTL_HOURS || 24),
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",
  BODY_LIMIT: process.env.BODY_LIMIT || "12mb",
  DB_MODE: process.env.BIZLIFT_DB_MODE || "json",
  DATABASE_URL: process.env.DATABASE_URL || "",
};
