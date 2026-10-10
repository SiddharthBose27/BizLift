import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireWorkspace } from "../middleware/requireWorkspace.js";
import { requireWorkspaceAccess } from "../middleware/requireWorkspaceAccess.js";
import { requirePermission } from "../middleware/requireRole.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { health, metrics, audit, security } from "../controllers/observabilityController.js";

const router = express.Router();
const scoped = [requireAuth, requireWorkspace, requireWorkspaceAccess];
router.get("/health", asyncHandler(health));
router.get("/metrics", ...scoped, requirePermission("observability:read"), asyncHandler(metrics));
router.get("/audit", ...scoped, requirePermission("audit:read"), asyncHandler(audit));
router.get("/security", ...scoped, requirePermission("security:read"), asyncHandler(security));
export default router;
