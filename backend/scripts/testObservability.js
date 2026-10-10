import assert from "assert";
import { getHealth, getOperationalMetrics, listAuditEvents, recordAuditEvent } from "../services/observabilityService.js";
import { getRolePermissions, hasPermission } from "../services/authService.js";

const baseReq = (vendorId = "snapeats") => ({
  context: { requestId: `batch20-${vendorId}` },
  tenant: { organizationId: "org-techpark", officeId: "techpark-one", vendorId },
  workspace: { organizationId: "org-techpark", officeId: "techpark-one", vendorId },
  auth: { user: { id: `user-${vendorId}`, organizationId: "org-techpark", officeId: "techpark-one", vendorId, role: "vendor" } },
  ip: "127.0.0.1",
  headers: { "user-agent": "batch20-test" },
});

const health = await getHealth();
assert.ok(["healthy", "degraded"].includes(health.status));
await recordAuditEvent({ req: baseReq(), eventType: "security", action: "batch20.security.test", metadata: { ok: true } });
await recordAuditEvent({ req: baseReq("quench"), eventType: "system", action: "batch20.quench.test" });
const scoped = await listAuditEvents({ organizationId: "org-techpark", officeId: "techpark-one", vendorId: "snapeats", limit: 20 });
assert.ok(scoped.every((event) => String(event.vendorId) === "snapeats"));
const metrics = await getOperationalMetrics();
assert.ok(metrics.requests && typeof metrics.requests.averageDurationMs === "number");
assert.ok(metrics.audit && typeof metrics.audit.totalEvents === "number");
assert.ok(hasPermission("vendor", "audit:read"));
assert.ok(hasPermission("vendor", "security:read"));
assert.ok(hasPermission("vendor", "observability:read"));
assert.ok(!getRolePermissions("cashier").includes("audit:read"));
console.log(JSON.stringify({ health: health.status, scopedAuditEvents: scoped.length, auditEvents: metrics.audit.totalEvents, permissions: "passed" }));
