import { getVendorSummaryState } from "../repositories/vendorSummaryRepository.js";

const DAY = 24 * 60 * 60 * 1000;
const money = (v) => Math.round((Number(v) || 0) * 100) / 100;

const inWindow = (dateValue, start, end) => {
  const t = new Date(dateValue).getTime();
  return Number.isFinite(t) && t >= start && t < end;
};

const sum = (rows, fn) => rows.reduce((acc, row) => acc + (Number(fn(row)) || 0), 0);

export const buildBIVariance = ({ officeId, vendorId, days = 30, now = new Date() }) => {
  const state = getVendorSummaryState({ officeId, vendorId });
  const safeDays = Math.min(90, Math.max(7, Number(days) || 30));
  const end = new Date(now).getTime();
  const currentStart = end - safeDays * DAY;
  const previousStart = currentStart - safeDays * DAY;

  const sales = state.sales || [];
  const purchaseOrders = state.purchaseOrders || [];
  const wasteEvents = state.wasteEvents || [];

  const currentSales = sales.filter((x) => inWindow(x.createdAt || x.date || x.saleDate, currentStart, end));
  const previousSales = sales.filter((x) => inWindow(x.createdAt || x.date || x.saleDate, previousStart, currentStart));
  const currentPO = purchaseOrders.filter((x) => inWindow(x.orderedAt || x.createdAt || x.date || x.orderDate, currentStart, end));
  const previousPO = purchaseOrders.filter((x) => inWindow(x.orderedAt || x.createdAt || x.date || x.orderDate, previousStart, currentStart));
  const currentWaste = wasteEvents.filter((x) => inWindow(x.createdAt || x.date || x.wasteDate, currentStart, end));
  const previousWaste = wasteEvents.filter((x) => inWindow(x.createdAt || x.date || x.wasteDate, previousStart, currentStart));

  const actualRevenue = sum(currentSales, (x) => x.grandTotal ?? x.totalAmount ?? x.total ?? x.sellingPrice);
  const previousRevenue = sum(previousSales, (x) => x.grandTotal ?? x.totalAmount ?? x.total ?? x.sellingPrice);
  const actualProcurement = sum(currentPO, (x) => x.totalCost ?? x.totalAmount ?? x.amount ?? ((x.quantityOrdered || x.orderedQuantity || 0) * (x.unitCost || x.costPrice || 0)));
  const previousProcurement = sum(previousPO, (x) => x.totalCost ?? x.totalAmount ?? x.amount ?? ((x.quantityOrdered || x.orderedQuantity || 0) * (x.unitCost || x.costPrice || 0)));
  const actualWaste = sum(currentWaste, (x) => x.cost ?? x.wasteCost ?? x.totalCost ?? ((x.quantity || 0) * (x.unitCost || x.costPrice || 0)));
  const previousWasteCost = sum(previousWaste, (x) => x.cost ?? x.wasteCost ?? x.totalCost ?? ((x.quantity || 0) * (x.unitCost || x.costPrice || 0)));

  // The "plan" is a normalized prior-period operating baseline, not audited accounting data.
  // Keeping the baseline explicit makes the variance explainable and avoids inventing budgets.
  const baseline = (previous, factor = 1) => money((previous / safeDays) * safeDays * factor);
  const rows = [
    { metric: "Revenue", plan: baseline(previousRevenue, 1.05), actual: money(actualRevenue), favorableWhen: "higher" },
    { metric: "Procurement Spend", plan: baseline(previousProcurement, 1.00), actual: money(actualProcurement), favorableWhen: "lower" },
    { metric: "Waste Cost", plan: baseline(previousWasteCost, 0.90), actual: money(actualWaste), favorableWhen: "lower" },
  ].map((row) => {
    const variance = money(row.actual - row.plan);
    const favorable = row.favorableWhen === "higher" ? variance >= 0 : variance <= 0;
    const variancePct = row.plan ? money((variance / row.plan) * 100) : null;
    return { ...row, variance, variancePct, status: favorable ? "Favorable" : "Unfavorable" };
  });

  const favorable = rows.filter((r) => r.status === "Favorable").length;
  const unfavorable = rows.filter((r) => r.status === "Unfavorable").length;
  const netOperationalVariance = money(rows[0].variance - rows[1].variance - rows[2].variance);

  return {
    periodDays: safeDays,
    period: { start: new Date(currentStart).toISOString(), end: new Date(end).toISOString() },
    baselineType: "Normalized prior-period operating baseline",
    baselineNote: "Plan values are an analytical BI baseline, not audited accounting budgets. Replace with approved budgets when available.",
    rows,
    summary: { favorable, unfavorable, netOperationalVariance },
    reconciliation: {
      salesRecords: currentSales.length,
      procurementRecords: currentPO.length,
      wasteRecords: currentWaste.length,
      sourceCoverage: ["sales", "purchase_orders", "waste_events"],
    },
  };
};
