import { getWorkspaceStore } from "../services/workspaceService.js";

/**
 * server/utils/workspaceStore.js (Refined Batch 1)
 * Ensures a workspace has the required collections for inventory tracking.
 * Acts as an adapter for the existing workspace registry.
 */
export const ensureWorkspaceVendorState = (officeId, vendorId) => {
  const store = getWorkspaceStore({ officeId, vendorId });

  if (!Array.isArray(store.inventory)) store.inventory = [];
  if (!Array.isArray(store.recipes)) store.recipes = [];
  if (!Array.isArray(store.sales)) store.sales = [];
  if (!Array.isArray(store.inventoryTransactions)) {
    store.inventoryTransactions = [];
  }
  if (!Array.isArray(store.wasteEvents)) store.wasteEvents = [];
  if (!Array.isArray(store.purchaseOrders)) store.purchaseOrders = [];
  if (!Array.isArray(store.demandObservations)) store.demandObservations = [];
  if (!Array.isArray(store.suppliers)) store.suppliers = [];
  if (!Array.isArray(store.recommendationOutcomes)) store.recommendationOutcomes = [];
  if (!Array.isArray(store.transactions)) store.transactions = [];

  return store;
};
