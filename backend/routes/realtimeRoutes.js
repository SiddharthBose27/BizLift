import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireWorkspace } from "../middleware/requireWorkspace.js";
import { requireWorkspaceAccess } from "../middleware/requireWorkspaceAccess.js";
import { requirePermission } from "../middleware/requireRole.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getRealtimeHealth, streamRealtimeEvents } from "../controllers/realtimeController.js";

const router = express.Router();
const scoped = [requireAuth, requireWorkspace, requireWorkspaceAccess, requirePermission("realtime:read")];

router.get("/health", ...scoped, asyncHandler(getRealtimeHealth));
router.get("/stream", ...scoped, asyncHandler(streamRealtimeEvents));

export default router;
