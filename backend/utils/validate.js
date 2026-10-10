import { badRequest } from "./appError.js";

export const requiredString = (value, field) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw badRequest(`${field} is required.`);
  return normalized;
};

export const optionalString = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return String(value).trim();
};

export const positiveInt = (value, field) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw badRequest(`${field} must be a positive integer.`);
  return parsed;
};
