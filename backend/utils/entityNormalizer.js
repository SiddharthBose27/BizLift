// server/utils/entityNormalizer.js

export const trimString = (value) => String(value || "").trim();

export const normalizeNullableString = (value) => {
  const trimmed = trimString(value);
  return trimmed || null;
};

export const normalizeArray = (value) => (Array.isArray(value) ? value : []);

export const normalizeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const normalizeTimestamp = (value = new Date().toISOString()) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? new Date().toISOString()
    : date.toISOString();
};
