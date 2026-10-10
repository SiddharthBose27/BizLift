/**
 * server/repositories/inventoryRepository.js (Batch 10)
 * Data access for inventory, transactions, and waste events.
 */

import {
  loadWorkspaceState,
  persistWorkspaceState,
} from "../services/workspaceAccessService.js";

export const getInventoryState = ({ officeId, vendorId }) => {
  const { db, vendorState } = loadWorkspaceState({ officeId, vendorId });

  return {
    db,
    vendorState,
    inventory: vendorState.inventory || [],
    inventoryTransactions: vendorState.inventoryTransactions || [],
    wasteEvents: vendorState.wasteEvents || [],
  };
};

export const saveInventoryState = (db) => {
  return persistWorkspaceState(db);
};
