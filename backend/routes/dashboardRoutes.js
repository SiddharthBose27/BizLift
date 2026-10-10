// server/routes/dashboardRoutes.js

import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireWorkspace } from "../middleware/requireWorkspace.js";
import { requireWorkspaceAccess } from "../middleware/requireWorkspaceAccess.js";
import { getVendorSummaryState } from "../repositories/vendorSummaryRepository.js";
import { buildInventoryMetrics } from "../services/inventoryAnalytics.js";
import { buildReorderSuggestions } from "../services/inventoryEngine.js";
import { buildSupplierAnalytics } from "../services/supplierAnalytics.js";
import { buildActionCenterAlerts } from "../services/actionCenterEngine.js";
import {
  buildWasteSummary,
  buildWasteByItem,
  buildWasteByReason,
} from "../services/wasteAnalytics.js";
import {
  buildExpiryMetrics,
  buildExpirySummary,
} from "../services/expiryEngine.js";
import {
  buildSalesSummary,
  buildTopSellingRecipes,
  buildHourlySalesDistribution,
  buildDailySalesTrend,
} from "../services/salesAnalytics.js";
import { summarizeDashboard } from "./../services/dashboardIntelligence.js";

const router = express.Router();

const sortExpiryRiskItems = (items = []) => {
  const severityRank = {
    expired: 5,
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
    none: 0,
  };

  return [...items].sort((a, b) => {
    const severityDiff =
      (severityRank[b.expirySeverity] || 0) -
      (severityRank[a.expirySeverity] || 0);

    if (severityDiff !== 0) return severityDiff;

    return (b.estimatedWasteRiskQty || 0) - (a.estimatedWasteRiskQty || 0);
  });
};

router.get(
  "/summary",
  requireAuth,
  requireWorkspace,
  requireWorkspaceAccess,
  (req, res) => {
    try {
      const { officeId, vendorId } = req.workspace;

      const {
        inventory = [],
        sales = [],
        inventoryTransactions = [],
        wasteEvents = [],
      } = getVendorSummaryState({ officeId, vendorId });

      const now = new Date();

      const itemMetrics = buildInventoryMetrics({
        inventory,
        transactions: inventoryTransactions,
        now,
      });

      const metricMap = new Map(
        itemMetrics.map((entry) => [String(entry.inventoryItemId), entry]),
      );

      const reorderSuggestions = inventory
        .map((item) => {
          const metrics = metricMap.get(String(item.id));
          return buildReorderSuggestions({ item, metrics });
        })
        .filter((item) => item.shouldReorder)
        .sort((a, b) => {
          const rank = { critical: 4, high: 3, medium: 2, low: 1 };
          return (rank[b.urgency] || 0) - (rank[a.urgency] || 0);
        });

      const supplierAnalytics = buildSupplierAnalytics({
        inventory,
        metrics: itemMetrics,
      });

      const expiryMetrics = buildExpiryMetrics({
        inventory,
        itemMetrics,
        now,
      });

      const sortedExpiryMetrics = sortExpiryRiskItems(expiryMetrics);

      const alerts = buildActionCenterAlerts({
        inventory,
        metrics: itemMetrics,
        reorderSuggestions,
        suppliers: supplierAnalytics,
        expiryMetrics: sortedExpiryMetrics,
      });

      const wasteAnalytics = {
        summary: buildWasteSummary({ wasteEvents, now }),
        wasteByItem: buildWasteByItem({ wasteEvents, limit: 10 }),
        wasteByReason: buildWasteByReason({ wasteEvents }),
      };

      const salesAnalytics = {
        summary: buildSalesSummary({ sales, now }),
        topSellingRecipes: buildTopSellingRecipes({ sales, limit: 5 }),
        hourlyDistribution: buildHourlySalesDistribution({ sales }),
        dailyTrend7d: buildDailySalesTrend({ sales, days: 7, now }),
      };

      const expiryAnalytics = {
        summary: buildExpirySummary({ expiryMetrics: sortedExpiryMetrics }),
        items: sortedExpiryMetrics,
      };

      const dashboard = summarizeDashboard({
        inventory,
        itemMetrics,
        reorderSuggestions,
        supplierAnalytics,
        alerts,
        wasteAnalytics,
        expiryAnalytics,
        salesAnalytics,
      });

      return res.json({
        dashboard,
        reorderSuggestions: reorderSuggestions.slice(0, 5),
        alerts: alerts.slice(0, 10),
        supplierAnalytics: supplierAnalytics.slice(0, 5),
        expiryRiskItems: sortedExpiryMetrics.slice(0, 5),
        wasteHighlights: wasteAnalytics.wasteByItem.slice(0, 5),
        salesHighlights: salesAnalytics.topSellingRecipes.slice(0, 5),
      });
    } catch (error) {
      console.error("GET /api/dashboard/summary error:", error);
      return res.status(500).json({
        message: "Failed to fetch dashboard summary.",
      });
    }
  },
);

router.get(
  "/health",
  requireAuth,
  requireWorkspace,
  requireWorkspaceAccess,
  (req, res) => {
    try {
      const { officeId, vendorId } = req.workspace;

      const {
        inventory = [],
        sales = [],
        inventoryTransactions = [],
        wasteEvents = [],
      } = getVendorSummaryState({ officeId, vendorId });

      const now = new Date();

      const itemMetrics = buildInventoryMetrics({
        inventory,
        transactions: inventoryTransactions,
        now,
      });

      const supplierAnalytics = buildSupplierAnalytics({
        inventory,
        metrics: itemMetrics,
      });

      const expiryMetrics = buildExpiryMetrics({
        inventory,
        itemMetrics,
        now,
      });

      const alerts = buildActionCenterAlerts({
        inventory,
        metrics: itemMetrics,
        reorderSuggestions: [],
        suppliers: supplierAnalytics,
        expiryMetrics,
      });

      const dashboard = summarizeDashboard({
        inventory,
        itemMetrics,
        reorderSuggestions: [],
        supplierAnalytics,
        alerts,
        wasteAnalytics: {
          summary: buildWasteSummary({ wasteEvents, now }),
        },
        expiryAnalytics: {
          summary: buildExpirySummary({ expiryMetrics }),
        },
        salesAnalytics: {
          summary: buildSalesSummary({ sales, now }),
          topSellingRecipes: [],
        },
      });

      return res.json({
        healthScore: dashboard.healthScore,
      });
    } catch (error) {
      console.error("GET /api/dashboard/health error:", error);
      return res.status(500).json({
        message: "Failed to fetch health score.",
      });
    }
  },
);

export default router;
