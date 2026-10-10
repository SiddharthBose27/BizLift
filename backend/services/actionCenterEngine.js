/**
 * server/services/actionCenterEngine.js (Batch 3)
 * Logic for generating prioritized alerts (stockout, reorder, dead stock, supplier risk).
 */

export const buildActionCenterAlerts = ({
  metrics,
  reorderSuggestions,
  suppliers,
  expiryMetrics = [],
}) => {
  const alerts = [];

  // Expiry / waste risk alerts
  for (const item of expiryMetrics) {
    if (item.expirySeverity === "expired") {
      alerts.push({
        type: "danger",
        priority: "Critical",
        severity: "high",
        title: `Expired stock: ${item.inventoryItemName}`,
        detail: `${item.currentStock} ${item.unit} already expired. Dispose immediately.`,
        message: `${item.currentStock} ${item.unit} already expired`,
        category: "expired_stock",
      });
      continue;
    }

    if (item.expirySeverity === "critical" || item.wasteRiskLevel === "high") {
      alerts.push({
        type: "danger",
        priority: "High",
        severity: "high",
        title: `Expiry risk: ${item.inventoryItemName}`,
        detail: `${item.daysUntilExpiry} day(s) left. Estimated waste risk: ${item.estimatedWasteRiskQty} ${item.unit}.`,
        message: `${item.daysUntilExpiry} day(s) left, risk ${item.estimatedWasteRiskQty} ${item.unit}`,
        category: "expiry_risk",
      });
    }
  }

  // 1. Critical stock alerts
  for (const item of metrics) {
    if (item.stockCoverageStatus === "critical") {
      alerts.push({
        type: "danger",
        priority: "Critical",
        severity: "high",
        title: `Stockout risk: ${item.inventoryItemName}`,
        detail: `Only ${item.daysRemaining ?? "?"} days remaining before stockout.`,
        message: `Only ${item.daysRemaining ?? "?"} days remaining`,
        category: "stockout_risk",
      });
    }
  }

  // 2. Reorder alerts
  for (const item of reorderSuggestions.slice(0, 5)) {
    alerts.push({
      type: item.urgency === "critical" ? "danger" : "warning",
      priority: item.urgency === "critical" ? "Critical" : "High",
      severity: item.urgency === "critical" ? "high" : "medium",
      title: `Reorder ${item.inventoryItemName}`,
      detail: `${item.inventoryItemName} is ${item.urgency} and needs replenishment. Recommended qty: ${item.recommendedOrderQty} ${item.unit}.`,
      message: `Recommended qty: ${item.recommendedOrderQty}`,
      category: "reorder",
    });
  }

  // 3. Dead stock alerts
  for (const item of metrics) {
    if (
      item.velocity === "idle" &&
      item.currentStock > 0 &&
      item.daysSinceLastConsumption > 7
    ) {
      alerts.push({
        type: "info",
        priority: "Medium",
        severity: "low",
        title: `Dead stock: ${item.inventoryItemName}`,
        detail: `No usage in ${item.daysSinceLastConsumption} days. Consider reducing stock or re-evaluating ordering.`,
        message: `No usage in ${item.daysSinceLastConsumption} days`,
        category: "dead_stock",
      });
    }
  }

  // 4. Supplier risk alerts
  for (const supplier of suppliers.slice(0, 3)) {
    if (supplier.riskLevel === "high") {
      alerts.push({
        type: "danger",
        priority: "High",
        severity: "high",
        title: `Supplier risk: ${supplier.supplier}`,
        detail: `High risk detected for ${supplier.supplier} with ${supplier.criticalItems} critical items.`,
        message: `${supplier.criticalItems} critical items`,
        category: "supplier_risk",
      });
    }
  }

  // Map to common structure for DashboardPage compatibility if needed
  const result = alerts.map((alert, idx) => ({
    ...alert,
    actionKey: `${alert.category}-${idx}`,
    state: "active",
  }));

  const severityRank = {
    high: 3,
    medium: 2,
    low: 1,
  };

  result.sort((a, b) => {
    const severityRankA = severityRank[a.severity] || 0;
    const severityRankB = severityRank[b.severity] || 0;
    const severityDiff = severityRankB - severityRankA;

    if (severityDiff !== 0) return severityDiff;

    return String(a.title || "").localeCompare(String(b.title || ""));
  });

  return result.slice(0, 20);
};
