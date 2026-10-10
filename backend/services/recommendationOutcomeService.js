import { getWorkspaceStore } from "./workspaceService.js";
import { readDb, writeDb } from "../utils/db.js";

const clean = (value) => String(value ?? "").trim();

export const listRecommendationOutcomes = ({ officeId, vendorId }) => {
  const store = getWorkspaceStore({ officeId, vendorId });
  return Array.isArray(store.recommendationOutcomes) ? store.recommendationOutcomes : [];
};

export const createRecommendationOutcome = ({ officeId, vendorId, payload }) => {
  const db = readDb();
  const key = `${officeId}::${vendorId}`;
  const store = db.workspaces[key];
  if (!store) throw new Error("Workspace not found");
  if (!Array.isArray(store.recommendationOutcomes)) store.recommendationOutcomes = [];
  const outcome = {
    id: `outcome-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    recommendationId: clean(payload.recommendationId) || `rec-${Date.now()}`,
    type: clean(payload.type) || "operational",
    title: clean(payload.title) || "Recommendation",
    status: clean(payload.status) || "completed",
    expectedImpact: Number(payload.expectedImpact || 0),
    realizedImpact: Number(payload.realizedImpact || 0),
    measurementSource: clean(payload.measurementSource) || "manual",
    measuredAt: payload.realizedImpact ? new Date().toISOString() : null,
    notes: clean(payload.notes),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store.recommendationOutcomes.unshift(outcome);
  store.recommendationOutcomes = store.recommendationOutcomes.slice(0, 200);
  writeDb(db);
  return outcome;
};
