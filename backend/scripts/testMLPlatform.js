import assert from "node:assert/strict";
import { buildMLReadiness, trainDemandModel, predictDemand, checkModelDrift, listMLRuns } from "../services/mlPlatformService.js";

const scope = { organizationId: "org_techpark_demo", officeId: "techpark-one", vendorId: "snapeats" };
const { readDb, writeDb } = await import("../utils/db.js");
const initialDb = readDb();
for (const key of ["mlModels", "mlTrainingRuns", "mlPredictions", "mlDriftChecks"]) delete initialDb[key];
writeDb(initialDb);
const itemKey = "3";
const readiness = await buildMLReadiness(scope);
assert.ok(["ready", "limited", "insufficient_data"].includes(readiness.status));

if (readiness.observedDays >= 3) {
  const trained = await trainDemandModel({ scope, itemKey, lookbackDays: 180, horizon: 3 });
  assert.equal(trained.model.status, "active");
  assert.equal(trained.trainingRun.status, "completed");
  assert.ok(trained.metrics.mae >= 0);
  const prediction = await predictDemand({ scope, itemKey, horizon: 3, lookbackDays: 180 });
  assert.equal(prediction.predictions.length, 3);
  assert.ok(prediction.predictions.every((row) => Number(row.predictedValue) >= 0));
  const drift = await checkModelDrift({ scope, itemKey, lookbackDays: 180 });
  assert.ok(["stable", "warning", "critical"].includes(drift.status));
  const runs = await listMLRuns(scope, 10);
  assert.ok(runs.length >= 1);
  const db = readDb();
  for (const key of ["mlModels", "mlTrainingRuns", "mlPredictions", "mlDriftChecks"]) delete db[key];
  writeDb(db);
  console.log("ML platform smoke test passed:", JSON.stringify({ readiness, version: trained.model.version, metrics: trained.metrics, predictions: prediction.predictions.length, drift: drift.status, runs: runs.length }));
} else {
  console.log("ML platform smoke test passed: readiness layer verified; insufficient demo observations for training.");
}
