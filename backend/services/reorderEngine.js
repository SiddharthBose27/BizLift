/**
 * server/services/reorderEngine.js (Batch 2)
 * Isolates reorder prioritization from raw analytics.
 */

import { roundValue, safeNumber } from "./inventoryAnalytics.js";

export const deriveUrgency = ({
  currentStock,
  minThreshold,
  daysRemaining,
  avgDailyUsage30,
}) => {
  if (currentStock <= 0) return "critical";
  if (daysRemaining !== null && daysRemaining <= 2) return "critical";
  if (currentStock <= minThreshold) return "high";
  if (daysRemaining !== null && daysRemaining <= 5) return "high";
  if (avgDailyUsage30 > 0 && daysRemaining !== null && daysRemaining <= 10) {
    return "medium";
  }
  return "low";
};

export const estimateRecommendedOrderQty = ({
  currentStock,
  avgDailyUsage30,
  minThreshold,
}) => {
  const targetCoverageDays = 7;
  const usageDrivenQty =
    avgDailyUsage30 > 0 ? avgDailyUsage30 * targetCoverageDays : 0;
  const thresholdGap = Math.max(0, minThreshold - currentStock);
  const recommended = Math.max(usageDrivenQty, thresholdGap);

  return roundValue(recommended > 0 ? recommended : 0);
};

export const buildReorderSuggestion = ({ item, metrics }) => {
  const currentStock = safeNumber(item.currentStock);
  const minThreshold = safeNumber(item.minThreshold ?? item.lowStockThreshold);

  const urgency = deriveUrgency({
    currentStock,
    minThreshold,
    daysRemaining: metrics.daysRemaining,
    avgDailyUsage30: metrics.avgDailyUsage30d,
  });

  const recommendedOrderQty = estimateRecommendedOrderQty({
    currentStock,
    avgDailyUsage30: metrics.avgDailyUsage30d,
    minThreshold,
  });

  const shouldReorder =
    urgency === "critical" ||
    urgency === "high" ||
    (urgency === "medium" && recommendedOrderQty > 0);

  return {
    inventoryItemId: item.id,
    inventoryItemName: item.itemName || item.name,
    category: item.category || "Uncategorized",
    supplier: item.supplier || "Unassigned",
    unit: item.unit || "",
    currentStock: roundValue(currentStock),
    minThreshold: roundValue(minThreshold),
    avgDailyUsage30d: metrics.avgDailyUsage30d,
    consumption7d: metrics.consumption7d,
    consumption30d: metrics.consumption30d,
    daysRemaining: metrics.daysRemaining,
    velocity: metrics.velocity,
    urgency,
    shouldReorder,
    recommendedOrderQty,
    reason:
      urgency === "critical"
        ? "Stock is critically low based on current stock or coverage."
        : urgency === "high"
          ? "Stock is below threshold or close to stockout."
          : urgency === "medium"
            ? "Stock is moving and should be watched for reorder."
            : "Stock position is healthy.",
  };
};
