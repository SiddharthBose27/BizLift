// server/services/dashboardIntelligence.js

const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getTopAiSignal = ({
  alerts = [],
  reorderSuggestions = [],
  expirySummary = {},
  wasteSummary = {},
  supplierAnalytics = [],
}) => {
  const highSeverityAlert = alerts.find((alert) => alert.severity === "high");
  if (highSeverityAlert) {
    return {
      type: highSeverityAlert.type,
      title: highSeverityAlert.title,
      message: highSeverityAlert.message,
      severity: highSeverityAlert.severity,
    };
  }

  const criticalReorder = reorderSuggestions.find(
    (item) => item.urgency === "critical",
  );
  if (criticalReorder) {
    return {
      type: "critical_reorder",
      title: `Urgent reorder: ${criticalReorder.inventoryItemName}`,
      message: criticalReorder.reason,
      severity: "high",
    };
  }

  const highRiskSupplier = supplierAnalytics.find(
    (supplier) => supplier.riskLevel === "high",
  );
  if (highRiskSupplier) {
    return {
      type: "supplier_risk",
      title: `Supplier risk: ${highRiskSupplier.supplier}`,
      message: `${highRiskSupplier.criticalItems || 0} critical linked item(s).`,
      severity: "medium",
    };
  }

  if (safeNumber(expirySummary.wasteRiskItems) > 0) {
    return {
      type: "expiry_risk",
      title: "Expiry risk detected",
      message: `${expirySummary.wasteRiskItems} item(s) at high waste risk.`,
      severity: "medium",
    };
  }

  if (safeNumber(wasteSummary.wasteEvents7d) > 0) {
    return {
      type: "waste_signal",
      title: "Waste detected this week",
      message: `${wasteSummary.wasteEvents7d} waste event(s) recorded in the last 7 days.`,
      severity: "medium",
    };
  }

  return {
    type: "healthy",
    title: "Operations stable",
    message: "No critical operational risks detected right now.",
    severity: "low",
  };
};

const computeHealthScore = ({
  lowStockItems = 0,
  outOfStockItems = 0,
  criticalCoverageItems = 0,
  expiredItems = 0,
  criticalExpiryItems = 0,
  wasteEvents7d = 0,
  highRiskSuppliers = 0,
  highSeverityAlerts = 0,
}) => {
  let score = 100;

  score -= safeNumber(lowStockItems) * 2;
  score -= safeNumber(outOfStockItems) * 8;
  score -= safeNumber(criticalCoverageItems) * 5;
  score -= safeNumber(expiredItems) * 8;
  score -= safeNumber(criticalExpiryItems) * 4;
  score -= safeNumber(wasteEvents7d) * 2;
  score -= safeNumber(highRiskSuppliers) * 4;
  score -= safeNumber(highSeverityAlerts) * 3;

  return clamp(Math.round(score), 0, 100);
};

export const summarizeDashboard = ({
  inventory = [],
  itemMetrics = [],
  reorderSuggestions = [],
  supplierAnalytics = [],
  alerts = [],
  wasteAnalytics = {},
  expiryAnalytics = {},
  salesAnalytics = {},
}) => {
  const inventoryValue = inventory.reduce((sum, item) => {
    return sum + safeNumber(item.currentStock) * safeNumber(item.costPrice);
  }, 0);

  const lowStockItems = inventory.filter((item) => String(item.status || "").toLowerCase() === "low stock").length;
  const outOfStockItems = inventory.filter(
    (item) => String(item.status || "").toLowerCase() === "out of stock" || Number(item.currentStock) === 0,
  ).length;
  const criticalCoverageItems = itemMetrics.filter(
    (item) => item.stockCoverageStatus === "critical",
  ).length;
  const highRiskSuppliers = supplierAnalytics.filter(
    (supplier) => supplier.riskLevel === "high",
  ).length;
  const highSeverityAlerts = alerts.filter(
    (alert) => alert.severity === "high",
  ).length;

  const inventorySummary = {
    totalItems: inventory.length,
    lowStockItems,
    outOfStockItems,
    expiringItems:
      safeNumber(expiryAnalytics.summary?.criticalExpiryItems) +
      safeNumber(expiryAnalytics.summary?.highExpiryItems),
    inventoryValue: Number(inventoryValue.toFixed(2)),
  };

  const demandSummary = {
    totalSalesEvents: safeNumber(salesAnalytics.summary?.totalSalesEvents),
    quantityLast7d: safeNumber(salesAnalytics.summary?.quantityLast7d),
    topSellingRecipes: salesAnalytics.topSellingRecipes || [],
  };

  const operationalSummary = {
    reorderCount: reorderSuggestions.length,
    highPriorityReorders: reorderSuggestions.filter(
      (item) => item.urgency === "critical" || item.urgency === "high",
    ).length,
    alertCount: alerts.length,
    highSeverityAlerts,
    supplierRiskCount: highRiskSuppliers,
    wasteEvents7d: safeNumber(wasteAnalytics.summary?.wasteEvents7d),
    wasteCost7d: safeNumber(wasteAnalytics.summary?.wasteCost7d),
  };

  const healthScore = computeHealthScore({
    lowStockItems,
    outOfStockItems,
    criticalCoverageItems,
    expiredItems: safeNumber(expiryAnalytics.summary?.expiredItems),
    criticalExpiryItems: safeNumber(expiryAnalytics.summary?.criticalExpiryItems),
    wasteEvents7d: safeNumber(wasteAnalytics.summary?.wasteEvents7d),
    highRiskSuppliers,
    highSeverityAlerts,
  });

  const topAiSignal = getTopAiSignal({
    alerts,
    reorderSuggestions,
    expirySummary: expiryAnalytics.summary || {},
    wasteSummary: wasteAnalytics.summary || {},
    supplierAnalytics,
  });

  return {
    healthScore,
    topAiSignal,
    inventorySummary,
    demandSummary,
    operationalSummary,
  };
};
