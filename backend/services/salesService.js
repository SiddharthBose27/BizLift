import { getWorkspaceStore } from "./workspaceService.js";

const getWorkspaceSalesStore = (workspaceContext) => {
  return getWorkspaceStore(workspaceContext).sales;
};

export const getAllSalesRecords = (workspaceContext) => {
  return getWorkspaceSalesStore(workspaceContext);
};

export const getNextSaleId = (workspaceContext) => {
  const store = getWorkspaceSalesStore(workspaceContext);
  if (!store.length) return 1;
  return Math.max(...store.map((item) => Number(item.id) || 0)) + 1;
};

export const createSaleRecord = (sale, workspaceContext) => {
  const store = getWorkspaceSalesStore(workspaceContext);
  store.unshift(sale);
  return sale;
};
