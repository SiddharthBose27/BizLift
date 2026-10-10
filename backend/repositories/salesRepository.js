/**
 * server/repositories/salesRepository.js (Batch 10)
 * Data access for sales, recipes, and inventory.
 */

import {
  loadWorkspaceState,
  persistWorkspaceState,
} from "../services/workspaceAccessService.js";

export const getSalesState = ({ officeId, vendorId }) => {
  const { db, vendorState } = loadWorkspaceState({ officeId, vendorId });

  return {
    db,
    vendorState,
    sales: vendorState.sales || [],
    recipes: vendorState.recipes || [],
    inventory: vendorState.inventory || [],
    inventoryTransactions: vendorState.inventoryTransactions || [],
  };
};

export const saveSalesState = (db) => {
  return persistWorkspaceState(db);
};
