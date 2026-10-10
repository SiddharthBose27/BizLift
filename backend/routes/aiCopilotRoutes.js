import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireWorkspace } from "../middleware/requireWorkspace.js";
import { requireWorkspaceAccess } from "../middleware/requireWorkspaceAccess.js";
import { requirePermission } from "../middleware/requireRole.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { postCopilotBrief, getCopilotActions, decideCopilot } from "../controllers/aiCopilotController.js";

const router = express.Router();
const scoped = [requireAuth, requireWorkspace, requireWorkspaceAccess];
router.post("/brief", ...scoped, requirePermission("copilot:read"), asyncHandler(postCopilotBrief));
router.get("/actions", ...scoped, requirePermission("copilot:read"), asyncHandler(getCopilotActions));
router.post("/actions/:id/decision", ...scoped, requirePermission("actions:approve"), asyncHandler(decideCopilot));
export default router;
