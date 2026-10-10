import { getWorkspaceStore } from "./workspaceService.js";

const getWorkspaceTransactionStore = (workspaceContext) => {
  return getWorkspaceStore(workspaceContext).transactions;
};

const getWorkspaceInventoryTransactionStore = (workspaceContext) => {
  const store = getWorkspaceStore(workspaceContext);
  if (!store.inventoryTransactions) store.inventoryTransactions = [];
  return store.inventoryTransactions;
};

export const getAllTransactions = (workspaceContext) => {
  return getWorkspaceTransactionStore(workspaceContext);
};

export const getNextTransactionId = (workspaceContext) => {
  const store = getWorkspaceTransactionStore(workspaceContext);
  if (!store.length) return 1;
  return Math.max(...store.map((item) => Number(item.id) || 0)) + 1;
};

export const createTransactionRecord = (transaction, workspaceContext) => {
  const store = getWorkspaceTransactionStore(workspaceContext);
  store.unshift(transaction);
  return transaction;
};

export const getAllInventoryTransactions = (workspaceContext) => {
  return getWorkspaceInventoryTransactionStore(workspaceContext);
};

export const createInventoryTransactionRecord = (
  transaction,
  workspaceContext,
) => {
  const store = getWorkspaceInventoryTransactionStore(workspaceContext);
  store.unshift(transaction);
  return transaction;
};
