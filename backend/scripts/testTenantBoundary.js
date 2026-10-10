import { assertWorkspaceBelongsToTenant } from "../services/tenantService.js";

const run = async () => {
  const prismaMode = String(process.env.BIZLIFT_DB_MODE || "json");
  const tests = [];

  if (prismaMode === "postgres") {
    const sameVendor = await assertWorkspaceBelongsToTenant({
      user: { id: "u", organizationId: "org_techpark_demo", officeId: "techpark-one", vendorId: "snapeats", role: "vendor", isActive: true },
      officeId: "techpark-one",
      vendorId: "snapeats",
    });
    tests.push(["same vendor workspace allowed", sameVendor.ok]);

    const crossVendor = await assertWorkspaceBelongsToTenant({
      user: { id: "u", organizationId: "org_techpark_demo", officeId: "techpark-one", vendorId: "snapeats", role: "vendor", isActive: true },
      officeId: "techpark-one",
      vendorId: "quench",
    });
    tests.push(["cross vendor blocked", !crossVendor.ok && crossVendor.status === 403]);

    const missingWorkspace = await assertWorkspaceBelongsToTenant({
      user: { id: "u", organizationId: "org_techpark_demo", officeId: "techpark-one", vendorId: "snapeats", role: "vendor", isActive: true },
      officeId: "techpark-one",
      vendorId: "does-not-exist",
    });
    tests.push(["unknown workspace blocked", !missingWorkspace.ok && missingWorkspace.status === 404]);
  } else {
    const sameVendor = await assertWorkspaceBelongsToTenant({
      user: { id: "u", officeId: "techpark-one", vendorId: "snapeats", role: "vendor", isActive: true },
      officeId: "techpark-one",
      vendorId: "snapeats",
    });
    tests.push(["same vendor workspace allowed", sameVendor.ok]);

    const crossVendor = await assertWorkspaceBelongsToTenant({
      user: { id: "u", officeId: "techpark-one", vendorId: "snapeats", role: "vendor", isActive: true },
      officeId: "techpark-one",
      vendorId: "quench",
    });
    tests.push(["cross vendor blocked", !crossVendor.ok && crossVendor.status === 403]);
  }

  const failed = tests.filter(([, ok]) => !ok);
  tests.forEach(([name, ok]) => console.log(`${ok ? "PASS" : "FAIL"} — ${name}`));
  if (failed.length) process.exitCode = 1;
};

run().catch((error) => { console.error(error); process.exitCode = 1; });
