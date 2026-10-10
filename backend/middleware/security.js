import { recordRateLimitMetric, setRateLimitBucketCount } from "../services/rateLimitMetrics.js";

const buckets = new Map();

export const getRateLimitStats = () => ({ buckets: buckets.size, sampledAt: new Date().toISOString() });

export const securityHeaders = (req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  next();
};

export const requestRateLimit = ({ windowMs = 60_000, max = 120, key = (req) => req.ip || "unknown" } = {}) => (req, res, next) => {
  const now = Date.now();
  const bucketKey = key(req);
  const current = buckets.get(bucketKey);
  if (!current || now - current.startedAt >= windowMs) {
    buckets.set(bucketKey, { startedAt: now, count: 1 });
    setRateLimitBucketCount(buckets.size);
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(max - 1, 0)));
    return next();
  }
  current.count += 1;
  setRateLimitBucketCount(buckets.size);
  res.setHeader("X-RateLimit-Limit", String(max));
  res.setHeader("X-RateLimit-Remaining", String(Math.max(max - current.count, 0)));
  if (current.count > max) {
    recordRateLimitMetric();
    res.setHeader("Retry-After", Math.ceil((windowMs - (now - current.startedAt)) / 1000));
    return res.status(429).json({ success: false, message: "Too many requests. Please try again shortly.", requestId: req.context?.requestId });
  }
  return next();
};

export const loginRateLimit = requestRateLimit({ windowMs: 15 * 60_000, max: 20, key: (req) => `${req.ip || "unknown"}:${String(req.body?.email || "").trim().toLowerCase()}` });
