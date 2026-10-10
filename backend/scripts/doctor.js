import fs from "node:fs";
import { env } from "../config/env.js";
import { isPostgresEnabled, getPrisma } from "../utils/postgres.js";

const checks = [];
const add = (name, ok, detail) => checks.push({ name, ok, detail });

add("environment", Boolean(env.NODE_ENV), `NODE_ENV=${env.NODE_ENV || "unset"}`);
add("cors", Boolean(env.CORS_ORIGIN), `CORS_ORIGIN=${env.CORS_ORIGIN || "unset"}`);
add("database mode", ["json", "postgres"].includes(env.DB_MODE), `DB_MODE=${env.DB_MODE}`);
add("env file", fs.existsSync(".env"), fs.existsSync(".env") ? ".env present" : ".env missing");

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
  add("postgres connectivity", true, "skipped in JSON mode");
}

const failed = checks.filter((check) => !check.ok);
console.log(JSON.stringify({ status: failed.length ? "failed" : "ready", checks }, null, 2));
process.exit(failed.length ? 1 : 0);
