import { getPrisma, isPostgresEnabled } from "../utils/postgres.js";
import { readDb, writeDb } from "../utils/db.js";
import { createEntityId } from "../utils/idFactory.js";
import { buildDataOverview } from "./dataPlatformService.js";
import { buildMLReadiness } from "./mlPlatformService.js";
import { getProcurementCockpit, createProcurementOrder } from "./procurementPlatformService.js";

const n = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
const round = (v) => Number(n(v).toFixed(2));
const scopeWhere = ({ officeId, vendorId }) => ({ officeId: String(officeId), vendorId: String(vendorId) });

const buildActions = ({ overview, procurement, readiness }) => {
  const actions = [];
  const critical = procurement.recommendations?.filter((x) => x.urgency === "critical" || x.procurementPriority === "Critical") || [];
  const high = procurement.recommendations?.filter((x) => x.urgency === "high" || x.procurementPriority === "High") || [];
  const top = [...critical, ...high, ...(procurement.recommendations || [])][0];
  if (top) {
    actions.push({
      id: createEntityId("copilot-action"), actionType: "procurement_reorder", priority: critical.includes(top) ? "critical" : "high",
      title: `Reorder ${top.itemName || top.itemKey || "priority stock"}`,
      rationale: top.reason || `Current stock is under the recommended operating level and procurement can reduce stockout risk.`,
      expectedImpact: round(top.estimatedSpend ? -top.estimatedSpend : 0),
      payload: { items: [{ itemId: top.itemId, quantity: top.recommendedOrderQty, unitCost: top.unitCost || top.costPrice || 0, supplier: top.supplier || top.recommendedSupplier || "Unassigned Supplier", leadTimeDays: top.leadTimeDays || 3 }] },
    });
  }
  if (n(overview.metrics.wasteCost) > 0) {
    actions.push({
      id: createEntityId("copilot-action"), actionType: "waste_review", priority: overview.metrics.wasteCost >= 1000 ? "high" : "medium",
      title: "Review waste leakage",
      rationale: `The workspace has ₹${Math.round(overview.metrics.wasteCost).toLocaleString("en-IN")} of recorded waste cost. Review the largest causes before the next prep cycle.`,
      expectedImpact: round(overview.metrics.wasteCost * 0.15), payload: { metric: "wasteCost", reductionTargetPct: 15 },
    });
  }
  if (readiness.status !== "ready") {
    actions.push({
      id: createEntityId("copilot-action"), actionType: "ml_readiness", priority: "medium",
      title: "Strengthen demand model coverage",
      rationale: `Demand forecasting is currently ${readiness.status}; observed history is ${readiness.observedDays} days versus a recommended ${readiness.minimumRecommendedDays} days.`,
      expectedImpact: 0, payload: { observedDays: readiness.observedDays, recommendedDays: readiness.minimumRecommendedDays },
    });
  }
  return actions.slice(0, 5);
};

const summarize = ({ overview, procurement, readiness, actions }) => {
  const critical = procurement.recommendations?.filter((x) => x.urgency === "critical" || x.procurementPriority === "Critical").length || 0;
  const spend = round(procurement.summary?.estimatedSpend || 0);
  return critical
    ? `${critical} critical procurement signal${critical === 1 ? "" : "s"} need attention. Estimated replenishment spend is ₹${Math.round(spend).toLocaleString("en-IN")}. ${actions.length} explainable action${actions.length === 1 ? "" : "s"} prepared.`
    : `Operations are stable enough for routine review. ${actions.length} explainable action${actions.length === 1 ? "" : "s"} prepared; demand model status is ${readiness.status}.`;
};

const buildContext = ({ overview, procurement, readiness }) => ({
  metrics: overview.metrics,
  procurementSummary: procurement.summary,
  modelReadiness: { status: readiness.status, observedDays: readiness.observedDays, minimumRecommendedDays: readiness.minimumRecommendedDays },
});

export const buildCopilotBrief = async ({ scope, userId = null, intent = "daily_operations" }) => {
  const [overview, procurement, readiness] = await Promise.all([
    buildDataOverview(scope), getProcurementCockpit(scope), buildMLReadiness(scope),
  ]);
  const actions = buildActions({ overview, procurement, readiness });
  const summary = summarize({ overview, procurement, readiness, actions });
  const context = buildContext({ overview, procurement, readiness });
  const runId = createEntityId("copilot-run");
  const createdAt = new Date();

  if (isPostgresEnabled()) {
    const prisma = await getPrisma();
    const run = await prisma.aICopilotRun.create({ data: { id: runId, organizationId: scope.organizationId || null, officeId: String(scope.officeId), vendorId: String(scope.vendorId), userId: userId || null, intent, status: "ready", summary, context, actions: { create: actions.map((a) => ({ id: a.id, officeId: String(scope.officeId), vendorId: String(scope.vendorId), actionType: a.actionType, title: a.title, rationale: a.rationale, priority: a.priority, expectedImpact: a.expectedImpact, payload: a.payload })) } }, include: { actions: true } });
    return { run, source: "postgresql" };
  }

  const db = readDb();
  db.aiCopilotRuns = Array.isArray(db.aiCopilotRuns) ? db.aiCopilotRuns : [];
  db.aiCopilotActions = Array.isArray(db.aiCopilotActions) ? db.aiCopilotActions : [];
  const run = { id: runId, organizationId: scope.organizationId || null, officeId: String(scope.officeId), vendorId: String(scope.vendorId), userId, intent, status: "ready", summary, context, createdAt: createdAt.toISOString() };
  const rows = actions.map((a) => ({ ...a, runId, officeId: String(scope.officeId), vendorId: String(scope.vendorId), status: "proposed", createdAt: createdAt.toISOString(), actedAt: null }));
  db.aiCopilotRuns.unshift(run); db.aiCopilotActions.unshift(...rows); writeDb(db);
  return { run: { ...run, actions: rows }, source: "json-demo" };
};

export const listCopilotActions = async (scope, limit = 20) => {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  if (isPostgresEnabled()) {
    const prisma = await getPrisma();
    return prisma.aICopilotAction.findMany({ where: scopeWhere(scope), orderBy: { createdAt: "desc" }, take: safeLimit });
  }
  const db = readDb();
  return (Array.isArray(db.aiCopilotActions) ? db.aiCopilotActions : []).filter((x) => String(x.officeId) === String(scope.officeId) && String(x.vendorId) === String(scope.vendorId)).slice(0, safeLimit);
};

export const decideCopilotAction = async ({ scope, actionId, decision, userId = null }) => {
  if (!["approved", "dismissed"].includes(decision)) throw new Error("Decision must be approved or dismissed.");
  if (isPostgresEnabled()) {
    const prisma = await getPrisma();
    const action = await prisma.aICopilotAction.findFirst({ where: { id: String(actionId), ...scopeWhere(scope) } });
    if (!action) throw new Error("AI Copilot action not found.");
    if (action.status !== "proposed") throw new Error(`Action is already ${action.status}.`);
    if (decision === "approved" && action.actionType === "procurement_reorder") {
      const payload = action.payload || {};
      await createProcurementOrder({ ...scope, userId, items: Array.isArray(payload.items) ? payload.items : [] });
    }
    return prisma.aICopilotAction.update({ where: { id: action.id }, data: { status: decision, actedAt: new Date() } });
  }
  const db = readDb();
  const action = (Array.isArray(db.aiCopilotActions) ? db.aiCopilotActions : []).find((x) => String(x.id) === String(actionId) && String(x.officeId) === String(scope.officeId) && String(x.vendorId) === String(scope.vendorId));
  if (!action) throw new Error("AI Copilot action not found.");
  if (action.status !== "proposed") throw new Error(`Action is already ${action.status}.`);
  action.status = decision; action.actedAt = new Date().toISOString();
  writeDb(db);
  return action;
};
