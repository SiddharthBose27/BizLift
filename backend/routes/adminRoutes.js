import express from "express";
import crypto from "node:crypto";
import { requireAuth } from "../middleware/requireAuth.js";
import { getPrisma } from "../utils/postgres.js";
import { hasPermission, hashPassword } from "../services/authService.js";

const router = express.Router();
const id = (prefix) => `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`;
const clean = (value) => String(value ?? "").trim();
const isPlatformAdmin = (user) => ["super_admin", "platform_admin"].includes(String(user?.role || "").toLowerCase());
const deny = (res) => res.status(403).json({ success: false, message: "Platform administrator access required." });
const postgresRequired = (res) => res.status(503).json({ success: false, message: "Platform administration requires PostgreSQL mode." });

router.use(requireAuth, (req, res, next) => isPlatformAdmin(req.auth.user) ? next() : deny(res));

router.get("/overview", async (_req, res) => {
  const prisma = await getPrisma();
  if (!prisma) return postgresRequired(res);
  const [organizations, offices, vendors, users, inactiveUsers] = await Promise.all([
    prisma.organization.count(), prisma.office.count(), prisma.vendor.count(),
    prisma.user.count(), prisma.user.count({ where: { isActive: false } }),
  ]);
  res.json({ success: true, data: { organizations, offices, outlets: vendors, users, inactiveUsers } });
});

router.get("/organizations", async (_req, res) => {
  const prisma = await getPrisma();
  if (!prisma) return postgresRequired(res);
  const rows = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { offices: true, users: true } }, offices: { include: { _count: { select: { vendors: true } } } } },
  });
  res.json({ success: true, data: rows.map((o) => ({ id: o.id, name: o.name, slug: o.slug, createdAt: o.createdAt, officeCount: o._count.offices, userCount: o._count.users, outletCount: o.offices.reduce((n, office) => n + office._count.vendors, 0) })) });
});

router.post("/organizations", async (req, res) => {
  const name = clean(req.body?.name);
  const slug = clean(req.body?.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  if (name.length < 2 || !/^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/.test(slug)) return res.status(400).json({ success: false, message: "Provide an organization name and a slug with 3–60 lowercase letters, numbers, or hyphens." });
  const prisma = await getPrisma();
  if (!prisma) return postgresRequired(res);
  try {
    const org = await prisma.organization.create({ data: { id: id("org"), name, slug } });
    await prisma.auditEvent.create({ data: { id: id("audit"), organizationId: org.id, eventType: "platform_admin", action: "organization.created", resourceType: "organization", resourceId: org.id, userId: req.auth.user.id, status: "success", metadata: { name, slug } } }).catch(() => {});
    res.status(201).json({ success: true, data: org });
  } catch (error) {
    if (error.code === "P2002") return res.status(409).json({ success: false, message: "That organization slug is already in use." });
    throw error;
  }
});

router.post("/onboarding", async (req, res) => {
  const organizationName = clean(req.body?.organizationName);
  const slug = clean(req.body?.slug || organizationName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  const locationName = clean(req.body?.locationName);
  const outletName = clean(req.body?.outletName);
  const adminName = clean(req.body?.adminName);
  const adminEmail = clean(req.body?.adminEmail).toLowerCase();
  if (organizationName.length < 2 || !/^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/.test(slug) || !locationName || !outletName || adminName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    return res.status(400).json({ success: false, message: "Provide a valid organization, slug, location, outlet, administrator name, and email." });
  }
  const prisma = await getPrisma();
  if (!prisma) return postgresRequired(res);
  if (await prisma.user.findUnique({ where: { email: adminEmail } })) return res.status(409).json({ success: false, message: "That administrator email already has an account." });
  const organizationId = id("org"), officeId = id("office"), vendorId = id("outlet"), userId = id("user");
  const randomPassword = crypto.randomBytes(32).toString("base64url");
  try {
    const result = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({ data: { id: organizationId, name: organizationName, slug } });
      const office = await tx.office.create({ data: { id: officeId, organizationId, name: locationName } });
      const outlet = await tx.vendor.create({ data: { id: vendorId, officeId, name: outletName, email: adminEmail } });
      const administrator = await tx.user.create({ data: { id: userId, organizationId, officeId, vendorId, name: adminName, email: adminEmail, role: "organization_admin", passwordHash: hashPassword(randomPassword), isActive: false } });
      await tx.auditEvent.create({ data: { id: id("audit"), organizationId, officeId, vendorId, eventType: "platform_admin", action: "organization.onboarded", resourceType: "organization", resourceId: organizationId, userId: req.auth.user.id, status: "success", metadata: { slug, locationName, outletName, adminEmail, activation: "pending" } } });
      return { organization, office, outlet, administrator };
    });
    return res.status(201).json({ success: true, data: { organizationId: result.organization.id, organizationName: result.organization.name, slug: result.organization.slug, officeId: result.office.id, locationName: result.office.name, outletId: result.outlet.id, outletName: result.outlet.name, administratorEmail: result.administrator.email, administratorStatus: "pending_activation", invitationDelivery: "not_configured" }, message: "Organization onboarded. The administrator remains inactive until a secure invitation and activation flow is configured." });
  } catch (error) {
    if (error.code === "P2002") return res.status(409).json({ success: false, message: "That organization slug or administrator email is already in use." });
    throw error;
  }
});

router.post("/organizations/:organizationId/outlets", async (req, res) => {
  const organizationId = clean(req.params.organizationId);
  const officeName = clean(req.body?.locationName || req.body?.officeName);
  const outletName = clean(req.body?.name || req.body?.outletName);
  const email = clean(req.body?.adminEmail).toLowerCase();
  if (!officeName || !outletName || !email.includes("@")) return res.status(400).json({ success: false, message: "Location name, outlet name, and a valid administrator email are required." });
  const prisma = await getPrisma();
  if (!prisma) return postgresRequired(res);
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) return res.status(404).json({ success: false, message: "Organization not found." });
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) return res.status(409).json({ success: false, message: "This email already has an account. Use the existing-user assignment flow instead." });
  const officeId = id("office");
  const vendorId = id("outlet");
  const temporaryPassword = crypto.randomBytes(24).toString("base64url");
  const result = await prisma.$transaction(async (tx) => {
    const office = await tx.office.create({ data: { id: officeId, organizationId, name: officeName } });
    const vendor = await tx.vendor.create({ data: { id: vendorId, officeId, name: outletName, email } });
    // Create an inactive administrator with a random undisclosed password. Invitation delivery is intentionally not implied.
    const user = await tx.user.create({ data: { id: id("user"), organizationId, officeId, vendorId, name: clean(req.body?.adminName) || "Outlet Administrator", email, role: "vendor", passwordHash: hashPassword(temporaryPassword), isActive: false } });
    return { office, vendor, user };
  });
  await prisma.auditEvent.create({ data: { id: id("audit"), organizationId, officeId, vendorId, eventType: "platform_admin", action: "outlet.registered", resourceType: "vendor", resourceId: vendorId, userId: req.auth.user.id, status: "success", metadata: { outletName, adminEmail: email, status: "pending_invitation" }, officeId, vendorId } }).catch(() => {});
  res.status(201).json({ success: true, data: { organizationId, officeId: result.office.id, officeName: result.office.name, outletId: result.vendor.id, outletName: result.vendor.name, administratorEmail: result.user.email, status: "pending_invitation", invitationDelivery: "not_configured" }, message: "Outlet registered. The administrator account is inactive until a secure invitation/activation flow is configured." });
});

export default router;
