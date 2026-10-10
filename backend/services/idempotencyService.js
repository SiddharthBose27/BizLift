/** Workspace-scoped idempotency records for retried POS writes. */
export const getIdempotencyKey = (req) => {
  const value = String(req?.get?.("Idempotency-Key") || req?.body?.clientRequestId || "").trim();
  return value && value.length <= 160 ? value : null;
};

export const findIdempotentResponse = (workspaceState, key, operation) => {
  if (!key || !workspaceState) return null;
  const entry = workspaceState.idempotencyKeys?.[key];
  return entry?.operation === operation ? entry.response : null;
};

export const saveIdempotentResponse = (workspaceState, key, operation, response, now = new Date().toISOString()) => {
  if (!key || !workspaceState) return;
  if (!workspaceState.idempotencyKeys || typeof workspaceState.idempotencyKeys !== "object") workspaceState.idempotencyKeys = {};
  const entries = workspaceState.idempotencyKeys;
  entries[key] = { operation, response, savedAt: now };
  const ordered = Object.entries(entries).sort((a, b) => String(a[1]?.savedAt || "").localeCompare(String(b[1]?.savedAt || "")));
  for (const [oldKey] of ordered.slice(0, Math.max(0, ordered.length - 500))) delete entries[oldKey];
};
