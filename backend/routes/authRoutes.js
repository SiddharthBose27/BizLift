import express from "express";
import { readDb, writeDb } from "../utils/db.js";
import { getPrisma } from "../utils/postgres.js";
import { verifyPassword, buildSessionEntity, findUserByEmail, sanitizeUser, getRolePermissions } from "../services/authService.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { loginRateLimit } from "../middleware/security.js";
import { ok } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { env } from "../config/env.js";
import { recordAuditEvent } from "../services/observabilityService.js";

const router = express.Router();

const canonicalVendorId = (user) => user.vendorId || null;

export const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedEmail || !password) {
      return res.status(400).json({ success: false, message: "Business email and password are required." });
    }

    const prisma = await getPrisma();
    if (prisma) {
      const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
        await recordAuditEvent({ req, eventType: "security", action: "auth.login.failed", status: "failure", metadata: { email: normalizedEmail } });
        return res.status(401).json({ success: false, message: "Invalid email or password.", requestId: req.context?.requestId });
      }
      const session = buildSessionEntity({ userId: user.id, ttlHours: env.SESSION_TTL_HOURS });
      await prisma.session.create({ data: {
        id: session.id,
        userId: user.id,
        tokenHash: session.tokenHash,
        expiresAt: new Date(session.expiresAt),
      }});
      await recordAuditEvent({ req, organizationId: user.organizationId, officeId: user.officeId, vendorId: user.vendorId, userId: user.id, eventType: "security", action: "auth.login.success", status: "success", metadata: { email: normalizedEmail } });
      return res.status(200).json({
        success: true,
        message: "Login successful",
        token: session.token,
        user: { ...sanitizeUser(user), vendorId: canonicalVendorId(user) },
        expiresAt: session.expiresAt,
      });
    }

    const db = readDb();
    if (!Array.isArray(db.users)) db.users = [];
    if (!Array.isArray(db.sessions)) db.sessions = [];
    const user = findUserByEmail(db.users, normalizedEmail);
    if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
      await recordAuditEvent({ req, eventType: "security", action: "auth.login.failed", status: "failure", metadata: { email: normalizedEmail } });
    return res.status(401).json({ success: false, message: "Invalid email or password." });
    }
    const session = buildSessionEntity({ userId: user.id, ttlHours: env.SESSION_TTL_HOURS });
    db.sessions.unshift(session);
    writeDb(db);
    await recordAuditEvent({ req, organizationId: user.organizationId, officeId: user.officeId, vendorId: user.vendorId, userId: user.id, eventType: "security", action: "auth.login.success", status: "success", metadata: { email: normalizedEmail } });
    return res.status(200).json({ success: true, message: "Login successful", token: session.token, user: sanitizeUser(user), expiresAt: session.expiresAt });
  } catch (error) {
    console.error("Login controller error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

router.post("/login", loginRateLimit, asyncHandler(login));

router.get("/me", requireAuth, (req, res) => res.json({ success: true, data: sanitizeUser(req.auth.user) }));

router.get("/context", requireAuth, (req, res) => res.json({
  success: true,
  data: {
    organizationId: req.auth.user.organizationId || null,
    officeId: req.auth.user.officeId || null,
    vendorId: req.auth.user.vendorId || null,
    role: req.auth.user.role,
  },
}));

router.get("/permissions", requireAuth, (req, res) => res.json({
  success: true,
  data: { role: req.auth.user.role, permissions: getRolePermissions(req.auth.user.role) },
}));

router.post("/logout", requireAuth, asyncHandler(async (req, res) => {
  const prisma = await getPrisma();
  if (prisma) {
    await prisma.session.update({ where: { id: req.auth.session.id }, data: { revokedAt: new Date() } });
    return ok(res, {}, "Logout successful.");
  }
  const db = readDb();
  db.sessions = (db.sessions || []).filter((session) => String(session.id) !== String(req.auth.session.id));
  writeDb(db);
  return ok(res, {}, "Logout successful.");
}));

router.post("/logout-all", requireAuth, asyncHandler(async (req, res) => {
  const prisma = await getPrisma();
  if (prisma) {
    await prisma.session.updateMany({ where: { userId: req.auth.user.id, revokedAt: null }, data: { revokedAt: new Date() } });
    return ok(res, {}, "All sessions revoked.");
  }
  const db = readDb();
  db.sessions = (db.sessions || []).filter((session) => String(session.userId) !== String(req.auth.user.id));
  writeDb(db);
  return ok(res, {}, "All sessions revoked.");
}));

export default router;
