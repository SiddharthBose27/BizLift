import { send } from "../utils/controller.js";
import { requiredString } from "../utils/validate.js";
import { buildMLReadiness, trainDemandModel, predictDemand, checkModelDrift, listMLRuns } from "../services/mlPlatformService.js";

export const getMLReadiness = async (req, res) => send(res, { data: await buildMLReadiness(req.tenant || req.workspace), workspace: req.workspace }, "ML readiness ready");
export const trainMLModel = async (req, res) => {
  const itemKey = requiredString(req.body?.itemKey, "itemKey");
  const data = await trainDemandModel({ scope: req.tenant || req.workspace, itemKey, lookbackDays: req.body?.lookbackDays, horizon: req.body?.horizon });
  return send(res, { data, workspace: req.workspace }, "ML model trained", 201);
};
export const getMLPrediction = async (req, res) => {
  const itemKey = requiredString(req.query?.itemKey, "itemKey");
  const data = await predictDemand({ scope: req.tenant || req.workspace, itemKey, horizon: req.query?.horizon, lookbackDays: req.query?.lookbackDays });
  return send(res, { data, workspace: req.workspace }, "Demand prediction ready");
};
export const postMLDrift = async (req, res) => {
  const itemKey = requiredString(req.body?.itemKey, "itemKey");
  const data = await checkModelDrift({ scope: req.tenant || req.workspace, itemKey, lookbackDays: req.body?.lookbackDays });
  return send(res, { data, workspace: req.workspace }, "Model drift checked", 201);
};
export const getMLRuns = async (req, res) => send(res, { data: await listMLRuns(req.tenant || req.workspace, req.query?.limit), workspace: req.workspace }, "ML training runs ready");
