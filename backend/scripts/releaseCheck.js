import fs from "node:fs";
import { env } from "../config/env.js";
import { isPostgresEnabled, getPrisma } from "../utils/postgres.js";

const checks = [];
const add = (name, ok, detail) => checks.push({ name, ok, detail });

add("production mode", env.NODE_ENV === "production", `NODE_ENV=${env.NODE_ENV}`);
add("postgres mode", isPostgresEnabled(), `BIZLIFT_DB_MODE=${env.DB_MODE}`);
add("database URL", Boolean(env.DATABASE_URL), env.DATABASE_URL ? "configured" : "missing");
add("CORS origin", Boolean(env.CORS_ORIGIN) && !/localhost|127\.0\.0\.1/i.test(env.CORS_ORIGIN), `CORS_ORIGIN=${env.CORS_ORIGIN}`);
add("body limit", Boolean(env.BODY_LIMIT), `BODY_LIMIT=${env.BODY_LIMIT}`);
add("session TTL", Number.isFinite(env.SESSION_TTL_HOURS) && env.SESSION_TTL_HOURS > 0, `SESSION_TTL_HOURS=${env.SESSION_TTL_HOURS}`);
add("production secret source", true, fs.existsSync(".env") ? "local .env detected; use platform secrets for deployed environments" : "platform environment expected");

if (isPostgresEnabled()) {
  try {
    const prisma = await getPrisma();
    await prisma.$queryRaw`SELECT 1`;
    add("postgres connectivity", true, "SELECT 1 succeeded");
    await prisma.$disconnect();
  } catch (error) {
    add("postgres connectivity", false, error.message);
  }
} else {
  add("postgres connectivity", false, "production releases require PostgreSQL");
}

const failed = checks.filter((check) => !check.ok);
console.log(JSON.stringify({ status: failed.length ? "blocked" : "release-ready", checks }, null, 2));
process.exit(failed.length ? 1 : 0);
