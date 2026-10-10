const state = { buckets: 0, limited: 0 };
export const setRateLimitBucketCount = (count) => { state.buckets = Number(count) || 0; };
export const recordRateLimitMetric = () => { state.limited += 1; };
export const getRateLimitMetrics = () => ({ ...state, sampledAt: new Date().toISOString() });
