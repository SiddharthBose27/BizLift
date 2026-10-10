/**
 * server/services/supplierAnalytics.js (Batch 3)
 * Aggregates inventory + metrics into supplier-level intelligence.
 */

import { safeNumber } from "./inventoryAnalytics.js";

export const buildSupplierAnalytics = ({ inventory, metrics }) => {
  const supplierMap = new Map();

  for (const item of inventory) {
    const supplier = item.supplier || "Unassigned";

    if (!supplierMap.has(supplier)) {
      supplierMap.set(supplier, {
        supplier,
        totalItems: 0,
        totalStockValue: 0,
        criticalItems: 0,
        lowStockItems: 0,
        fastMovingItems: 0,
        dependencyScore: 0,
      });
    }

    const entry = supplierMap.get(supplier);
    const itemMetrics = metrics.find(
      (m) => String(m.inventoryItemId) === String(item.id),
    );

    entry.totalItems += 1;

    const stock = safeNumber(item.currentStock);
    const price = safeNumber(item.costPrice);
    entry.totalStockValue += stock * price;

    if (!itemMetrics) continue;

    if (itemMetrics.stockCoverageStatus === "critical") {
      entry.criticalItems += 1;
    }

    if (itemMetrics.stockCoverageStatus === "low") {
      entry.lowStockItems += 1;
    }

    if (itemMetrics.velocity === "fast") {
      entry.fastMovingItems += 1;
    }
  }

  // Derive dependency score and risk level
  for (const supplier of supplierMap.values()) {
    const risk =
      supplier.criticalItems * 3 +
      supplier.lowStockItems * 2 +
      supplier.fastMovingItems * 1;

    supplier.dependencyScore = risk;

    supplier.riskLevel = risk >= 10 ? "high" : risk >= 5 ? "medium" : "low";
  }

  return Array.from(supplierMap.values()).sort(
    (a, b) => b.dependencyScore - a.dependencyScore,
  );
};
