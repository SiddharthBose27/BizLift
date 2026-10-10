import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireWorkspace } from "../middleware/requireWorkspace.js";
import { requireWorkspaceAccess } from "../middleware/requireWorkspaceAccess.js";
import { requirePermission } from "../middleware/requireRole.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getDataOverview, getDataQuality, postDataSnapshot, postAnalyticsEvent, getAnalyticsEvents } from "../controllers/dataController.js";

const router = express.Router();
const scoped = [requireAuth, requireWorkspace, requireWorkspaceAccess];

router.get("/overview", ...scoped, requirePermission("analytics:read"), asyncHandler(getDataOverview));
router.get("/quality", ...scoped, requirePermission("analytics:read"), asyncHandler(getDataQuality));
router.get("/events", ...scoped, requirePermission("analytics:read"), asyncHandler(getAnalyticsEvents));
router.post("/events", ...scoped, requirePermission("analytics:write"), asyncHandler(postAnalyticsEvent));
router.post("/snapshots", ...scoped, requirePermission("analytics:write"), asyncHandler(postDataSnapshot));

export default router;
