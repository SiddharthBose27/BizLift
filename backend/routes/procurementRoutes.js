import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireWorkspace } from "../middleware/requireWorkspace.js";
import { requireWorkspaceAccess } from "../middleware/requireWorkspaceAccess.js";
import { requirePermission } from "../middleware/requireRole.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getProcurementCockpit, createProcurementOrder, approveProcurementOrder } from "../services/procurementPlatformService.js";

const router = express.Router();
const scoped = [requireAuth, requireWorkspace, requireWorkspaceAccess];

router.get("/cockpit", ...scoped, requirePermission("procurement:read"), asyncHandler(async (req, res) => {
  const data = await getProcurementCockpit(req.workspace);
  res.json({ success: true, data, workspace: req.workspace });
}));

router.post("/orders", ...scoped, requirePermission("procurement:write"), asyncHandler(async (req, res) => {
  const result = await createProcurementOrder({ ...req.workspace, userId: req.auth.user.id, items: Array.isArray(req.body?.items) ? req.body.items : [] });
  res.status(201).json({ success: true, data: result, workspace: req.workspace });
}));

router.post("/orders/:id/approve", ...scoped, requirePermission("procurement:write"), asyncHandler(async (req, res) => {
  const order = await approveProcurementOrder({ ...req.workspace, orderId: req.params.id, userId: req.auth.user.id });
  res.json({ success: true, data: order, workspace: req.workspace });
}));

export default router;
