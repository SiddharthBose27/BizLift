import { hasPermission } from "../services/authService.js";

export const requireRole = (...roles) => (req, res, next) => {
  const role = String(req.auth?.user?.role || "");
  if (!roles.includes(role)) {
    return res.status(403).json({ success: false, message: "Your role does not permit this action." });
  }
  return next();
};

export const requirePermission = (permission) => (req, res, next) => {
  const role = req.auth?.user?.role;
  if (!hasPermission(role, permission)) {
    return res.status(403).json({ success: false, message: `Permission denied: ${permission}.` });
  }
  return next();
};
