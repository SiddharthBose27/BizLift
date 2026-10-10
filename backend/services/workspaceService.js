import { demoWorkspaceSeeds } from "../data/demoWorkspaces.js";
import { readDb, writeDb } from "../utils/db.js";

const workspaceRegistry = new Map();
// workspaceDataStore is now part of the central db

const deepClone = (value) => JSON.parse(JSON.stringify(value));

export const getWorkspaceKey = ({ officeId, vendorId }) => {
  return `${officeId}::${vendorId}`;
};

const buildEmptyWorkspaceStore = ({ officeId, vendorId }) => ({
  officeId,
  vendorId,
  inventory: [],
  recipes: [],
  sales: [],
  inventoryTransactions: [],
  transactions: [],
  wasteEvents: [],
  purchaseOrders: [],
  demandObservations: [],
  suppliers: [],
  recommendationOutcomes: [],
  controlTowerActions: [],
  createdAt: new Date().toISOString(),
  mode: "empty",
});

const buildSeededWorkspaceStore = ({ officeId, vendorId }, seed) => ({
  officeId,
  vendorId,
  inventory: deepClone(seed.inventory || []),
  recipes: deepClone(seed.recipes || []),
  sales: deepClone(seed.sales || []),
  inventoryTransactions: deepClone(seed.inventoryTransactions || seed.transactions || []),
  transactions: deepClone(seed.transactions || []),
  wasteEvents: deepClone(seed.wasteEvents || []),
  purchaseOrders: deepClone(seed.purchaseOrders || []),
  demandObservations: deepClone(seed.demandObservations || []),
  suppliers: deepClone(seed.suppliers || []),
  recommendationOutcomes: deepClone(seed.recommendationOutcomes || []),
  controlTowerActions: deepClone(seed.controlTowerActions || []),
  createdAt: new Date().toISOString(),
  mode: "seeded-demo",
});

export const ensureWorkspace = ({ officeId, vendorId }) => {
  const workspaceKey = getWorkspaceKey({ officeId, vendorId });

  if (!workspaceRegistry.has(workspaceKey)) {
    const seed = demoWorkspaceSeeds[workspaceKey];

    const workspaceMeta = {
      officeId,
      vendorId,
      workspaceKey,
      createdAt: new Date().toISOString(),
      mode: seed ? "seeded-demo" : "empty",
    };

    workspaceRegistry.set(workspaceKey, workspaceMeta);

    const db = readDb();

    // Keep existing persisted workspace data. Only create seed/empty data when
    // this workspace does not already exist in the database.
    if (!db.workspaces[workspaceKey]) {
      if (seed) {
        db.workspaces[workspaceKey] = buildSeededWorkspaceStore(
          { officeId, vendorId },
          seed,
        );
      } else {
        db.workspaces[workspaceKey] = buildEmptyWorkspaceStore({
          officeId,
          vendorId,
        });
      }
      writeDb(db);
    }
  }

  return workspaceRegistry.get(workspaceKey);
};

export const getAllRegisteredWorkspaces = () => {
  return Array.from(workspaceRegistry.values());
};

export const getWorkspaceStore = ({ officeId, vendorId }) => {
  const workspace = ensureWorkspace({ officeId, vendorId });
  const db = readDb();
  return db.workspaces[workspace.workspaceKey];
};

export const resetWorkspaceStore = ({ officeId, vendorId }) => {
  const workspaceKey = getWorkspaceKey({ officeId, vendorId });
  const seed = demoWorkspaceSeeds[workspaceKey];

  const db = readDb();

  if (seed) {
    const resetStore = buildSeededWorkspaceStore({ officeId, vendorId }, seed);
    db.workspaces[workspaceKey] = resetStore;
    writeDb(db);

    workspaceRegistry.set(workspaceKey, {
      officeId,
      vendorId,
      workspaceKey,
      createdAt: new Date().toISOString(),
      mode: "seeded-demo",
    });

    return resetStore;
  }

  const emptyStore = buildEmptyWorkspaceStore({ officeId, vendorId });
  db.workspaces[workspaceKey] = emptyStore;
  writeDb(db);

  workspaceRegistry.set(workspaceKey, {
    officeId,
    vendorId,
    workspaceKey,
    createdAt: new Date().toISOString(),
    mode: "empty",
  });

  return emptyStore;
};
