import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { getPrisma } from "../utils/postgres.js";
import { readDb } from "../utils/db.js";
import { canAccessWorkspace } from "../services/authService.js";
import { assertWorkspaceBelongsToTenant } from "../services/tenantService.js";

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const user = req.auth.user;
    const prisma = await getPrisma();

    if (prisma) {
      const role = String(user.role || "").toLowerCase();
      const vendors = await prisma.vendor.findMany({
        where: ["owner", "admin"].includes(role)
          ? { office: { organizationId: user.organizationId || "" } }
          : role === "office_admin"
            ? { officeId: user.officeId || "" }
            : { id: user.vendorId || "" },
        include: { office: true },
        orderBy: [{ officeId: "asc" }, { name: "asc" }],
      });

      return res.json({
        success: true,
        data: vendors.map((vendor) => ({
          workspaceKey: `${vendor.officeId}::${vendor.id}`,
          organizationId: vendor.office.organizationId,
          officeId: vendor.officeId,
          vendorId: vendor.id,
          officeName: vendor.office.name,
          vendorName: vendor.name,
        })),
      });
    }

    const db = readDb();
    const data = Object.entries(db.workspaces || {}).filter(([key]) => {
      const [officeId, vendorId] = String(key).split("::");
      return canAccessWorkspace({ user, officeId, vendorId });
    }).map(([workspaceKey, ws]) => ({
      workspaceKey,
      organizationId: user.organizationId || null,
      officeId: ws.officeId,
      vendorId: ws.vendorId,
      officeName: ws.officeName || ws.officeId,
      vendorName: ws.vendorName || ws.vendor || ws.vendorId,
    }));

    return res.json({ success: true, data });
  } catch (error) {
    console.error("Workspace listing error:", error);
    return res.status(500).json({ success: false, message: "Unable to load authorized workspaces." });
  }
});

router.get("/:officeId/:vendorId", requireAuth, async (req, res) => {
  try {
    const { officeId, vendorId } = req.params;
    const result = await assertWorkspaceBelongsToTenant({ user: req.auth.user, officeId, vendorId });
    if (!result.ok) return res.status(result.status || 403).json({ success: false, message: result.message });

    return res.json({
      success: true,
      data: {
        organizationId: result.organizationId,
        workspaceKey: `${officeId}::${vendorId}`,
        officeId,
        vendorId,
        officeName: result.office?.name || officeId,
        vendorName: result.vendor?.name || vendorId,
      },
    });
  } catch (error) {
    console.error("Workspace lookup error:", error);
    return res.status(500).json({ success: false, message: "Unable to resolve workspace." });
  }
});

export default router;
