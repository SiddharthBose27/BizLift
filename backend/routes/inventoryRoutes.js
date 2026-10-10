// server/routes/inventoryRoutes.js

import express from "express";
import {
  getAllInventory,
  getAllTransactions,
  getSupplierAnalytics,
  getReorderSuggestions,
  getDemandAnalytics,
  getAIHealthScore,
  createInventoryItem,
  updateInventoryItem,
  updateInventoryStock,
  deleteSelectedInventoryItems,
  getActionCenter,
  reviewAction,
  snoozeAction,
  dismissAction,
  getEOQAnalytics,
  getWasteAnalytics,
  getDemandForecast,
  getProcurementPlan,
  resetActionStates,
  getWorkspaceHealth,
  getIntelligenceSummary,
  getExpiryAnalytics,
  getStockRisk,
  getWorkspaceRegistry,
  resetCurrentWorkspace,
} from "../controllers/inventoryController.js";
import { requireWorkspace } from "../middleware/requireWorkspace.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireWorkspaceAccess } from "../middleware/requireWorkspaceAccess.js";
import { requirePermission } from "../middleware/requireRole.js";

const router = express.Router();

const protect = [requireAuth, requireWorkspace, requireWorkspaceAccess];
const readProtect = [...protect, requirePermission("inventory:read")];
const writeProtect = [...protect, requirePermission("inventory:write")];
const actionProtect = [...protect, requirePermission("actions:approve")];

// Metadata / Registry (Unprotected or different protection if needed, but here following SaaS flow)
router.get("/workspaces", getWorkspaceRegistry);

// Core Inventory
router.get("/", ...readProtect, getAllInventory);
router.post("/", ...writeProtect, createInventoryItem);
router.put("/:id", ...writeProtect, updateInventoryItem);
router.delete("/", ...writeProtect, deleteSelectedInventoryItems);
router.patch("/:id/stock", ...writeProtect, updateInventoryStock);

// Transactions
router.get("/transactions", ...readProtect, getAllTransactions);

// Action Center & Actions
router.get("/action-center", ...readProtect, getActionCenter);
router.post("/actions/review", ...actionProtect, reviewAction);
router.post("/actions/snooze", ...actionProtect, snoozeAction);
router.post("/actions/dismiss", ...actionProtect, dismissAction);
router.post("/actions/reset", ...protect, resetActionStates);

// Intelligence & Analytics
router.get("/intelligence/summary", ...readProtect, getIntelligenceSummary);
router.get("/reorder/suggestions", ...readProtect, getReorderSuggestions);
router.get("/demand/analytics", ...readProtect, getDemandAnalytics);
router.get("/expiry/analytics", ...readProtect, getExpiryAnalytics);
router.get("/stock-risk", ...readProtect, getStockRisk);
router.get("/suppliers/analytics", ...readProtect, getSupplierAnalytics);

// Advanced / AI Endpoints
router.get("/ai-health-score", ...readProtect, getAIHealthScore);
router.get("/eoq", ...readProtect, getEOQAnalytics);
router.get("/waste-analytics", ...readProtect, getWasteAnalytics);
router.get("/demand-forecast", ...readProtect, getDemandForecast);
router.get("/procurement-plan", ...readProtect, getProcurementPlan);
router.get("/workspace-health", ...readProtect, getWorkspaceHealth);

// Maintenance
router.post("/workspace/reset", ...writeProtect, resetCurrentWorkspace);

export default router;
