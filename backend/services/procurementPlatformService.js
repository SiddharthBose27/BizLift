import { getPrisma, isPostgresEnabled } from "../utils/postgres.js";
import { getVendorSummaryState } from "../repositories/vendorSummaryRepository.js";
import { buildInventoryMetrics } from "./inventoryAnalytics.js";
import { buildProcurementIntelligence } from "./procurementIntelligence.js";
import { recordAnalyticsEvent } from "./dataPlatformService.js";
import { createEntityId } from "../utils/idFactory.js";

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const round = (v) => Number(num(v).toFixed(2));
const clean = (v) => String(v || "").trim();

const buildRows = ({ inventory, transactions }) => {
  const metrics = buildInventoryMetrics({ inventory, transactions, now: new Date() });
  return inventory.map((item) => {
    const metric = metrics.find((m) => String(m.inventoryItemId) === String(item.id)) || {};
    const stock = num(item.currentStock);
    const threshold = num(item.minThreshold);
    const daily = num(metric.avgDailyUsage30d);
    const lead = Math.max(1, num(item.leadTimeDays || metric.leadTimeDays || 3));
    const safety = Math.max(threshold * 0.35, daily * 2);
    const target = Math.max(threshold, daily * (lead + 7) + safety);
    const qty = Math.max(0, Math.ceil(target - stock));
    const urgency = stock <= 0 ? "critical" : stock <= threshold ? "high" : daily > 0 && stock / daily <= lead ? "high" : stock / Math.max(daily, 1) <= lead + 4 ? "medium" : "low";
    return {
      itemId: item.id,
      itemName: item.itemName || item.name,
      supplier: item.supplier || item.supplierName || "Unassigned",
      unit: item.unit || "unit",
      currentStock: round(stock),
      minThreshold: round(threshold),
      avgDailyUsage: round(daily),
      leadTimeDays: lead,
      recommendedOrderQty: qty,
      unitCost: round(item.costPrice),
      estimatedSpend: round(qty * num(item.costPrice)),
      urgency,
      reason: qty > 0 ? `Cover expected demand across ${lead + 7} days plus safety stock.` : "Stock position is currently adequate.",
    };
  }).filter((row) => row.recommendedOrderQty > 0).sort((a, b) => ({ critical: 0, high: 1, medium: 2, low: 3 }[a.urgency] - { critical: 0, high: 1, medium: 2, low: 3 }[b.urgency]) || b.estimatedSpend - a.estimatedSpend);
};

const jsonCockpit = ({ officeId, vendorId }) => {
  const state = getVendorSummaryState({ officeId, vendorId });
  const rows = buildRows({ inventory: state.inventory, transactions: state.inventoryTransactions });
  const intelligence = buildProcurementIntelligence({ inventory: state.inventory, purchaseOrders: state.purchaseOrders, suppliers: state.suppliers, procurementRows: rows.map((r) => ({ ...r, costPrice: r.unitCost, avgDailyUsage: r.avgDailyUsage, reorderNeeded: true, procurementPriority: r.urgency[0].toUpperCase() + r.urgency.slice(1) })) });
  const totalSpend = rows.reduce((s, r) => s + r.estimatedSpend, 0);
  const critical = rows.filter((r) => r.urgency === "critical").length;
  const high = rows.filter((r) => r.urgency === "high").length;
  return { source: "json-demo", generatedAt: new Date().toISOString(), summary: { recommendations: rows.length, critical, high, estimatedSpend: round(totalSpend) }, recommendations: intelligence.recommendations, supplierScorecards: intelligence.supplierPerformance, purchaseOrders: state.purchaseOrders.slice(0, 25) };
};

const postgresCockpit = async ({ officeId, vendorId }) => {
  const prisma = await getPrisma();
  const scope = { officeId: String(officeId), vendorId: String(vendorId) };
  const [inventory, transactions, suppliers, purchaseOrders] = await Promise.all([
    prisma.inventoryItem.findMany({ where: scope }),
    prisma.inventoryTransaction.findMany({ where: scope, orderBy: { createdAt: "desc" }, take: 500 }),
    prisma.supplier.findMany({ where: { officeId: String(officeId), vendorId: String(vendorId) } }),
    prisma.purchaseOrder.findMany({ where: scope, include: { supplier: true, items: true }, orderBy: { createdAt: "desc" }, take: 25 }),
  ]);
  const rows = buildRows({ inventory: inventory.map((x) => ({ ...x, itemName: x.name, supplier: x.supplierName })), transactions });
  const supplierScorecards = suppliers.map((s) => ({ supplier: s.name, linkedItems: inventory.filter((i) => i.supplierName === s.name).length, avgLeadTimeDays: round(s.leadTimeDays), reliabilityScore: round(s.reliability), risk: num(s.reliability) < 60 ? "High" : num(s.reliability) < 80 ? "Medium" : "Low" }));
  const totalSpend = rows.reduce((s, r) => s + r.estimatedSpend, 0);
  return { source: "postgresql", generatedAt: new Date().toISOString(), summary: { recommendations: rows.length, critical: rows.filter((r) => r.urgency === "critical").length, high: rows.filter((r) => r.urgency === "high").length, estimatedSpend: round(totalSpend) }, recommendations: rows, supplierScorecards, purchaseOrders };
};

export const getProcurementCockpit = async (scope) => isPostgresEnabled() ? postgresCockpit(scope) : jsonCockpit(scope);

export const createProcurementOrder = async ({ officeId, vendorId, organizationId = null, userId = null, items = [] }) => {
  if (!items.length) throw new Error("At least one procurement item is required.");
  if (!isPostgresEnabled()) {
    const { createPurchaseOrders } = await import("./procurementIntelligence.js");
    return { source: "json-demo", orders: createPurchaseOrders({ officeId, vendorId, items }) };
  }
  const prisma = await getPrisma();
  const cleanItems = items.filter((item) => num(item.quantity || item.recommendedOrderQty) > 0).map((item) => ({ ...item, quantity: num(item.quantity || item.recommendedOrderQty), unitCost: num(item.unitCost ?? item.costPrice) }));
  if (!cleanItems.length) throw new Error("Procurement quantities must be greater than zero.");
  const result = await prisma.$transaction(async (tx) => {
    const supplierName = clean(items[0].supplier || items[0].recommendedSupplier) || "Unassigned Supplier";
    let supplier = await tx.supplier.findFirst({ where: { officeId: String(officeId), vendorId: String(vendorId), name: supplierName } });
    if (!supplier) supplier = await tx.supplier.create({ data: { id: createEntityId("supplier"), organizationId, officeId: String(officeId), vendorId: String(vendorId), name: supplierName } });
    const total = cleanItems.reduce((s, i) => s + i.quantity * i.unitCost, 0);
    const maxLead = Math.max(...cleanItems.map((i) => num(i.leadTimeDays) || num(supplier.leadTimeDays) || 3));
    const order = await tx.purchaseOrder.create({ data: { id: createEntityId("po"), officeId: String(officeId), vendorId: String(vendorId), supplierId: supplier.id, status: "draft", totalAmount: total, expectedDate: new Date(Date.now() + maxLead * 86400000), items: { create: cleanItems.map((i) => ({ id: createEntityId("poi"), inventoryItemId: String(i.itemId), quantity: i.quantity, unitCost: i.unitCost })) } }, include: { supplier: true, items: true } });
    return order;
  });
  await recordAnalyticsEvent({ scope: { organizationId, officeId, vendorId }, userId, eventName: "procurement.order_created", entityType: "purchase_order", entityId: result.id, payload: { totalAmount: Number(result.totalAmount), itemCount: result.items.length } });
  return { source: "postgresql", order: result };
};

export const approveProcurementOrder = async ({ officeId, vendorId, orderId, userId = null, organizationId = null }) => {
  if (!isPostgresEnabled()) throw new Error("Purchase-order approval requires PostgreSQL mode in Batch 18.");
  const prisma = await getPrisma();
  const order = await prisma.purchaseOrder.findFirst({ where: { id: String(orderId), officeId: String(officeId), vendorId: String(vendorId) } });
  if (!order) throw new Error("Purchase order not found.");
  if (!["draft", "submitted"].includes(order.status)) throw new Error(`Purchase order cannot be approved from ${order.status}.`);
  const updated = await prisma.purchaseOrder.update({ where: { id: order.id }, data: { status: "approved" }, include: { supplier: true, items: true } });
  await recordAnalyticsEvent({ scope: { organizationId, officeId, vendorId }, userId, eventName: "procurement.order_approved", entityType: "purchase_order", entityId: updated.id, payload: { totalAmount: Number(updated.totalAmount) } });
  return updated;
};
