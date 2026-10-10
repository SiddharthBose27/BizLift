import { ok } from "./apiResponse.js";

export const send = (res, data, message = "Success", status = 200) =>
  ok(res, data, message, status);

export const getTenantScope = (req) => ({
  organizationId: req.tenant?.organizationId || req.auth?.user?.organizationId || null,
  officeId: req.tenant?.officeId || req.workspace?.officeId || req.auth?.user?.officeId || null,
  vendorId: req.tenant?.vendorId || req.workspace?.vendorId || req.auth?.user?.vendorId || null,
  workspaceKey: req.tenant?.workspaceKey || req.workspace?.workspaceKey || null,
});
