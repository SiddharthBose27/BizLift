/**
 * server/repositories/vendorSummaryRepository.js (Batch 10)
 * Provides a unified state for vendor dashboards.
 */

import { loadWorkspaceState } from "../services/workspaceAccessService.js";

export const getVendorSummaryState = ({ officeId, vendorId }) => {
  const { db, vendorState } = loadWorkspaceState({ officeId, vendorId });

  return {
    db,
    vendorState,
    inventory: vendorState.inventory || [],
    recipes: vendorState.recipes || [],
    sales: vendorState.sales || [],
    inventoryTransactions: vendorState.inventoryTransactions || [],
    wasteEvents: vendorState.wasteEvents || [],
    suppliers: vendorState.suppliers || [],
    purchaseOrders: vendorState.purchaseOrders || [],
    demandObservations: vendorState.demandObservations || [],
  };
};
