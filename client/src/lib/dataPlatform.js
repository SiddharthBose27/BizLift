import { apiFetch } from "./api.js";

export const getDataOverview = () => apiFetch("/api/data/overview");
export const getDataQuality = () => apiFetch("/api/data/quality");
export const getAnalyticsEvents = (params = "") => apiFetch(`/api/data/events${params ? `?${params}` : ""}`);

export const recordAnalyticsEvent = ({ eventName, entityType, entityId, payload } = {}) =>
  apiFetch("/api/data/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventName, entityType, entityId, payload }),
  });

export const captureMetricSnapshot = (dimension = null) =>
  apiFetch("/api/data/snapshots", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dimension }),
  });
