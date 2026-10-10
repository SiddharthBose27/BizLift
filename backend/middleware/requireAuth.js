import { readDb } from "../utils/db.js";
import { getPrisma } from "../utils/postgres.js";
import { hashSessionToken, isSessionExpired, sanitizeUser } from "../services/authService.js";

const authFailure = (res, message) => res.status(401).json({ success: false, message });

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!token) return authFailure(res, "Authentication required.");

    const prisma = await getPrisma();
    if (prisma) {
      const session = await prisma.session.findUnique({
        where: { tokenHash: hashSessionToken(token) },
        include: { user: true },
      });
      if (!session) return authFailure(res, "Invalid session.");
      if (session.revokedAt || session.expiresAt.getTime() <= Date.now()) return authFailure(res, "Session expired.");
      if (!session.user || !session.user.isActive) return authFailure(res, "User not found or inactive.");
      req.auth = { user: sanitizeUser(session.user), session };
      return next();
    }

    const db = readDb();
    const sessions = Array.isArray(db.sessions) ? db.sessions : [];
    const users = Array.isArray(db.users) ? db.users : [];
    const tokenHash = hashSessionToken(token);
    const session = sessions.find((entry) => entry.tokenHash === tokenHash || entry.token === token);
    if (!session) return authFailure(res, "Invalid session.");
    if (session.revokedAt || isSessionExpired(session)) return authFailure(res, "Session expired.");
    const user = users.find((entry) => String(entry.id) === String(session.userId));
    if (!user || !user.isActive) return authFailure(res, "User not found or inactive.");
    session.lastSeenAt = new Date().toISOString();
    req.auth = { user: sanitizeUser(user), session };
    return next();
  } catch (error) {
    console.error("Authentication middleware error:", error);
    return res.status(500).json({ success: false, message: "Authentication service unavailable." });
  }
};
