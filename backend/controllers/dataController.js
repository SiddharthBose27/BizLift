import { send } from "../utils/controller.js";
import { requiredString } from "../utils/validate.js";
import { publishRealtimeEvent } from "../services/realtimeEventService.js";
import {
  buildDataOverview,
  captureMetricSnapshots,
  listAnalyticsEvents,
  recordAnalyticsEvent,
  runDataQualityChecks,
} from "../services/dataPlatformService.js";

export const getDataOverview = async (req, res) => {
  const data = await buildDataOverview(req.tenant || req.workspace);
  return send(res, { data, workspace: req.workspace }, "Data overview ready");
};

export const getDataQuality = async (req, res) => {
  const data = await runDataQualityChecks(req.tenant || req.workspace);
  return send(res, { data, workspace: req.workspace }, "Data quality checked");
};

export const postDataSnapshot = async (req, res) => {
  const overview = await buildDataOverview(req.tenant || req.workspace);
  const result = await captureMetricSnapshots({
    scope: req.tenant || req.workspace,
    metrics: overview.metrics,
    dimension: req.body?.dimension || null,
  });
  return send(res, { data: result, workspace: req.workspace }, "Metric snapshot captured", 201);
};

export const postAnalyticsEvent = async (req, res) => {
  const eventName = requiredString(req.body?.eventName, "eventName");
  const scope = req.tenant || req.workspace;
  const event = await recordAnalyticsEvent({
    scope,
    userId: req.auth?.user?.id || null,
    eventName,
    entityType: req.body?.entityType || null,
    entityId: req.body?.entityId || null,
    payload: req.body?.payload ?? null,
  });
  publishRealtimeEvent({ scope, event });
  return send(res, { data: event, workspace: req.workspace }, "Analytics event recorded", 201);
};

export const getAnalyticsEvents = async (req, res) => {
  const data = await listAnalyticsEvents({
    scope: req.tenant || req.workspace,
    limit: req.query?.limit,
    eventName: req.query?.eventName,
  });
  return send(res, { data, workspace: req.workspace, count: data.length }, "Analytics events ready");
};
