import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "../data");
const sampleDir = path.join(dataDir, "sample");
const required = {
  "inventory_master.csv": 35,
  "recipes_master.csv": 21,
  "sales.csv": 2500,
  "inventory_transactions.csv": 5000,
  "waste_events.csv": 2500,
  "purchase_orders.csv": 2000,
  "demand_observations.csv": 2500,
  "suppliers.csv": 2000,
};

let ok = true;
for (const [file, expected] of Object.entries(required)) {
  const p = path.join(sampleDir, file);
  if (!fs.existsSync(p)) {
    console.error(`Missing dataset: ${file}`);
    ok = false;
    continue;
  }
  const rows = Math.max(0, fs.readFileSync(p, "utf8").trim().split(/\r?\n/).length - 1);
  console.log(`${file}: ${rows} rows`);
  const isMaster = file === "inventory_master.csv" || file === "recipes_master.csv";
  if ((isMaster && rows !== expected) || (!isMaster && (rows < 2000 || rows > 5000 || rows !== expected))) ok = false;
}

const generated = JSON.parse(fs.readFileSync(path.join(dataDir, "generatedWorkspaceData.json"), "utf8"));
for (const [key, workspace] of Object.entries(generated)) {
  const names = workspace.inventory.map((item) => String(item.itemName || "").trim().toLowerCase());
  if (names.length !== new Set(names).size) {
    console.error(`${key}: duplicate inventory master items detected`);
    ok = false;
  }
  console.log(`${key}: ${workspace.sales.length} sales, ${workspace.inventoryTransactions.length} inventory transactions, ${workspace.wasteEvents.length} waste events, ${workspace.purchaseOrders.length} purchase orders`);
}

if (!ok) process.exit(1);
console.log("Sample dataset validation passed.");
