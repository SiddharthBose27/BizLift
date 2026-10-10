import { getPrisma, isPostgresEnabled } from "../utils/postgres.js";
import { readDb, writeDb } from "../utils/db.js";
import { getVendorSummaryState } from "../repositories/vendorSummaryRepository.js";
import { createEntityId } from "../utils/idFactory.js";

const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const scopeWhere = ({ officeId, vendorId }) => ({ officeId: String(officeId), vendorId: String(vendorId) });

const buildJsonMetrics = ({ officeId, vendorId }) => {
  const state = getVendorSummaryState({ officeId, vendorId });
  const inventory = Array.isArray(state.inventory) ? state.inventory : [];
  const sales = Array.isArray(state.sales) ? state.sales : [];
  const transactions = Array.isArray(state.inventoryTransactions) ? state.inventoryTransactions : [];
  const wasteEvents = Array.isArray(state.wasteEvents) ? state.wasteEvents : [];
  const purchaseOrders = Array.isArray(state.purchaseOrders) ? state.purchaseOrders : [];
  const suppliers = Array.isArray(state.suppliers) ? state.suppliers : [];

  return {
    inventoryItems: inventory.length,
    inventoryUnits: inventory.reduce((sum, row) => sum + num(row.currentStock), 0),
    lowStockItems: inventory.filter((row) => num(row.currentStock) <= num(row.minThreshold)).length,
    outOfStockItems: inventory.filter((row) => num(row.currentStock) <= 0).length,
    salesRecords: sales.length,
    inventoryTransactions: transactions.length,
    wasteEvents: wasteEvents.length,
    purchaseOrders: purchaseOrders.length,
    suppliers: suppliers.length,
    revenue: sales.reduce((sum, row) => sum + num(row.totalAmount ?? row.grandTotal ?? row.total), 0),
    wasteCost: wasteEvents.reduce((sum, row) => sum + num(row.cost ?? row.estimatedCost ?? row.totalCost ?? row.value), 0),
    procurementSpend: purchaseOrders.reduce((sum, row) => sum + num(row.totalAmount ?? row.totalCost), 0),
  };
};

const buildPostgresMetrics = async ({ officeId, vendorId }) => {
  const prisma = await getPrisma();
  const where = scopeWhere({ officeId, vendorId });
  const [inventoryItems, salesRecords, inventoryTransactions, wasteEvents, purchaseOrders, suppliers] = await Promise.all([
    prisma.inventoryItem.findMany({ where, select: { currentStock: true, minThreshold: true } }),
    prisma.sale.findMany({ where, select: { totalAmount: true, quantity: true } }),
    prisma.inventoryTransaction.count({ where }),
    prisma.wasteEvent.findMany({ where, select: { quantity: true, unitCost: true } }),
    prisma.purchaseOrder.findMany({ where, select: { totalAmount: true } }),
    prisma.supplier.count({ where: { officeId: String(officeId), vendorId: String(vendorId) } }),
  ]);

  return {
    inventoryItems: inventoryItems.length,
    inventoryUnits: inventoryItems.reduce((sum, row) => sum + num(row.currentStock), 0),
    lowStockItems: inventoryItems.filter((row) => num(row.currentStock) <= num(row.minThreshold)).length,
    outOfStockItems: inventoryItems.filter((row) => num(row.currentStock) <= 0).length,
    salesRecords: salesRecords.length,
    inventoryTransactions,
    wasteEvents: wasteEvents.length,
    purchaseOrders: purchaseOrders.length,
    suppliers,
    revenue: salesRecords.reduce((sum, row) => sum + num(row.totalAmount), 0),
    wasteCost: wasteEvents.reduce((sum, row) => sum + num(row.quantity) * num(row.unitCost), 0),
    procurementSpend: purchaseOrders.reduce((sum, row) => sum + num(row.totalAmount), 0),
  };
};

export const buildDataOverview = async (scope) => {
  const metrics = isPostgresEnabled() ? await buildPostgresMetrics(scope) : buildJsonMetrics(scope);
  const capturedAt = new Date().toISOString();
  return {
    capturedAt,
    source: isPostgresEnabled() ? "postgresql" : "json-demo",
    scope: { officeId: String(scope.officeId), vendorId: String(scope.vendorId) },
    metrics,
    metricCount: Object.keys(metrics).length,
  };
};

export const captureMetricSnapshots = async ({ scope, metrics, dimension = null }) => {
  const capturedAt = new Date();
  const rows = Object.entries(metrics || {}).map(([metricKey, metricValue]) => ({
    id: createEntityId("metric"),
    organizationId: scope.organizationId || null,
    officeId: String(scope.officeId),
    vendorId: String(scope.vendorId),
    metricKey,
    metricValue: num(metricValue),
    dimension: dimension || undefined,
    capturedAt,
  }));

  if (isPostgresEnabled()) {
    const prisma = await getPrisma();
    await prisma.dataMetricSnapshot.createMany({ data: rows });
    return { count: rows.length, capturedAt: capturedAt.toISOString(), source: "postgresql" };
  }

  const db = readDb();
  db.dataMetricSnapshots = Array.isArray(db.dataMetricSnapshots) ? db.dataMetricSnapshots : [];
  db.dataMetricSnapshots.push(...rows.map((row) => ({ ...row, metricValue: num(row.metricValue), capturedAt: row.capturedAt.toISOString() })));
  writeDb(db);
  return { count: rows.length, capturedAt: capturedAt.toISOString(), source: "json-demo" };
};

export const recordAnalyticsEvent = async ({ scope, userId, eventName, entityType = null, entityId = null, payload = null }) => {
  const event = {
    id: createEntityId("event"),
    organizationId: scope.organizationId || null,
    officeId: String(scope.officeId),
    vendorId: String(scope.vendorId),
    userId: userId || null,
    eventName: String(eventName),
    entityType,
    entityId,
    payload,
    createdAt: new Date(),
  };

  if (isPostgresEnabled()) {
    const prisma = await getPrisma();
    const saved = await prisma.analyticsEvent.create({ data: event });
    return { ...saved, createdAt: saved.createdAt.toISOString() };
  }

  const db = readDb();
  db.analyticsEvents = Array.isArray(db.analyticsEvents) ? db.analyticsEvents : [];
  const serialized = { ...event, createdAt: event.createdAt.toISOString() };
  db.analyticsEvents.push(serialized);
  writeDb(db);
  return serialized;
};

export const listAnalyticsEvents = async ({ scope, limit = 50, eventName = null }) => {
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 50));
  if (isPostgresEnabled()) {
    const prisma = await getPrisma();
    const rows = await prisma.analyticsEvent.findMany({
      where: { ...scopeWhere(scope), ...(eventName ? { eventName: String(eventName) } : {}) },
      orderBy: { createdAt: "desc" },
      take: safeLimit,
    });
    return rows;
  }

  const db = readDb();
  return (Array.isArray(db.analyticsEvents) ? db.analyticsEvents : [])
    .filter((row) => String(row.officeId) === String(scope.officeId) && String(row.vendorId) === String(scope.vendorId))
    .filter((row) => !eventName || String(row.eventName) === String(eventName))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, safeLimit);
};

export const runDataQualityChecks = async (scope) => {
  const overview = await buildDataOverview(scope);
  const checks = [
    { key: "inventory_present", passed: overview.metrics.inventoryItems > 0, severity: "warning", message: "Workspace has inventory records." },
    { key: "sales_present", passed: overview.metrics.salesRecords > 0, severity: "warning", message: "Workspace has sales records." },
    { key: "supplier_coverage", passed: overview.metrics.suppliers > 0, severity: "warning", message: "Workspace has supplier records." },
    { key: "negative_stock", passed: overview.metrics.outOfStockItems >= 0, severity: "info", message: "Stock counts are readable and normalized." },
  ];
  return {
    checkedAt: overview.capturedAt,
    source: overview.source,
    score: Math.round((checks.filter((check) => check.passed).length / checks.length) * 100),
    checks,
    scope: overview.scope,
  };
};
