import crypto from "crypto";

export const requestContext = (req, res, next) => {
  const incoming = String(req.headers["x-request-id"] || "").trim();
  const requestId = incoming && incoming.length <= 100 ? incoming : crypto.randomUUID();
  req.context = {
    requestId,
    startedAt: Date.now(),
  };
  res.setHeader("x-request-id", requestId);
  next();
};
