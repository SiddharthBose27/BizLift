import { getRealtimeSubscriberCount, replayRealtimeEvents, subscribeRealtime, writeSSE } from "../services/realtimeEventService.js";

export const getRealtimeHealth = async (req, res) => {
  res.json({
    success: true,
    data: {
      transport: "sse",
      replaySource: "analytics_events",
      subscribers: getRealtimeSubscriberCount(),
      workspace: req.workspace,
    },
  });
};

export const streamRealtimeEvents = async (req, res) => {
  const scope = req.tenant || req.workspace;
  const limit = Math.min(100, Math.max(0, Number(req.query?.replay || 25)));

  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  if (typeof res.flushHeaders === "function") res.flushHeaders();

  res.write(`retry: 5000\n\n`);
  writeSSE(res, { type: "bizlift.connected", data: { workspace: req.workspace, replay: limit } });

  if (limit > 0) {
    const replay = await replayRealtimeEvents({ scope, limit });
    replay.forEach((event) => writeSSE(res, event));
  }

  const unsubscribe = subscribeRealtime({ scope, listener: (payload) => writeSSE(res, payload) });
  const heartbeat = setInterval(() => {
    try { res.write(`: heartbeat ${Date.now()}\n\n`); } catch { /* connection cleanup handles it */ }
  }, 15000);

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
};
