/**
 * server/services/inventoryAnalytics.js (Batch 2)
 * Computation layer for consumption windows, usage, and velocity.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const roundValue = (value, precision = 2) => {
  const factor = 10 ** precision;
  return Math.round((Number(value || 0) + Number.EPSILON) * factor) / factor;
};

export const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const normalizeDate = (value) => {
  const date = value ? new Date(value) : null;
  return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
};

export const daysBetween = (from, to) => {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / MS_PER_DAY));
};

export const isOutboundConsumptionTransaction = (txn) => {
  return txn?.direction === "out" && txn?.type === "sale_deduction";
};

export const sumConsumptionInWindow = ({
  transactions,
  inventoryItemId,
  now,
  days,
}) => {
  const cutoff = new Date(now.getTime() - days * MS_PER_DAY);

  return transactions
    .filter((txn) => String(txn.inventoryItemId) === String(inventoryItemId))
    .filter((txn) => isOutboundConsumptionTransaction(txn))
    .filter((txn) => {
      const createdAt = normalizeDate(txn.createdAt || txn.timestamp);
      return createdAt && createdAt >= cutoff && createdAt <= now;
    })
    .reduce((sum, txn) => sum + safeNumber(txn.quantity), 0);
};

export const getLastConsumptionDate = ({ transactions, inventoryItemId }) => {
  const relevant = transactions
    .filter((txn) => String(txn.inventoryItemId) === String(inventoryItemId))
    .filter((txn) => isOutboundConsumptionTransaction(txn))
    .map((txn) => normalizeDate(txn.createdAt || txn.timestamp))
    .filter(Boolean)
    .sort((a, b) => b.getTime() - a.getTime());

  return relevant[0] || null;
};

export const classifyVelocity = ({ avgDailyUsage30 }) => {
  if (avgDailyUsage30 >= 10) return "fast";
  if (avgDailyUsage30 >= 3) return "medium";
  if (avgDailyUsage30 > 0) return "slow";
  return "idle";
};

export const estimateDaysRemaining = ({ currentStock, avgDailyUsage30 }) => {
  if (avgDailyUsage30 <= 0) return null;
  return roundValue(currentStock / avgDailyUsage30, 1);
};

export const buildInventoryItemMetrics = ({
  item,
  transactions,
  now = new Date(),
}) => {
  const currentStock = safeNumber(item.currentStock);
  const minThreshold = safeNumber(item.minThreshold ?? item.lowStockThreshold);

  const consumption7d = roundValue(
    sumConsumptionInWindow({
      transactions,
      inventoryItemId: item.id,
      now,
      days: 7,
    }),
  );

  const consumption30d = roundValue(
    sumConsumptionInWindow({
      transactions,
      inventoryItemId: item.id,
      now,
      days: 30,
    }),
  );

  const avgDailyUsage7d = roundValue(consumption7d / 7);
  const avgDailyUsage30d = roundValue(consumption30d / 30);

  const daysRemaining = estimateDaysRemaining({
    currentStock,
    avgDailyUsage30: avgDailyUsage30d,
  });

  const lastConsumptionDate = getLastConsumptionDate({
    transactions,
    inventoryItemId: item.id,
  });

  const daysSinceLastConsumption = lastConsumptionDate
    ? daysBetween(lastConsumptionDate, now)
    : null;

  const velocity = classifyVelocity({ avgDailyUsage30: avgDailyUsage30d });

  const stockCoverageStatus =
    daysRemaining === null
      ? "unknown"
      : daysRemaining <= 2
        ? "critical"
        : daysRemaining <= 5
          ? "low"
          : daysRemaining <= 10
            ? "watch"
            : "healthy";

  return {
    inventoryItemId: item.id,
    inventoryItemName: item.itemName || item.name,
    category: item.category || "Uncategorized",
    supplier: item.supplier || "Unassigned",
    unit: item.unit || "",
    currentStock: roundValue(currentStock),
    minThreshold: roundValue(minThreshold),
    consumption7d,
    consumption30d,
    avgDailyUsage7d,
    avgDailyUsage30d,
    daysRemaining,
    velocity,
    stockCoverageStatus,
    lastConsumptionDate: lastConsumptionDate
      ? lastConsumptionDate.toISOString()
      : null,
    daysSinceLastConsumption,
  };
};

export const buildInventoryMetrics = ({
  inventory,
  transactions,
  now = new Date(),
}) => {
  return inventory.map((item) =>
    buildInventoryItemMetrics({
      item,
      transactions,
      now,
    }),
  );
};

export const buildIntelligenceSummary = ({ inventory, metrics }) => {
  return {
    totalItems: metrics.length,
    fastMovingItems: metrics.filter((item) => item.velocity === "fast").length,
    stockoutRiskItems: metrics.filter(
      (item) =>
        item.stockCoverageStatus === "critical" ||
        item.stockCoverageStatus === "low",
    ).length,
    idleItems: metrics.filter((item) => item.velocity === "idle").length,
    averageDaysRemaining: metrics.length
      ? Number(
          (
            metrics
              .filter((item) => item.daysRemaining !== null)
              .reduce((sum, item) => sum + item.daysRemaining, 0) /
            Math.max(
              1,
              metrics.filter((item) => item.daysRemaining !== null).length,
            )
          ).toFixed(1),
        )
      : null,
  };
};
