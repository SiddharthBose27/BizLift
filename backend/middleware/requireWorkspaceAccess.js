import { assertWorkspaceBelongsToTenant, buildTenantContext } from "../services/tenantService.js";

/**
 * Batch 13 tenant boundary.
 * The browser may request a workspace, but the server is authoritative about
 * whether that workspace belongs to the authenticated user's organization.
 */
export const requireWorkspaceAccess = async (req, res, next) => {
  try {
    const user = req.auth?.user;
    const officeId = req.workspace?.officeId;
    const vendorId = req.workspace?.vendorId;

    if (!user) {
      return res.status(401).json({ success: false, message: "Authentication required for workspace access." });
    }

    const result = await assertWorkspaceBelongsToTenant({ user, officeId, vendorId });
    if (!result.ok) {
      return res.status(result.status || 403).json({ success: false, message: result.message });
    }

    req.tenant = buildTenantContext({ user, officeId, vendorId, tenant: result });
    req.workspace = {
      ...req.workspace,
      organizationId: req.tenant.organizationId,
      workspaceKey: req.tenant.workspaceKey,
    };

    return next();
  } catch (error) {
    console.error("Tenant boundary error:", error);
    return res.status(500).json({ success: false, message: "Tenant authorization service unavailable." });
  }
};
