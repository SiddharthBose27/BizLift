import express from "express";
import {
  getAllRecipes,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  getRecipeDependencySummary,
} from "../controllers/recipeController.js";
import { requireWorkspace } from "../middleware/requireWorkspace.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireWorkspaceAccess } from "../middleware/requireWorkspaceAccess.js";
import { requirePermission } from "../middleware/requireRole.js";

const router = express.Router();

router.get("/", requireAuth, requireWorkspace, requireWorkspaceAccess, requirePermission("inventory:read"), getAllRecipes);
router.get("/dependency-summary", requireAuth, requireWorkspace, requireWorkspaceAccess, requirePermission("inventory:read"), getRecipeDependencySummary);
router.post("/", requireAuth, requireWorkspace, requireWorkspaceAccess, requirePermission("inventory:write"), createRecipe);
router.put("/:id", requireAuth, requireWorkspace, requireWorkspaceAccess, requirePermission("inventory:write"), updateRecipe);
router.delete("/:id", requireAuth, requireWorkspace, requireWorkspaceAccess, requirePermission("inventory:write"), deleteRecipe);

export default router;
