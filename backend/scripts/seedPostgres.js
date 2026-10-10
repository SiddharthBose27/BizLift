import { getPrisma } from "../utils/postgres.js";

const organization = {
  id: "org_techpark_demo",
  name: "TechPark One Demo Organization",
  slug: "techpark-one-demo",
};

const offices = [
  { id: "techpark-one", organizationId: organization.id, name: "TechPark One" },
];

const vendors = [
  { id: "snapeats", officeId: "techpark-one", name: "SnapEats", email: "snapeats@techparkone.com" },
  { id: "quench", officeId: "techpark-one", name: "Quench", email: "quench@techparkone.com" },
  { id: "southdelights", officeId: "techpark-one", name: "South Delights", email: "southdelights@techparkone.com" },
];

const users = [
  { id: "user_office_admin_demo", organizationId: organization.id, officeId: "techpark-one", vendorId: null, name: "TechPark Admin", email: "admin@techparkone.com", role: "office_admin", passwordHash: "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9", isActive: true },
  { id: "user_snapeats_demo", organizationId: organization.id, officeId: "techpark-one", vendorId: "snapeats", name: "SnapEats Manager", email: "snapeats@techparkone.com", role: "vendor", passwordHash: "fb6fc7bf583b5c01537e4d119d303e0581cc4983eab9ba6ee0a34f0aa1d9f9fd", isActive: true },
  { id: "user_quench_demo", organizationId: organization.id, officeId: "techpark-one", vendorId: "quench", name: "Quench Manager", email: "quench@techparkone.com", role: "vendor", passwordHash: "7d0ba987752031cc007aa94f83d9b0a5d1eceaf0503a177ea17ae13307b2eb8b", isActive: true },
  { id: "user_south_demo", organizationId: organization.id, officeId: "techpark-one", vendorId: "southdelights", name: "South Delights Manager", email: "southdelights@techparkone.com", role: "vendor", passwordHash: "2d4d6e4bf44f26816c9631a5453277e9618085060f6283d2a0bd3ab101fb0ba2", isActive: true },
];

const main = async () => {
  const prisma = await getPrisma();
  if (!prisma) {
    throw new Error("PostgreSQL is not enabled. Set BIZLIFT_DB_MODE=postgres and DATABASE_URL before seeding.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.organization.upsert({ where: { id: organization.id }, update: organization, create: organization });
    for (const office of offices) {
      await tx.office.upsert({ where: { id: office.id }, update: office, create: office });
    }
    for (const vendor of vendors) {
      await tx.vendor.upsert({ where: { id: vendor.id }, update: vendor, create: vendor });
    }
    for (const user of users) {
      await tx.user.upsert({ where: { id: user.id }, update: user, create: user });
    }
  });

  console.log("PostgreSQL demo foundation seeded successfully.");
};

main().catch((error) => {
  console.error("PostgreSQL seed failed:", error);
  process.exitCode = 1;
});
