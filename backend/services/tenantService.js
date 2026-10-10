import { getPrisma } from "../utils/postgres.js";
import { readDb } from "../utils/db.js";
import { canAccessWorkspace } from "./authService.js";

const elevatedOrgRoles = new Set(["owner", "admin"]);
const officeRoles = new Set(["office_admin"]);

const normalized = (value) => String(value || "").replace(/-/g, "").trim().toLowerCase();

export const isOrganizationAdmin = (user) => elevatedOrgRoles.has(String(user?.role || "").toLowerCase());
export const isOfficeAdmin = (user) => officeRoles.has(String(user?.role || "").toLowerCase());

export const assertWorkspaceBelongsToTenant = async ({ user, officeId, vendorId }) => {
  if (!user?.isActive) return { ok: false, status: 401, message: "User is inactive." };
  if (!officeId || !vendorId) return { ok: false, status: 400, message: "A complete office and vendor workspace is required." };

  const prisma = await getPrisma();
  if (prisma) {
    const vendor = await prisma.vendor.findUnique({
      where: { id: String(vendorId) },
      select: { id: true, name: true, officeId: true, office: { select: { id: true, name: true, organizationId: true } } },
    });

    if (!vendor || String(vendor.officeId) !== String(officeId)) {
      return { ok: false, status: 404, message: "Workspace not found." };
    }

    const userOrganizationId = user.organizationId ? String(user.organizationId) : null;
    const userOfficeId = user.officeId ? String(user.officeId) : null;
    const sameOrganization = !userOrganizationId || String(vendor.office.organizationId) === userOrganizationId;
    const sameOffice = !userOfficeId || String(vendor.officeId) === userOfficeId;
    const role = String(user.role || "").toLowerCase();

    if (!sameOrganization) {
      return { ok: false, status: 403, message: "Cross-organization workspace access is denied." };
    }

    if (isOrganizationAdmin(user)) {
      return { ok: true, organizationId: vendor.office.organizationId, office: vendor.office, vendor };
    }

    if (!sameOffice) {
      return { ok: false, status: 403, message: "You do not have access to this office." };
    }

    if (isOfficeAdmin(user)) {
      return { ok: true, organizationId: vendor.office.organizationId, office: vendor.office, vendor };
    }

    if (!canAccessWorkspace({ user, officeId, vendorId })) {
      return { ok: false, status: 403, message: "You do not have access to this vendor workspace." };
    }

    return { ok: true, organizationId: vendor.office.organizationId, office: vendor.office, vendor };
  }

  // JSON compatibility path: keep the existing workspace isolation rules while
  // refusing arbitrary/unknown workspace keys.
  const db = readDb();
  const key = `${officeId}::${vendorId}`;
  const workspace = db.workspaces?.[key];
  if (!workspace) return { ok: false, status: 404, message: "Workspace not found." };

  if (!canAccessWorkspace({ user, officeId, vendorId })) {
    return { ok: false, status: 403, message: "You do not have access to this workspace." };
  }

  return {
    ok: true,
    organizationId: user.organizationId || null,
    office: { id: String(officeId), name: workspace.officeName || String(officeId) },
    vendor: { id: String(vendorId), name: workspace.vendorName || workspace.vendor || String(vendorId), officeId: String(officeId) },
  };
};

export const buildTenantContext = ({ user, officeId, vendorId, tenant }) => ({
  organizationId: tenant?.organizationId || user?.organizationId || null,
  officeId: String(officeId),
  vendorId: String(vendorId),
  workspaceKey: `${officeId}::${vendorId}`,
  office: tenant?.office || null,
  vendor: tenant?.vendor || null,
});

export const normalizeTenantId = normalized;
