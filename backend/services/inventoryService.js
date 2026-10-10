import { getWorkspaceStore } from "./workspaceService.js";

const getWorkspaceInventoryStore = (workspaceContext) => {
  return getWorkspaceStore(workspaceContext).inventory;
};

export const getAllInventoryItems = (workspaceContext) => {
  return getWorkspaceInventoryStore(workspaceContext);
};

export const getInventoryItemById = (id, workspaceContext) => {
  return getWorkspaceInventoryStore(workspaceContext).find(
    (item) => Number(item.id) === Number(id),
  );
};

export const getInventoryItemIndexById = (id, workspaceContext) => {
  return getWorkspaceInventoryStore(workspaceContext).findIndex(
    (item) => Number(item.id) === Number(id),
  );
};

export const getNextInventoryId = (workspaceContext) => {
  const store = getWorkspaceInventoryStore(workspaceContext);
  if (!store.length) return 1;
  return Math.max(...store.map((item) => Number(item.id) || 0)) + 1;
};

export const createInventoryItemRecord = (item, workspaceContext) => {
  const store = getWorkspaceInventoryStore(workspaceContext);
  store.push(item);
  return item;
};

export const updateInventoryItemRecord = (
  index,
  updatedItem,
  workspaceContext,
) => {
  const store = getWorkspaceInventoryStore(workspaceContext);
  store[index] = updatedItem;
  return store[index];
};

export const deleteInventoryItemsByIds = (ids = [], workspaceContext) => {
  const store = getWorkspaceInventoryStore(workspaceContext);
  const removedItems = [];

  for (let i = store.length - 1; i >= 0; i--) {
    if (ids.includes(store[i].id)) {
      removedItems.push(store[i]);
      store.splice(i, 1);
    }
  }

  return removedItems;
};
