import os from "os";
import crypto from "crypto";
import { env } from "../config/env.js";
import { getPrisma, isPostgresEnabled } from "../utils/postgres.js";
import { readDb, writeDb } from "../utils/db.js";
import { getRateLimitMetrics } from "./rateLimitMetrics.js";

const startedAt = Date.now();
const metrics = { requests: 0, errors: 0, rateLimited: 0, totalDurationMs: 0, statusCounts: {} };

export const recordRequestMetric = ({ status, durationMs }) => {
  metrics.requests += 1;
  metrics.totalDurationMs += Number(durationMs || 0);
  const key = String(status || 0);
  metrics.statusCounts[key] = (metrics.statusCounts[key] || 0) + 1;
  if (Number(status) >= 500) metrics.errors += 1;
};


export const getOperationalMetrics = async () => {
  const db = isPostgresEnabled() ? await getPrisma() : null;
  let auditCount = 0;
  if (db) auditCount = await db.auditEvent.count();
  else auditCount = Array.isArray(readDb().auditEvents) ? readDb().auditEvents.length : 0;
  return {
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    process: { pid: process.pid, node: process.version, platform: process.platform, arch: process.arch, memoryRssMb: Math.round(process.memoryUsage().rss / 1024 / 1024) },
    host: { cpus: os.cpus().length, loadAverage: os.loadavg(), hostname: os.hostname() },
    requests: { ...metrics, averageDurationMs: metrics.requests ? Number((metrics.totalDurationMs / metrics.requests).toFixed(2)) : 0 },
    audit: { totalEvents: auditCount },
    rateLimit: getRateLimitMetrics(),
    database: { mode: env.DB_MODE, postgresConfigured: Boolean(env.DATABASE_URL), provider: isPostgresEnabled() ? "postgresql" : "json-demo" },
  };
};

export const getHealth = async () => {
  const checks = { database: { status: "skipped", provider: isPostgresEnabled() ? "postgresql" : "json-demo" } };
  let overall = "healthy";
  if (isPostgresEnabled()) {
    try { const prisma = await getPrisma(); await prisma.$queryRaw`SELECT 1`; checks.database.status = "healthy"; }
    catch (error) { checks.database = { status: "degraded", provider: "postgresql", error: error.message }; overall = "degraded"; }
  } else checks.database.status = "healthy";
  return { status: overall, timestamp: new Date().toISOString(), uptimeSeconds: Math.round((Date.now() - startedAt) / 1000), environment: env.NODE_ENV, checks };
};

export const recordAuditEvent = async ({ req, eventType = "system", action, status = "success", resourceType = null, resourceId = null, metadata = null, organizationId = null, officeId = null, vendorId = null, userId = null }) => {
  const event = {
    id: crypto.randomUUID(), organizationId: organizationId || req?.tenant?.organizationId || req?.auth?.user?.organizationId || null,
    officeId: officeId || req?.tenant?.officeId || req?.workspace?.officeId || req?.auth?.user?.officeId || null,
    vendorId: vendorId || req?.tenant?.vendorId || req?.workspace?.vendorId || req?.auth?.user?.vendorId || null,
    userId: userId || req?.auth?.user?.id || null,
    requestId: req?.context?.requestId || null, eventType, action, resourceType, resourceId, status,
    ipAddress: req?.ip || req?.socket?.remoteAddress || null,
    userAgent: req?.headers?.["user-agent"] || null, metadata, createdAt: new Date(),
  };
  try {
    const prisma = await getPrisma();
    if (prisma) return await prisma.auditEvent.create({ data: event });
    const db = readDb(); if (!Array.isArray(db.auditEvents)) db.auditEvents = [];
    db.auditEvents.unshift({ ...event, createdAt: event.createdAt.toISOString() });
    db.auditEvents = db.auditEvents.slice(0, 5000); writeDb(db); return event;
  } catch (error) { console.error(JSON.stringify({ type: "audit_persist_error", requestId: event.requestId, error: error.message })); return null; }
};

export const listAuditEvents = async ({ organizationId, officeId, vendorId, eventType, limit = 50 }) => {
  const take = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const prisma = await getPrisma();
  if (prisma) return prisma.auditEvent.findMany({ where: { organizationId: organizationId || undefined, officeId: officeId || undefined, vendorId: vendorId || undefined, eventType: eventType || undefined }, orderBy: { createdAt: "desc" }, take });
  const events = Array.isArray(readDb().auditEvents) ? readDb().auditEvents : [];
  return events.filter((e) => (!organizationId || String(e.organizationId) === String(organizationId)) && (!officeId || String(e.officeId) === String(officeId)) && (!vendorId || String(e.vendorId) === String(vendorId)) && (!eventType || e.eventType === eventType)).slice(0, take);
};
