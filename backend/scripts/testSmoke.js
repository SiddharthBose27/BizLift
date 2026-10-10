import assert from "node:assert/strict";
import { env } from "../config/env.js";

assert.ok(env.PORT > 0, "PORT must be configured");
assert.ok(env.DB_MODE === "json" || env.DB_MODE === "postgres", "DB_MODE must be json or postgres");
console.log(JSON.stringify({ smoke: "passed", port: env.PORT, dbMode: env.DB_MODE }));
