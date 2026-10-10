import crypto from "crypto";
import { createEntityId } from "../utils/idFactory.js";
import { ROLE_NAMES } from "../domain/models.js";

export const hashPassword = (plainText) =>
  crypto.createHash("sha256").update(String(plainText)).digest("hex");

export const verifyPassword = (plainText, passwordHash) => {
  if (!plainText || !passwordHash) return false;
  return hashPassword(plainText) === passwordHash;
};

export const createSessionToken = () => crypto.randomBytes(32).toString("hex");

export const hashSessionToken = (token) =>
  crypto.createHash("sha256").update(String(token)).digest("hex");

export const findUserByEmail = (users, email) => users.find(
  (user) => String(user.email || "").trim().toLowerCase() === String(email || "").trim().toLowerCase(),
);

export const buildUserEntity = ({ officeId, vendorId = null, name, email, role, password }) => {
  const now = new Date().toISOString();
  return {
    id: createEntityId("user"), officeId, vendorId,
    name: String(name || "").trim(),
    email: String(email || "").trim().toLowerCase(),
    role, passwordHash: hashPassword(password), isActive: true,
    createdAt: now, updatedAt: now,
  };
};

export const buildSessionEntity = ({ userId, ttlHours = 24 }) => {
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + ttlHours * 60 * 60 * 1000);
  const token = createSessionToken();
  return {
    id: createEntityId("session"), userId, token,
    tokenHash: hashSessionToken(token),
    createdAt: createdAt.toISOString(), expiresAt: expiresAt.toISOString(), revokedAt: null,
  };
};

export const isSessionExpired = (session) =>
  new Date(session.expiresAt).getTime() <= Date.now();

export const ROLE_PERMISSIONS = {
  owner: ["*"],
  admin: ["*"],
  office_admin: ["*"],
  manager: ["dashboard:read", "inventory:read", "inventory:write", "pos:read", "pos:write", "reports:read", "analytics:read", "analytics:write", "copilot:read", "realtime:read", "ml:read", "ml:write", "suppliers:read", "suppliers:write", "procurement:read", "procurement:write", "actions:approve", "audit:read", "security:read", "observability:read"],
  vendor: ["dashboard:read", "inventory:read", "inventory:write", "pos:read", "pos:write", "reports:read", "analytics:read", "analytics:write", "copilot:read", "realtime:read", "ml:read", "ml:write", "suppliers:read", "suppliers:write", "procurement:read", "procurement:write", "actions:approve", "audit:read", "security:read", "observability:read"],
  inventory_manager: ["dashboard:read", "inventory:read", "inventory:write", "reports:read", "analytics:read", "analytics:write", "copilot:read", "realtime:read", "ml:read", "ml:write", "suppliers:read", "suppliers:write", "procurement:read", "procurement:write", "audit:read", "security:read", "observability:read"],
  cashier: ["dashboard:read", "pos:read", "pos:write"],
  analyst: ["dashboard:read", "reports:read", "analytics:read", "copilot:read", "ml:read", "ml:write", "audit:read", "security:read", "observability:read"],
  viewer: ["dashboard:read", "reports:read", "analytics:read", "copilot:read", "ml:read", "procurement:read", "audit:read", "security:read", "observability:read"],
};

export const getRolePermissions = (role) => ROLE_PERMISSIONS[String(role || "").toLowerCase()] || [];

export const hasPermission = (role, permission) => {
  const permissions = getRolePermissions(role);
  return permissions.includes("*") || permissions.includes(permission);
};

export const canAccessWorkspace = ({ user, officeId, vendorId }) => {
  if (!user || !user.isActive) return false;
  if (officeId && String(user.officeId) !== String(officeId)) return false;
  if (["office_admin", "owner", "admin"].includes(String(user.role))) return true;
  if (user.vendorId == null) return false;
  return String(user.vendorId).replace(/-/g, "") === String(vendorId || "").replace(/-/g, "");
};

export const sanitizeUser = (user) => ({
  id: user.id,
  organizationId: user.organizationId ?? null,
  officeId: user.officeId ?? null,
  vendorId: user.vendorId ?? null,
  name: user.name,
  email: user.email,
  role: user.role,
  isActive: user.isActive !== false,
  permissions: getRolePermissions(user.role),
});
