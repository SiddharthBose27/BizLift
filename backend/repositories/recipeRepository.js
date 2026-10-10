/**
 * server/repositories/recipeRepository.js (Batch 10)
 * Data access for recipes and inventory.
 */

import {
  loadWorkspaceState,
  persistWorkspaceState,
} from "../services/workspaceAccessService.js";

export const getRecipeState = ({ officeId, vendorId }) => {
  const { db, vendorState } = loadWorkspaceState({ officeId, vendorId });

  return {
    db,
    vendorState,
    recipes: vendorState.recipes || [],
    inventory: vendorState.inventory || [],
  };
};

export const saveRecipeState = (db) => {
  return persistWorkspaceState(db);
};
