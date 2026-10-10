export const getWorkspaceContextFromRequest = (req) => {
  const officeId =
    req.headers["x-office-id"] ||
    req.query.officeId ||
    req.body?.officeId ||
    "demo-office";

  const vendorId =
    req.headers["x-vendor-id"] ||
    req.query.vendorId ||
    req.body?.vendorId ||
    "demo-vendor";

  return {
    officeId: String(officeId),
    vendorId: String(vendorId),
    workspaceKey: `${officeId}::${vendorId}`,
  };
};
