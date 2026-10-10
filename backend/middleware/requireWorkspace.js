/**
 * Batch 13 workspace context extraction.
 * Vendor users may omit workspace identifiers because their authenticated
 * session already defines the only workspace they are allowed to access.
 * Office/organization administrators must still select a vendor workspace.
 */
import { getWorkspaceContext, validateWorkspaceContext } from "../utils/workspaceRequest.js";

export const requireWorkspace = (req, res, next) => {
  const requested = getWorkspaceContext(req);
  const user = req.auth?.user;
  const role = String(user?.role || "").toLowerCase();

  const officeId = requested.officeId || (user?.officeId && !["owner", "admin"].includes(role) ? String(user.officeId) : "");
  const vendorId = requested.vendorId || (user?.vendorId ? String(user.vendorId) : "");

  const context = { officeId, vendorId };
  const validation = validateWorkspaceContext(context);

  if (!validation.ok) {
    return res.status(400).json({
      success: false,
      message: "Workspace context is required.",
      errors: validation.errors,
    });
  }

  req.workspace = context;
  next();
};
