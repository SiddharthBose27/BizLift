import { recordRequestMetric } from "./observabilityService.js";
export const logRequest = (req, res, next) => {
  const started = Date.now();
  res.on("finish", () => {
    const durationMs = Date.now() - started;
    recordRequestMetric({ status: res.statusCode, durationMs });
    console.log(JSON.stringify({
      type: "api_request",
      requestId: req.context?.requestId || null,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs,
      organizationId: req.tenant?.organizationId || req.auth?.user?.organizationId || null,
      officeId: req.tenant?.officeId || req.workspace?.officeId || null,
      vendorId: req.tenant?.vendorId || req.workspace?.vendorId || null,
    }));
  });
  next();
};
