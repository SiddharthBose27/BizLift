import express from "express";
import crypto from "node:crypto";
import { requireAuth } from "../middleware/requireAuth.js";
import { getPrisma } from "../utils/postgres.js";
import { parseCsv, parseXlsx } from "../utils/spreadsheet.js";
import { ensureWorkspace } from "../services/workspaceService.js";
import { getInventoryState } from "../repositories/inventoryRepository.js";
import { getNextInventoryId, createInventoryItemRecord } from "../services/inventoryService.js";
import { publishRealtimeEvent } from "../services/realtimeEventService.js";

const router = express.Router();
const makeId = (prefix) => `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`;
const orgAdminRoles = new Set(["organization_admin", "org_admin", "office_admin", "owner", "admin"]);
const platformAdminRoles = new Set(["super_admin", "platform_admin"]);
const clean = (value) => String(value ?? "").trim();
const numeric = (value, fallback = 0) => {
  if (value === undefined || value === null || String(value).trim() === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : NaN;
};

router.use(requireAuth);

router.post("/inventory", async (req, res) => {
  const prisma = await getPrisma();
  if (!prisma) return res.status(503).json({ success: false, message: "Spreadsheet imports require PostgreSQL mode." });
  const user = req.auth.user;
  const role = String(user.role || "").toLowerCase();
  if (!orgAdminRoles.has(role) && !platformAdminRoles.has(role)) return res.status(403).json({ success: false, message: "Organization administrator access is required to import inventory." });
  const fileName = clean(req.body?.fileName);
  const encoded = clean(req.body?.contentBase64);
  if (!fileName || !encoded) return res.status(400).json({ success: false, message: "Choose a CSV or Excel workbook to import." });
  if (!/\.(csv|xlsx)$/i.test(fileName)) return res.status(415).json({ success: false, message: "Supported formats are .csv and .xlsx." });
  if (encoded.length > 8_000_000) return res.status(413).json({ success: false, message: "File is too large. Keep imports under 6 MB." });
  const officeId = clean(req.body?.officeId);
  const vendorId = clean(req.body?.vendorId);
  if (!officeId || !vendorId) return res.status(400).json({ success: false, message: "Select both a location and outlet." });
  const outlet = await prisma.vendor.findFirst({ where: { id: vendorId, officeId, ...(platformAdminRoles.has(role) ? {} : { office: { is: { organizationId: user.organizationId } } }) }, include: { office: true } });
  if (!outlet) return res.status(404).json({ success: false, message: "That outlet is not available within your organization." });
  let rows;
  try {
    const buffer = Buffer.from(encoded, "base64");
    rows = /\.csv$/i.test(fileName) ? parseCsv(buffer.toString("utf8")) : parseXlsx(buffer);
  } catch (error) {
    return res.status(400).json({ success: false, message: `Could not read this spreadsheet: ${error.message}` });
  }
  if (!rows.length) return res.status(400).json({ success: false, message: "The first worksheet needs a header row and at least one data row." });
  if (rows.length > 1000) return res.status(400).json({ success: false, message: "Import up to 1,000 inventory rows per file." });
  const requiredHeaders = ["name", "unit"];
  const headers = Object.keys(rows[0] || {});
  const missing = requiredHeaders.filter((header) => !headers.includes(header));
  if (missing.length) return res.status(400).json({ success: false, message: `Missing required column(s): ${missing.join(", ")}.` });
  const existing = await prisma.inventoryItem.findMany({ where: { vendorId: outlet.id }, select: { name: true } });
  const names = new Set(existing.map((item) => item.name.trim().toLowerCase()));
  const accepted = [], skipped = [], invalid = [];
  rows.forEach((row, index) => {
    const name = clean(row.name), unit = clean(row.unit);
    const rowNumber = index + 2;
    if (!name || !unit) { invalid.push({ row: rowNumber, reason: "name and unit are required" }); return; }
    if (names.has(name.toLowerCase())) { skipped.push({ row: rowNumber, name, reason: "item name already exists in this outlet" }); return; }
    const currentStock = numeric(row.current_stock ?? row.currentstock, 0);
    const minThreshold = numeric(row.min_threshold ?? row.minthreshold, 0);
    const costPrice = numeric(row.cost_price ?? row.costprice, 0);
    const sellingPrice = numeric(row.selling_price ?? row.sellingprice, 0);
    if ([currentStock, minThreshold, costPrice, sellingPrice].some(Number.isNaN)) { invalid.push({ row: rowNumber, reason: "stock and price fields must be non-negative numbers" }); return; }
    let expiryDate = null;
    const expiry = clean(row.expiry_date ?? row.expirydate);
    if (expiry) { const parsed = new Date(expiry); if (Number.isNaN(parsed.getTime())) { invalid.push({ row: rowNumber, reason: "expiry_date must be a valid date" }); return; } expiryDate = parsed; }
    const status = currentStock <= 0 ? "out" : currentStock <= minThreshold ? "low" : "healthy";
    accepted.push({ id: makeId("item"), officeId: outlet.officeId, vendorId: outlet.id, name, unit, category: clean(row.category) || null, currentStock, minThreshold, costPrice, sellingPrice, supplierName: clean(row.supplier_name ?? row.suppliername) || null, expiryDate, status });
    names.add(name.toLowerCase());
  });
  if (accepted.length) await prisma.inventoryItem.createMany({ data: accepted, skipDuplicates: true });

  // Keep the existing POS/analytics operational store in sync with onboarding imports.
  // The legacy workspace engine currently persists to its workspace store separately
  // from the organization registry's Prisma tables.
  ensureWorkspace({ officeId: outlet.officeId, vendorId: outlet.id });
  const operationalState = getInventoryState({ officeId: outlet.officeId, vendorId: outlet.id });
  const operationalNames = new Set(operationalState.inventory.map((item) => String(item.itemName || item.name || "").trim().toLowerCase()));
  let operationalImported = 0;
  for (const row of accepted) {
    if (operationalNames.has(row.name.trim().toLowerCase())) continue;
    const statusLabel = Number(row.currentStock) <= 0 ? "Out of Stock" : Number(row.currentStock) <= Number(row.minThreshold) ? "Low Stock" : "In Stock";
    createInventoryItemRecord({
      id: getNextInventoryId({ officeId: outlet.officeId, vendorId: outlet.id }),
      itemName: row.name, name: row.name, officeId: outlet.officeId, vendorId: outlet.id,
      category: row.category || "General", unit: row.unit, currentStock: Number(row.currentStock),
      minThreshold: Number(row.minThreshold), costPrice: Number(row.costPrice), sellingPrice: Number(row.sellingPrice),
      supplier: row.supplierName || "Unknown Supplier", expiryDate: row.expiryDate ? new Date(row.expiryDate).toISOString().slice(0, 10) : "",
      status: statusLabel, lastUpdated: new Date().toISOString().slice(0, 10), lastUpdatedAt: new Date().toISOString(),
    }, { officeId: outlet.officeId, vendorId: outlet.id });
    operationalNames.add(row.name.trim().toLowerCase());
    operationalImported += 1;
  }
  if (operationalImported) {
    const { saveInventoryState } = await import("../repositories/inventoryRepository.js");
    saveInventoryState(operationalState.db);
  }
  await prisma.auditEvent.create({ data: { id: makeId("audit"), organizationId: outlet.office.organizationId, officeId: outlet.officeId, vendorId: outlet.id, eventType: "data_import", action: "inventory.imported", resourceType: "inventory", resourceId: outlet.id, userId: user.id, status: "success", metadata: { fileName, rowsRead: rows.length, imported: accepted.length, operationalImported, skipped: skipped.length, invalid: invalid.length } } }).catch(() => {});
  if (accepted.length) publishRealtimeEvent({ scope: { officeId: outlet.officeId, vendorId: outlet.id, organizationId: outlet.office.organizationId }, event: { eventName: "inventory.imported", entityType: "inventory", entityId: outlet.id, occurredAt: new Date().toISOString(), officeId: outlet.officeId, vendorId: outlet.id, importedCount: accepted.length, inventoryChanged: true } });
  return res.status(200).json({ success: true, data: { rowsRead: rows.length, imported: accepted.length, operationalImported, skipped, invalid }, message: `Imported ${accepted.length} item(s); ${operationalImported} connected to the POS workspace. ${skipped.length} duplicate(s) skipped; ${invalid.length} invalid row(s) need attention.` });
});

export default router;
