// server/scripts/bootstrapDemoData.js

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourcePath = path.join(__dirname, "../data/demoDb.json");
const targetPath = path.join(__dirname, "../data/db.json");

try {
  const raw = fs.readFileSync(sourcePath, "utf-8");
  fs.writeFileSync(targetPath, raw, "utf-8");

  console.log("Demo database bootstrapped successfully.");
} catch (error) {
  console.error("Failed to bootstrap demo database:", error);
  process.exit(1);
}
