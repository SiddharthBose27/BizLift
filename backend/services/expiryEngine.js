/**
 * server/services/expiryEngine.js (Batch 8)
 * Logic for expiry window detection, severity classification, and stock-at-risk analysis.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const normalizeDate = (value) => {
  const date = value ? new Date(value) : null;
  return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
};

const roundValue = (value, precision = 2) => {
  const factor = 10 ** precision;
  return Math.round((Number(value || 0) + Number.EPSILON) * factor) / factor;
};

export const getDaysUntilExpiry = (expiryDate, now = new Date()) => {
  const expiry = normalizeDate(expiryDate);
  if (!expiry) return null;

  const diff = expiry.getTime() - now.getTime();
  return Math.ceil(diff / MS_PER_DAY);
};

export const classifyExpirySeverity = (daysUntilExpiry) => {
  if (daysUntilExpiry === null) return "none";
  if (daysUntilExpiry < 0) return "expired";
  if (daysUntilExpiry <= 1) return "critical";
  if (daysUntilExpiry <= 3) return "high";
  if (daysUntilExpiry <= 7) return "medium";
  return "low";
};

export const buildExpiryMetrics = ({
  inventory,
  itemMetrics = [],
  now = new Date(),
}) => {
  const metricsMap = new Map(
    itemMetrics.map((item) => [String(item.inventoryItemId), item]),
  );

  return inventory
    .map((item) => {
      const daysUntilExpiry = getDaysUntilExpiry(item.expiryDate, now);
      const expirySeverity = classifyExpirySeverity(daysUntilExpiry);
      const usageMetrics = metricsMap.get(String(item.id));

      const currentStock = Number(item.currentStock || 0);
      const avgDailyUsage30d = Number(usageMetrics?.avgDailyUsage30d || 0);

      const expectedUsageBeforeExpiry =
        daysUntilExpiry !== null && daysUntilExpiry > 0
          ? roundValue(avgDailyUsage30d * daysUntilExpiry)
          : 0;

      const estimatedWasteRiskQty =
        daysUntilExpiry !== null && daysUntilExpiry > 0
          ? roundValue(Math.max(0, currentStock - expectedUsageBeforeExpiry))
          : currentStock > 0 && expirySeverity === "expired"
            ? roundValue(currentStock)
            : 0;

      const wasteRiskLevel =
        expirySeverity === "expired"
          ? "critical"
          : estimatedWasteRiskQty > 0 &&
              daysUntilExpiry !== null &&
              daysUntilExpiry <= 3
            ? "high"
            : estimatedWasteRiskQty > 0 &&
                daysUntilExpiry !== null &&
                daysUntilExpiry <= 7
              ? "medium"
              : "low";

      return {
        inventoryItemId: item.id,
        inventoryItemName: item.name || item.itemName,
        category: item.category || "Uncategorized",
        supplier: item.supplier || "Unassigned",
        unit: item.unit || "",
        currentStock: roundValue(currentStock),
        expiryDate: item.expiryDate || null,
        daysUntilExpiry,
        expirySeverity,
        avgDailyUsage30d: roundValue(avgDailyUsage30d),
        expectedUsageBeforeExpiry,
        estimatedWasteRiskQty,
        wasteRiskLevel,
      };
    })
    .filter((item) => item.expiryDate);
};

export const buildExpirySummary = ({ expiryMetrics }) => {
  return {
    totalTrackedExpiryItems: expiryMetrics.length,
    expiredItems: expiryMetrics.filter((item) => item.expirySeverity === "expired")
      .length,
    criticalExpiryItems: expiryMetrics.filter(
      (item) => item.expirySeverity === "critical",
    ).length,
    highExpiryItems: expiryMetrics.filter(
      (item) => item.expirySeverity === "high",
    ).length,
    mediumExpiryItems: expiryMetrics.filter(
      (item) => item.expirySeverity === "medium",
    ).length,
    wasteRiskItems: expiryMetrics.filter(
      (item) =>
        item.wasteRiskLevel === "critical" || item.wasteRiskLevel === "high",
    ).length,
  };
};
