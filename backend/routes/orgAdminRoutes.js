import express from "express";
import crypto from "node:crypto";
import { requireAuth } from "../middleware/requireAuth.js";
import { getPrisma } from "../utils/postgres.js";

const router = express.Router();
const makeId = (prefix) => `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`;
const orgRoles = new Set(["organization_admin", "org_admin", "office_admin", "owner", "admin"]);
const failDb = (res) => res.status(503).json({ success: false, message: "Organization administration requires PostgreSQL mode." });
router.use(requireAuth, (req, res, next) => {
  const user = req.auth?.user;
  if (!user?.organizationId || !orgRoles.has(String(user.role || "").toLowerCase())) {
    return res.status(403).json({ success: false, message: "Organization administrator access required." });
  }
  next();
});

router.get("/overview", async (req, res) => {
  const prisma = await getPrisma(); if (!prisma) return failDb(res);
  const organizationId = req.auth.user.organizationId;
  const [organization, offices, outlets, users, inactiveUsers, auditEvents] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true, name: true, slug: true, createdAt: true } }),
    prisma.office.count({ where: { organizationId } }),
    prisma.vendor.count({ where: { office: { is: { organizationId } } } }),
    prisma.user.count({ where: { organizationId } }),
    prisma.user.count({ where: { organizationId, isActive: false } }),
    prisma.auditEvent.count({ where: { organizationId } }),
  ]);
  if (!organization) return res.status(404).json({ success: false, message: "Organization not found." });
  res.json({ success: true, data: { organization, offices, outlets, users, inactiveUsers, auditEvents } });
});

router.get("/outlets", async (req, res) => {
  const prisma = await getPrisma(); if (!prisma) return failDb(res);
  const offices = await prisma.office.findMany({ where: { organizationId: req.auth.user.organizationId }, orderBy: { name: "asc" }, include: { vendors: { orderBy: { name: "asc" }, include: { _count: { select: { users: true, inventory: true } } } } } });
  res.json({ success: true, data: offices.map((office) => ({ id: office.id, name: office.name, outlets: office.vendors.map((v) => ({ id: v.id, name: v.name, email: v.email, userCount: v._count.users, inventoryItems: v._count.inventory })) })) });
});

router.get("/users", async (req, res) => {
  const prisma = await getPrisma(); if (!prisma) return failDb(res);
  const users = await prisma.user.findMany({ where: { organizationId: req.auth.user.organizationId }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, role: true, isActive: true, officeId: true, vendorId: true, createdAt: true, office: { select: { name: true } }, vendor: { select: { name: true } } } });
  res.json({ success: true, data: users });
});

router.patch("/users/:userId", async (req, res) => {
  const prisma = await getPrisma(); if (!prisma) return failDb(res);
  const organizationId = req.auth.user.organizationId;
  const target = await prisma.user.findFirst({ where: { id: req.params.userId, organizationId } });
  if (!target) return res.status(404).json({ success: false, message: "User not found in your organization." });
  if (target.id === req.auth.user.id && req.body?.isActive === false) return res.status(400).json({ success: false, message: "You cannot deactivate your own account." });
  const data = {};
  if (typeof req.body?.isActive === "boolean") data.isActive = req.body.isActive;
  const allowedRoles = new Set(["organization_admin", "office_admin", "manager", "vendor", "inventory_manager", "cashier", "analyst", "viewer"]);
  if (req.body?.role !== undefined) {
    const role = String(req.body.role).toLowerCase();
    if (!allowedRoles.has(role)) return res.status(400).json({ success: false, message: "That role cannot be assigned from the organization portal." });
    if (target.id === req.auth.user.id && role !== target.role) return res.status(400).json({ success: false, message: "You cannot change your own role." });
    data.role = role;
  }
  if (!Object.keys(data).length) return res.status(400).json({ success: false, message: "Provide isActive and/or role." });
  const updated = await prisma.user.update({ where: { id: target.id }, data, select: { id: true, name: true, email: true, role: true, isActive: true } });
  await prisma.auditEvent.create({ data: { id: makeId("audit"), organizationId, officeId: target.officeId, vendorId: target.vendorId, eventType: "organization_admin", action: "user.updated", resourceType: "user", resourceId: target.id, userId: req.auth.user.id, status: "success", metadata: data } }).catch(() => {});
  res.json({ success: true, data: updated });
});

router.get("/activity", async (req, res) => {
  const prisma = await getPrisma(); if (!prisma) return failDb(res);
  const rows = await prisma.auditEvent.findMany({ where: { organizationId: req.auth.user.organizationId }, orderBy: { createdAt: "desc" }, take: 25, select: { id: true, eventType: true, action: true, resourceType: true, resourceId: true, status: true, createdAt: true, user: { select: { name: true, email: true } } } });
  res.json({ success: true, data: rows });
});
export default router;
