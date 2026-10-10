import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const required = [
  "middleware/requestContext.js",
  "middleware/errorHandler.js",
  "services/requestLogger.js",
  "utils/appError.js",
  "utils/controller.js",
  "utils/validate.js",
  "../README.md",
];

for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing architecture artifact: ${file}`);
}

console.log(`Architecture artifact check passed: ${required.length} files.`);
