import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../services/authService.js";

const prisma = new PrismaClient();

const accounts = [
  {
    email: "demo.admin@bizlift.local",
    name: "BizLift Platform Admin",
    role: "super_admin",
    organizationId: null,
    officeId: null,
    vendorId: null,
    password: "BizLiftDemo!2026",
  },
  {
    email: "demo.orgadmin@bizlift.local",
    name: "BizLift Organization Admin",
    role: "organization_admin",
    organizationId: "org_techpark_demo",
    officeId: null,
    vendorId: null,
    password: "BizLiftOrg!2026",
  },
];

async function main() {
  if (process.env.NODE_ENV !== "production") {
    throw new Error("Refusing to run: NODE_ENV must be production.");
  }

  if (process.env.BIZLIFT_DB_MODE !== "postgres") {
    throw new Error("Refusing to run: BIZLIFT_DB_MODE must be postgres.");
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("Refusing to run: DATABASE_URL is missing.");
  }

  const organization = await prisma.organization.findUnique({
    where: { id: "org_techpark_demo" },
  });

  if (!organization) {
    throw new Error("Expected TechPark demo organization was not found.");
  }

  for (const account of accounts) {
    const existing = await prisma.user.findUnique({
      where: { email: account.email },
    });

    if (existing) {
      console.log(`SKIPPED existing account: ${account.email}`);
      continue;
    }

    await prisma.user.create({
      data: {
        id: `user_${crypto.randomUUID()}`,
        organizationId: account.organizationId,
        officeId: account.officeId,
        vendorId: account.vendorId,
        name: account.name,
        email: account.email,
        role: account.role,
        passwordHash: hashPassword(account.password),
        isActive: true,
      },
    });

    console.log(`CREATED: ${account.email} (${account.role})`);
  }
}

main()
  .catch((error) => {
    console.error("Provisioning failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
