import { getPrisma, isPostgresEnabled } from "../utils/postgres.js";
import { readDb, writeDb } from "../utils/db.js";
import { getVendorSummaryState } from "../repositories/vendorSummaryRepository.js";
import { createEntityId } from "../utils/idFactory.js";

const n = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const round = (v, digits = 4) => Number(n(v).toFixed(digits));
const isoDay = (value) => new Date(value).toISOString().slice(0, 10);
const safeDays = (value, fallback = 30) => clamp(Number(value) || fallback, 7, 180);
const safeHorizon = (value, fallback = 7) => clamp(Number(value) || fallback, 1, 30);

const scopeWhere = ({ officeId, vendorId }) => ({ officeId: String(officeId), vendorId: String(vendorId) });

const buildSeriesFromRows = (rows, itemKey) => {
  const daily = new Map();
  for (const row of rows) {
    const key = String(row.itemKey ?? row.recipeId ?? row.recipeName ?? "unknown");
    if (itemKey && key !== String(itemKey)) continue;
    const date = row.observedAt || row.createdAt || row.soldAt;
    if (!date) continue;
    const day = isoDay(date);
    daily.set(day, (daily.get(day) || 0) + n(row.quantity ?? row.quantitySold));
  }
  return [...daily.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value: round(value) }));
};

const getObservedSeries = async ({ officeId, vendorId, itemKey, lookbackDays }) => {
  const cutoff = Date.now() - lookbackDays * 86400000;
  if (isPostgresEnabled()) {
    const prisma = await getPrisma();
    const observations = await prisma.demandObservation.findMany({
      where: { ...scopeWhere({ officeId, vendorId }), ...(itemKey ? { itemKey: String(itemKey) } : {}), observedAt: { gte: new Date(cutoff) } },
      orderBy: { observedAt: "asc" },
    });
    if (observations.length) return buildSeriesFromRows(observations, itemKey);
    const sales = await prisma.sale.findMany({
      where: { ...scopeWhere({ officeId, vendorId }), createdAt: { gte: new Date(cutoff) } },
      select: { recipeId: true, recipeName: true, quantity: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return buildSeriesFromRows(sales, itemKey);
  }

  const state = getVendorSummaryState({ officeId, vendorId });
  const sales = Array.isArray(state.sales) ? state.sales : [];
  const filtered = sales.filter((row) => {
    const date = new Date(row.createdAt || row.timestamp || row.soldAt);
    return !Number.isNaN(date.getTime()) && date.getTime() >= cutoff;
  }).map((row) => ({
    itemKey: row.itemKey ?? row.recipeId ?? row.recipeName ?? row.menuItemName ?? "unknown",
    quantity: row.quantitySold ?? row.quantity,
    createdAt: row.createdAt || row.timestamp || row.soldAt,
  }));
  return buildSeriesFromRows(filtered, itemKey);
};

const movingAverage = (values, window = 7) => {
  const usable = values.slice(-Math.min(window, values.length));
  return usable.length ? usable.reduce((a, b) => a + b, 0) / usable.length : 0;
};

const trendSlope = (values) => {
  if (values.length < 2) return 0;
  const meanX = (values.length - 1) / 2;
  const meanY = values.reduce((a, b) => a + b, 0) / values.length;
  let numerator = 0;
  let denominator = 0;
  values.forEach((y, x) => { numerator += (x - meanX) * (y - meanY); denominator += (x - meanX) ** 2; });
  return denominator ? numerator / denominator : 0;
};

const forecastValues = (values, horizon) => {
  const base = movingAverage(values, 7);
  const slope = trendSlope(values.slice(-Math.min(14, values.length)));
  return Array.from({ length: horizon }, (_, index) => Math.max(0, base + slope * (index + 1)));
};

const errorMetrics = (actual, predicted) => {
  const pairs = actual.map((value, i) => [n(value), n(predicted[i])]).filter(([a]) => Number.isFinite(a));
  if (!pairs.length) return { mae: 0, rmse: 0, mape: 0 };
  const mae = pairs.reduce((sum, [a, p]) => sum + Math.abs(a - p), 0) / pairs.length;
  const rmse = Math.sqrt(pairs.reduce((sum, [a, p]) => sum + (a - p) ** 2, 0) / pairs.length);
  const nonZero = pairs.filter(([a]) => a !== 0);
  const mape = nonZero.length ? nonZero.reduce((sum, [a, p]) => sum + Math.abs((a - p) / a), 0) / nonZero.length * 100 : 0;
  return { mae: round(mae, 6), rmse: round(rmse, 6), mape: round(mape, 4) };
};

const modelName = "demand-forecast";
const algorithm = "moving_average_trend";

const latestModel = async (scope) => {
  if (isPostgresEnabled()) {
    const prisma = await getPrisma();
    return prisma.mLModel.findFirst({ where: { ...scopeWhere(scope), name: modelName }, orderBy: { createdAt: "desc" } });
  }
  const db = readDb();
  return (Array.isArray(db.mlModels) ? db.mlModels : []).filter((m) => m.officeId === String(scope.officeId) && m.vendorId === String(scope.vendorId) && m.name === modelName).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
};

export const buildMLReadiness = async (scope) => {
  const series = await getObservedSeries({ ...scope, itemKey: null, lookbackDays: 30 });
  const model = await latestModel(scope);
  const quality = series.length >= 7 ? "ready" : series.length >= 3 ? "limited" : "insufficient_data";
  return { ready: quality !== "insufficient_data", status: quality, observedDays: series.length, minimumRecommendedDays: 7, activeModel: model ? { id: model.id, version: model.version, status: model.status, algorithm: model.algorithm } : null };
};

export const trainDemandModel = async ({ scope, itemKey, lookbackDays = 30, horizon = 7 }) => {
  if (!itemKey) throw new Error("itemKey is required for model training.");
  const days = safeDays(lookbackDays);
  const forecastHorizon = safeHorizon(horizon);
  const series = await getObservedSeries({ ...scope, itemKey: String(itemKey), lookbackDays: days });
  if (series.length < 3) throw new Error("At least 3 observed demand days are required to train a model.");

  const values = series.map((row) => n(row.value));
  const split = Math.max(2, Math.floor(values.length * 0.8));
  const trainValues = values.slice(0, split);
  const validationValues = values.slice(split);
  const validationPredictions = validationValues.map((_, i) => movingAverage(values.slice(0, split + i), 7));
  const metrics = errorMetrics(validationValues, validationPredictions);
  const startedAt = new Date();
  const versionBase = `v${startedAt.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
  const model = { id: createEntityId("mlmodel"), organizationId: scope.organizationId || null, officeId: String(scope.officeId), vendorId: String(scope.vendorId), name: modelName, task: "demand_forecasting", algorithm, version: versionBase, status: "active", isActive: true, featureSet: ["recent_demand", "rolling_mean_7d", "trend_14d"], hyperparameters: { window: 7, trendWindow: 14, horizon: forecastHorizon }, createdAt: startedAt, updatedAt: startedAt };
  const run = { id: createEntityId("mlrun"), organizationId: scope.organizationId || null, officeId: String(scope.officeId), vendorId: String(scope.vendorId), modelId: model.id, status: "completed", datasetRows: values.length, trainRows: trainValues.length, validationRows: validationValues.length, mae: metrics.mae, rmse: metrics.rmse, mape: metrics.mape, startedAt, completedAt: new Date(), metadata: { itemKey: String(itemKey), lookbackDays: days, horizon: forecastHorizon, dataSource: isPostgresEnabled() ? "postgresql" : "json-demo" }, createdAt: new Date() };

  if (isPostgresEnabled()) {
    const prisma = await getPrisma();
    await prisma.$transaction(async (tx) => {
      await tx.mLModel.updateMany({ where: { ...scopeWhere(scope), name: modelName, isActive: true }, data: { isActive: false } });
      await tx.mLModel.create({ data: { ...model, featureSet: model.featureSet, hyperparameters: model.hyperparameters } });
      await tx.mLTrainingRun.create({ data: run });
    });
  } else {
    const db = readDb();
    db.mlModels = Array.isArray(db.mlModels) ? db.mlModels : [];
    db.mlTrainingRuns = Array.isArray(db.mlTrainingRuns) ? db.mlTrainingRuns : [];
    db.mlModels.forEach((existing) => { if (existing.officeId === model.officeId && existing.vendorId === model.vendorId && existing.name === model.name) existing.isActive = false; });
    db.mlModels.push({ ...model, createdAt: startedAt.toISOString(), updatedAt: startedAt.toISOString() });
    db.mlTrainingRuns.push({ ...run, startedAt: startedAt.toISOString(), completedAt: run.completedAt.toISOString(), createdAt: run.createdAt.toISOString() });
    writeDb(db);
  }
  return { model, trainingRun: run, metrics, dataset: { rows: values.length, trainRows: trainValues.length, validationRows: validationValues.length }, dataSource: isPostgresEnabled() ? "postgresql" : "json-demo" };
};

export const predictDemand = async ({ scope, itemKey, horizon = 7, lookbackDays = 30 }) => {
  if (!itemKey) throw new Error("itemKey is required for prediction.");
  const model = await latestModel(scope);
  if (!model) throw new Error("No trained demand model exists for this workspace. Train a model first.");
  const series = await getObservedSeries({ ...scope, itemKey: String(itemKey), lookbackDays: safeDays(lookbackDays) });
  if (series.length < 3) throw new Error("At least 3 observed demand days are required for prediction.");
  const values = series.map((row) => n(row.value));
  const predictions = forecastValues(values, safeHorizon(horizon));
  const confidence = clamp(1 - (movingAverage(values, 7) ? Math.min(0.75, Math.abs(trendSlope(values.slice(-14))) / Math.max(1, movingAverage(values, 7))) : 0.75), 0.25, 0.95);
  const baseDate = new Date();
  const rows = predictions.map((value, index) => ({ id: createEntityId("pred"), organizationId: scope.organizationId || null, officeId: String(scope.officeId), vendorId: String(scope.vendorId), modelId: model.id, itemKey: String(itemKey), predictedAt: new Date(baseDate.getTime() + (index + 1) * 86400000), horizonStep: index + 1, predictedValue: round(value), lowerBound: round(Math.max(0, value * 0.75)), upperBound: round(value * 1.25), confidence: round(confidence, 5), createdAt: new Date() }));
  if (isPostgresEnabled()) {
    const prisma = await getPrisma();
    await prisma.mLPrediction.createMany({ data: rows });
  } else {
    const db = readDb(); db.mlPredictions = Array.isArray(db.mlPredictions) ? db.mlPredictions : []; db.mlPredictions.push(...rows.map((r) => ({ ...r, predictedAt: r.predictedAt.toISOString(), createdAt: r.createdAt.toISOString() }))); writeDb(db);
  }
  return { model: { id: model.id, version: model.version, algorithm: model.algorithm }, itemKey: String(itemKey), predictions: rows, dataSource: isPostgresEnabled() ? "postgresql" : "json-demo" };
};

export const checkModelDrift = async ({ scope, itemKey, lookbackDays = 30 }) => {
  if (!itemKey) throw new Error("itemKey is required for drift checks.");
  const model = await latestModel(scope);
  if (!model) throw new Error("No trained demand model exists for this workspace.");
  const series = await getObservedSeries({ ...scope, itemKey: String(itemKey), lookbackDays: safeDays(lookbackDays) });
  const values = series.map((row) => n(row.value));
  if (values.length < 6) throw new Error("At least 6 observed demand days are required for drift analysis.");
  const midpoint = Math.floor(values.length / 2);
  const baseline = values.slice(0, midpoint);
  const recent = values.slice(midpoint);
  const baselineMean = baseline.reduce((a, b) => a + b, 0) / baseline.length;
  const recentMean = recent.reduce((a, b) => a + b, 0) / recent.length;
  const driftScore = Math.abs(recentMean - baselineMean) / Math.max(1, Math.abs(baselineMean));
  const status = driftScore >= 0.5 ? "critical" : driftScore >= 0.25 ? "warning" : "stable";
  const row = { id: createEntityId("drift"), organizationId: scope.organizationId || null, officeId: String(scope.officeId), vendorId: String(scope.vendorId), modelId: model.id, feature: String(itemKey), baselineMean: round(baselineMean, 6), recentMean: round(recentMean, 6), driftScore: round(driftScore, 6), status, checkedAt: new Date() };
  if (isPostgresEnabled()) { const prisma = await getPrisma(); await prisma.mLDriftCheck.create({ data: row }); }
  else { const db = readDb(); db.mlDriftChecks = Array.isArray(db.mlDriftChecks) ? db.mlDriftChecks : []; db.mlDriftChecks.push({ ...row, checkedAt: row.checkedAt.toISOString() }); writeDb(db); }
  return { ...row, model: { id: model.id, version: model.version }, dataSource: isPostgresEnabled() ? "postgresql" : "json-demo" };
};

export const listMLRuns = async (scope, limit = 20) => {
  const take = clamp(Number(limit) || 20, 1, 100);
  if (isPostgresEnabled()) { const prisma = await getPrisma(); return prisma.mLTrainingRun.findMany({ where: scopeWhere(scope), orderBy: { createdAt: "desc" }, take }); }
  const db = readDb(); return (Array.isArray(db.mlTrainingRuns) ? db.mlTrainingRuns : []).filter((r) => r.officeId === String(scope.officeId) && r.vendorId === String(scope.vendorId)).sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt)).slice(0, take);
};
