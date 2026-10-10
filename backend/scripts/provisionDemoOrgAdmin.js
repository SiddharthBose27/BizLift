import { getPrisma } from "../utils/postgres.js";
import { hashPassword } from "../services/authService.js";
const enabled = String(process.env.BIZLIFT_ENABLE_DEMO_ADMIN || "").toLowerCase() === "true";
if (!enabled || String(process.env.NODE_ENV || "").toLowerCase() === "production") {
  console.error("Demo organization-admin provisioning requires BIZLIFT_ENABLE_DEMO_ADMIN=true and is disabled in production.");
  process.exit(1);
}
const prisma = await getPrisma();
if (!prisma) { console.error("PostgreSQL mode is required. Configure BIZLIFT_DB_MODE=postgres and DATABASE_URL."); process.exit(1); }
const organization = await prisma.organization.upsert({ where: { slug: "bizlift-demo" }, update: {}, create: { id: `org_demo_${Date.now()}`, name: "BizLift Demo Organization", slug: "bizlift-demo" } });
// Give the demo tenant an outlet so the administrator can immediately test inventory imports.
const office = await prisma.office.upsert({ where: { id: "office_bizlift_demo" }, update: { organizationId: organization.id, name: "Demo Campus" }, create: { id: "office_bizlift_demo", organizationId: organization.id, name: "Demo Campus" } });
await prisma.vendor.upsert({ where: { id: "vendor_bizlift_demo" }, update: { officeId: office.id, name: "Demo Restaurant", email: "restaurant@bizlift.local" }, create: { id: "vendor_bizlift_demo", officeId: office.id, name: "Demo Restaurant", email: "restaurant@bizlift.local" } });
const email = "demo.orgadmin@bizlift.local";
const password = "BizLiftOrg!2026";
const user = await prisma.user.upsert({ where: { email }, update: { name: "BizLift Demo Organization Admin", organizationId: organization.id, role: "organization_admin", passwordHash: hashPassword(password), isActive: true, officeId: null, vendorId: null }, create: { id: `user_org_demo_${Date.now()}`, name: "BizLift Demo Organization Admin", email, role: "organization_admin", organizationId: organization.id, passwordHash: hashPassword(password), isActive: true }, select: { email: true, role: true, organizationId: true } });
console.log("Demo organization administrator provisioned (local/demo use only):"); console.log(`Email: ${user.email}`); console.log(`Password: ${password}`); console.log(`Organization: ${organization.name} (${user.organizationId})`); console.log("Change/delete this account before any public deployment."); await prisma.$disconnect();
