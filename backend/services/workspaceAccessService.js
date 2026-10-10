import { getWorkspaceStore } from "./workspaceService.js";
import { ensureWorkspaceVendorState } from "../utils/workspaceStore.js";
import { readDb, writeDb } from "../utils/db.js";

export const loadWorkspaceState = ({ officeId, vendorId }) => {
  const store = getWorkspaceStore({ officeId, vendorId });
  const vendorState = ensureWorkspaceVendorState(officeId, vendorId);
  return { db: readDb(), vendorState: vendorState || store };
};

export const persistWorkspaceState = (db) => {
  if (db) writeDb(db);
  return true;
};
