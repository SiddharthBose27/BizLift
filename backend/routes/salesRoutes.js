import express from "express";
import {
  getAllSales,
  createSale,
  createOrder,
  getSalesAnalytics,
  getEnhancedSalesAnalytics,
  cancelOrder,
} from "../controllers/salesController.js";
import { requireWorkspace } from "../middleware/requireWorkspace.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireWorkspaceAccess } from "../middleware/requireWorkspaceAccess.js";
import { requirePermission } from "../middleware/requireRole.js";

const router = express.Router();

router.get("/", requireAuth, requireWorkspace, requireWorkspaceAccess, requirePermission("pos:read"), getAllSales);
router.get("/analytics", requireAuth, requireWorkspace, requireWorkspaceAccess, requirePermission("pos:read"), getSalesAnalytics);
router.get("/analytics/enhanced", requireAuth, requireWorkspace, requireWorkspaceAccess, requirePermission("pos:read"), getEnhancedSalesAnalytics);
router.post("/", requireAuth, requireWorkspace, requireWorkspaceAccess, requirePermission("pos:write"), createSale);
router.post("/orders", requireAuth, requireWorkspace, requireWorkspaceAccess, requirePermission("pos:write"), createOrder);
router.post("/orders/:orderId/cancel", requireAuth, requireWorkspace, requireWorkspaceAccess, requirePermission("pos:write"), cancelOrder);

export default router;
