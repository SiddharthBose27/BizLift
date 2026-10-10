import { getPrisma } from "../utils/postgres.js";
import { hashPassword } from "../services/authService.js";

const enabled = String(process.env.BIZLIFT_ENABLE_DEMO_ADMIN || "").toLowerCase() === "true";
if (!enabled) {
  console.error("Refusing to provision a demo administrator. Set BIZLIFT_ENABLE_DEMO_ADMIN=true in your local backend/.env for this one-time development setup.");
  process.exit(1);
}
if (String(process.env.NODE_ENV || "").toLowerCase() === "production") {
  console.error("Demo administrator provisioning is disabled in production.");
  process.exit(1);
}
const prisma = await getPrisma();
if (!prisma) {
  console.error("PostgreSQL mode is required. Set BIZLIFT_DB_MODE=postgres and configure DATABASE_URL.");
  process.exit(1);
}
const email = "demo.admin@bizlift.local";
const password = "BizLiftDemo!2026";
const user = await prisma.user.upsert({
  where: { email },
  update: { name: "BizLift Demo Platform Admin", role: "super_admin", passwordHash: hashPassword(password), isActive: true, organizationId: null, officeId: null, vendorId: null },
  create: { id: `user_demo_${Date.now()}`, name: "BizLift Demo Platform Admin", email, role: "super_admin", passwordHash: hashPassword(password), isActive: true },
  select: { id: true, email: true, role: true, isActive: true },
});
console.log("Demo platform administrator provisioned (local/demo use only):");
console.log(`Email: ${user.email}`);
console.log(`Password: ${password}`);
console.log(`Role: ${user.role}`);
console.log("Change/delete this account before any public deployment.");
await prisma.$disconnect();
