import { listAnalyticsEvents } from "./dataPlatformService.js";

const subscribers = new Map();
// Office + outlet identifiers are globally scoped by the platform registry; using the
// same pair keeps publishers and subscribers aligned even when one caller has richer
// organization metadata than another.
const keyFor = ({ officeId, vendorId }) => `${officeId}:${vendorId}`;

const safeJson = (value) => {
  try { return JSON.stringify(value); } catch { return JSON.stringify({}); }
};

export const publishRealtimeEvent = ({ scope, event }) => {
  const key = keyFor(scope);
  const listeners = subscribers.get(key) || new Set();
  const payload = { type: "bizlift.event", event };
  listeners.forEach((listener) => {
    try { listener(payload); } catch { /* subscriber owns cleanup */ }
  });
  return listeners.size;
};

export const subscribeRealtime = ({ scope, listener }) => {
  const key = keyFor(scope);
  if (!subscribers.has(key)) subscribers.set(key, new Set());
  const listeners = subscribers.get(key);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) subscribers.delete(key);
  };
};

export const replayRealtimeEvents = async ({ scope, limit = 25 }) => {
  const rows = await listAnalyticsEvents({ scope, limit });
  return rows.reverse().map((event) => ({ type: "bizlift.event", event }));
};

export const writeSSE = (res, payload) => {
  res.write(`event: ${payload.type}\ndata: ${safeJson(payload.event || payload.data || payload)}\n\n`);
};

export const getRealtimeSubscriberCount = () => Array.from(subscribers.values()).reduce((sum, set) => sum + set.size, 0);
