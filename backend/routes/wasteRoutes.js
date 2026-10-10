/**
 * server/routes/wasteRoutes.js (Batch 10 Refactored)
 * Waste event recording and analytics.
 */

import express from "express";
import { ensureWorkspace } from "../services/workspaceService.js";
import {
  getInventoryState,
  saveInventoryState,
} from "../repositories/inventoryRepository.js";
import { requireWorkspace } from "../middleware/requireWorkspace.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireWorkspaceAccess } from "../middleware/requireWorkspaceAccess.js";
import {
  roundQty,
  deriveInventoryStatus,
} from "../services/inventoryEngine.js";
import {
  buildWasteSummary,
  buildWasteByItem,
  buildWasteByReason,
} from "../services/wasteAnalytics.js";
import {
  buildWasteEventEntity,
  buildInventoryTransactionEntity,
} from "../domain/entityBuilders.js";

import { ok, fail } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

router.post(
  "/",
  requireAuth,
  requireWorkspace,
  requireWorkspaceAccess,
  asyncHandler(async (req, res) => {
    const { officeId, vendorId } = req.workspace;
    ensureWorkspace({ officeId, vendorId });

    const { inventory, vendorState, db } = getInventoryState({
      officeId,
      vendorId,
    });

    const { inventoryItemId, quantity, reason, notes } = req.body;

    if (!inventoryItemId) {
      return fail(res, "inventoryItemId is required.", 400);
    }

    const wasteQty = Number(quantity);
    if (!wasteQty || wasteQty <= 0) {
      return fail(res, "Valid waste quantity greater than zero is required.", 400);
    }

    const inventoryItem = inventory.find(
      (item) => String(item.id) === String(inventoryItemId),
    );

    if (!inventoryItem) {
      return fail(res, "Inventory item not found.", 404);
    }

    const currentStock = Number(inventoryItem.currentStock || 0);
    if (currentStock < wasteQty) {
      return fail(res, "Waste quantity exceeds available stock.", 409, {
        availableQty: currentStock,
        requestedQty: wasteQty,
      });
    }

    const beforeStock = roundQty(currentStock);
    const afterStock = roundQty(currentStock - wasteQty);
    const now = new Date().toISOString();

    inventoryItem.currentStock = afterStock;
    inventoryItem.lastUpdatedAt = now;
    inventoryItem.status = deriveInventoryStatus(inventoryItem);

    const trimmedReason = String(reason || "unspecified").trim();

    const wasteEvent = buildWasteEventEntity({
      officeId,
      vendorId,
      inventoryItemId: inventoryItem.id,
      inventoryItemName: inventoryItem.name || inventoryItem.itemName,
      quantity: roundQty(wasteQty),
      unit: inventoryItem.unit || "",
      unitCost: Number(inventoryItem.costPrice || 0),
      reason: trimmedReason,
      notes: String(notes || "").trim(),
      beforeStock,
      afterStock,
      createdAt: now,
    });

    vendorState.wasteEvents.unshift(wasteEvent);

    vendorState.inventoryTransactions.unshift(
      buildInventoryTransactionEntity({
        officeId,
        vendorId,
        inventoryItemId: inventoryItem.id,
        inventoryItemName: inventoryItem.name || inventoryItem.itemName,
        type: "waste",
        direction: "out",
        quantity: roundQty(wasteQty),
        unit: inventoryItem.unit || "",
        beforeStock,
        afterStock,
        sourceType: "waste_event",
        sourceId: wasteEvent.id,
        createdAt: now,
        meta: {
          reason: trimmedReason,
          notes: String(notes || "").trim(),
        },
      }),
    );

    saveInventoryState(db);

    return ok(
      res,
      {
        wasteEvent,
        item: inventoryItem,
        workspace: req.workspace,
      },
      "Waste event recorded successfully.",
      201,
    );
  }),
);

router.get(
  "/",
  requireAuth,
  requireWorkspace,
  requireWorkspaceAccess,
  asyncHandler(async (req, res) => {
    const { officeId, vendorId } = req.workspace;
    ensureWorkspace({ officeId, vendorId });

    const { limit } = req.query;
    const { wasteEvents } = getInventoryState({ officeId, vendorId });

    let sortedEvents = [...wasteEvents].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const parsedLimit = Number(limit);
    if (!Number.isNaN(parsedLimit) && parsedLimit > 0) {
      sortedEvents = sortedEvents.slice(0, parsedLimit);
    }

    return ok(res, { data: sortedEvents, workspace: req.workspace });
  }),
);

router.get(
  "/analytics",
  requireAuth,
  requireWorkspace,
  requireWorkspaceAccess,
  asyncHandler(async (req, res) => {
    const { officeId, vendorId } = req.workspace;
    ensureWorkspace({ officeId, vendorId });

    const { wasteEvents } = getInventoryState({ officeId, vendorId });

    return ok(res, {
      data: {
        summary: buildWasteSummary({ wasteEvents, now: new Date() }),
        wasteByItem: buildWasteByItem({ wasteEvents, limit: 10 }),
        wasteByReason: buildWasteByReason({ wasteEvents }),
      },
      workspace: req.workspace,
    });
  }),
);

export default router;
