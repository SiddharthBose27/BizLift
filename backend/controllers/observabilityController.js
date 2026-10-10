import { getHealth, getOperationalMetrics, listAuditEvents } from "../services/observabilityService.js";

export const health = async (req, res) => {
  const data = await getHealth();
  res.status(data.status === "healthy" ? 200 : 503).json({ success: true, data, requestId: req.context?.requestId });
};

export const metrics = async (req, res) => res.json({ success: true, data: await getOperationalMetrics(), requestId: req.context?.requestId });

export const audit = async (req, res) => {
  const events = await listAuditEvents({ organizationId: req.tenant.organizationId, officeId: req.workspace.officeId, vendorId: req.workspace.vendorId, eventType: req.query.eventType, limit: req.query.limit });
  res.json({ success: true, data: events, workspace: req.workspace, requestId: req.context?.requestId });
};

export const security = async (req, res) => {
  const events = await listAuditEvents({ organizationId: req.tenant.organizationId, officeId: req.workspace.officeId, vendorId: req.workspace.vendorId, eventType: "security", limit: req.query.limit });
  res.json({ success: true, data: events, workspace: req.workspace, requestId: req.context?.requestId });
};
