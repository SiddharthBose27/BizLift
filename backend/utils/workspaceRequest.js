/**
 * server/utils/workspaceRequest.js (Batch 9)
 * Standardize extraction and validation of officeId and vendorId.
 */

export const getWorkspaceContext = (req) => {
  const officeId =
    req.body?.officeId ||
    req.query?.officeId ||
    req.params?.officeId ||
    null;

  const vendorId =
    req.body?.vendorId ||
    req.query?.vendorId ||
    req.params?.vendorId ||
    null;

  return {
    officeId: officeId ? String(officeId).trim() : "",
    vendorId: vendorId ? String(vendorId).trim() : "",
  };
};

export const validateWorkspaceContext = ({ officeId, vendorId }) => {
  const errors = [];

  if (!officeId) errors.push("officeId is required.");
  if (!vendorId) errors.push("vendorId is required.");

  return {
    ok: errors.length === 0,
    errors,
  };
};
