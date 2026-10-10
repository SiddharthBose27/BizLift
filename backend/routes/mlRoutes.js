import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireWorkspace } from "../middleware/requireWorkspace.js";
import { requireWorkspaceAccess } from "../middleware/requireWorkspaceAccess.js";
import { requirePermission } from "../middleware/requireRole.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getMLReadiness, trainMLModel, getMLPrediction, postMLDrift, getMLRuns } from "../controllers/mlController.js";

const router = express.Router();
const scoped = [requireAuth, requireWorkspace, requireWorkspaceAccess];
router.get("/readiness", ...scoped, requirePermission("ml:read"), asyncHandler(getMLReadiness));
router.get("/runs", ...scoped, requirePermission("ml:read"), asyncHandler(getMLRuns));
router.get("/predict", ...scoped, requirePermission("ml:read"), asyncHandler(getMLPrediction));
router.post("/train", ...scoped, requirePermission("ml:write"), asyncHandler(trainMLModel));
router.post("/drift", ...scoped, requirePermission("ml:write"), asyncHandler(postMLDrift));
export default router;
