import inventoryData from "../data/inventoryData.js";
import recipeData from "../data/recipeData.js";
import salesData from "../data/salesData.js";
import transactionData from "../data/transactionData.js";
import actionStateData from "../data/actionStateData.js";
import {
  getAllInventoryItems,
  getInventoryItemById,
  getInventoryItemIndexById,
  getNextInventoryId,
  createInventoryItemRecord,
  updateInventoryItemRecord,
  deleteInventoryItemsByIds,
} from "../services/inventoryService.js";
import {
  roundQty,
  deriveInventoryStatus,
  buildReorderSuggestions,
} from "../services/inventoryEngine.js";
import {
  buildInventoryMetrics,
  buildInventoryItemMetrics,
  buildIntelligenceSummary,
} from "../services/inventoryAnalytics.js";
import {
  buildExpiryMetrics,
  buildExpirySummary,
} from "../services/expiryEngine.js";
import { buildSupplierAnalytics } from "../services/supplierAnalytics.js";
import { buildWasteSummary, buildWasteByItem, buildWasteByReason } from "../services/wasteAnalytics.js";
import { buildActionCenterAlerts } from "../services/actionCenterEngine.js";
import {
  getAllTransactions as getAllTransactionRecords,
  getNextTransactionId,
  createTransactionRecord,
  getAllInventoryTransactions,
  createInventoryTransactionRecord,
} from "../services/transactionService.js";
import { getWorkspaceContextFromRequest } from "../utils/workspaceContext.js";
import {
  ensureWorkspace,
  getAllRegisteredWorkspaces,
  resetWorkspaceStore,
} from "../services/workspaceService.js";
import {
  getInventoryState,
  saveInventoryState,
} from "../repositories/inventoryRepository.js";
import { getRecipeState } from "../repositories/recipeRepository.js";
import { getSalesState } from "../repositories/salesRepository.js";
import { publishRealtimeEvent } from "../services/realtimeEventService.js";
import { getPrisma } from "../utils/postgres.js";

const getTodayDate = () => {
  return new Date().toISOString().split("T")[0];
};

const getTimestamp = () => {
  return new Date().toISOString();
};

const syncPostgresInventoryItem = (workspaceContext, item) => {
  Promise.resolve().then(async () => {
    const prisma = await getPrisma();
    if (!prisma || !item) return;
    const name = String(item.itemName || item.name || "").trim();
    if (!name) return;
    const stock = Number(item.currentStock || 0);
    const threshold = Number(item.minThreshold || 0);
    await prisma.inventoryItem.updateMany({
      where: { officeId: workspaceContext.officeId, vendorId: workspaceContext.vendorId, name },
      data: { currentStock: stock, status: stock <= 0 ? "out" : stock <= threshold ? "low" : "healthy" },
    });
  }).catch((error) => console.error("PostgreSQL inventory mirror failed:", error.message));
};

const calculateStatus = (item) => {
  if (Number(item.currentStock) === 0) {
    return "Out of Stock";
  }

  if (Number(item.currentStock) <= Number(item.minThreshold)) {
    return "Low Stock";
  }

  if (item.expiryDate) {
    const today = new Date();
    const expiry = new Date(item.expiryDate);
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "Expired";
    if (diffDays <= 3) return "Expiring Soon";
  }

  return "In Stock";
};

const getNextId = (collection) => {
  if (!collection.length) return 1;
  return Math.max(...collection.map((item) => Number(item.id) || 0)) + 1;
};

const createTransaction = (
  {
    itemId,
    itemName,
    type,
    quantity,
    reason,
    previousStock,
    newStock,
    source = "manual",
  },
  workspaceContext,
) => {
  createTransactionRecord(
    {
      id: getNextTransactionId(workspaceContext),
      itemId,
      itemName,
      type,
      quantity,
      reason: reason || "No reason provided",
      source,
      previousStock,
      newStock,
      timestamp: getTimestamp(),
    },
    workspaceContext,
  );
};

const getActionState = (actionKey) => {
  return actionStateData.find((a) => a.actionKey === actionKey);
};

const setActionState = (actionKey, state) => {
  const existing = actionStateData.find((a) => a.actionKey === actionKey);

  if (existing) {
    existing.state = state;
    existing.updatedAt = getTimestamp();
    return existing;
  }

  const newState = {
    id: getNextId(actionStateData),
    actionKey,
    state,
    createdAt: getTimestamp(),
    updatedAt: getTimestamp(),
  };

  actionStateData.push(newState);
  return newState;
};

// Removed getSupplierRiskLevel helper (now in supplierAnalytics service)

export const getSupplierAnalytics = (req, res) => {
  try {
    const workspaceContext = getWorkspaceContextFromRequest(req);
    const { officeId, vendorId } = workspaceContext;
    ensureWorkspace(workspaceContext);

    const { inventory, inventoryTransactions } = getInventoryState({
      officeId,
      vendorId,
    });

    const metrics = buildInventoryMetrics({
      inventory,
      transactions: inventoryTransactions,
      now: new Date(),
    });

    const suppliers = buildSupplierAnalytics({
      inventory,
      metrics,
    });

    res.status(200).json({
      success: true,
      count: suppliers.length,
      data: suppliers,
    });
  } catch (err) {
    console.error("Supplier analytics error:", err);
    res.status(500).json({ success: false, message: "Supplier analytics failed" });
  }
};

export const getAllInventory = (req, res) => {
  try {
    const workspaceContext = req.workspace || getWorkspaceContextFromRequest(req);
    const { officeId, vendorId } = workspaceContext;
    ensureWorkspace(workspaceContext);

    const { inventory } = getInventoryState({ officeId, vendorId });

    res.status(200).json({
      success: true,
      count: inventory.length,
      data: inventory,
      workspace: workspaceContext,
    });
  } catch (error) {
    console.error("getAllInventory error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getAllTransactions = (req, res) => {
  try {
    const workspaceContext = req.workspace || getWorkspaceContextFromRequest(req);
    const { officeId, vendorId } = workspaceContext;
    ensureWorkspace(workspaceContext);

    const { inventoryTransactions } = getInventoryState({ officeId, vendorId });
    const { itemId, type, limit } = req.query;

    let transactions = [...inventoryTransactions];

    if (itemId) {
      transactions = transactions.filter(
        (txn) => String(txn.inventoryItemId) === String(itemId),
      );
    }

    if (type) {
      transactions = transactions.filter(
        (txn) => String(txn.type).toLowerCase() === String(type).toLowerCase(),
      );
    }

    transactions.sort(
      (a, b) =>
        new Date(b.createdAt || b.timestamp).getTime() -
        new Date(a.createdAt || a.timestamp).getTime(),
    );

    const parsedLimit = Number(limit);
    if (!Number.isNaN(parsedLimit) && parsedLimit > 0) {
      transactions = transactions.slice(0, parsedLimit);
    }

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
      workspace: workspaceContext,
    });
  } catch (error) {
    console.error("GET /api/inventory/transactions error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch inventory transactions.",
    });
  }
};

export const createInventoryItem = (req, res) => {
  const workspaceContext = getWorkspaceContextFromRequest(req);
  ensureWorkspace(workspaceContext);
  const {
    itemName,
    category,
    currentStock,
    unit,
    minThreshold,
    costPrice,
    sellingPrice,
    expiryDate,
    supplier,
  } = req.body;

  if (
    !itemName ||
    !category ||
    currentStock === undefined ||
    !unit ||
    minThreshold === undefined ||
    costPrice === undefined ||
    sellingPrice === undefined
  ) {
    return res.status(400).json({
      success: false,
      message: "Please provide all required fields.",
    });
  }

  const newItem = {
    id: getNextInventoryId(workspaceContext),
    itemName: itemName.trim(),
    name: itemName.trim(), // parity
    category: category.trim(),
    currentStock: Number(currentStock),
    unit: unit.trim(),
    minThreshold: Number(minThreshold),
    costPrice: Number(costPrice),
    sellingPrice: Number(sellingPrice),
    expiryDate: expiryDate || "",
    supplier: supplier ? supplier.trim() : "Unknown Supplier",
    lastUpdated: getTodayDate(),
  };

  newItem.status = calculateStatus(newItem);
  createInventoryItemRecord(newItem, workspaceContext);

  createTransaction(
    {
      itemId: newItem.id,
      itemName: newItem.itemName,
      type: "create",
      quantity: Number(newItem.currentStock),
      reason: "Initial inventory entry",
      source: "manual_create",
      previousStock: 0,
      newStock: Number(newItem.currentStock),
    },
    workspaceContext,
  );

  saveInventoryState(getInventoryState(workspaceContext).db);
  syncPostgresInventoryItem(workspaceContext, newItem);
  publishRealtimeEvent({ scope: req.tenant || workspaceContext, event: { eventName: "inventory.created", entityType: "inventory_item", entityId: newItem.id, occurredAt: new Date().toISOString(), officeId: workspaceContext.officeId, vendorId: workspaceContext.vendorId, inventoryChanged: true } });
  res.status(201).json({
    success: true,
    message: "Inventory item created successfully.",
    data: newItem,
    workspace: workspaceContext,
  });
};

export const updateInventoryItem = (req, res) => {
  const workspaceContext = getWorkspaceContextFromRequest(req);
  ensureWorkspace(workspaceContext);
  const itemId = Number(req.params.id);

  const {
    itemName,
    category,
    currentStock,
    unit,
    minThreshold,
    costPrice,
    sellingPrice,
    expiryDate,
    supplier,
  } = req.body;

  const itemIndex = getInventoryItemIndexById(itemId, workspaceContext);
  const inventoryItems = getAllInventoryItems(workspaceContext);

  if (itemIndex === -1) {
    return res.status(404).json({
      success: false,
      message: "Inventory item not found.",
    });
  }

  if (
    !itemName ||
    !category ||
    currentStock === undefined ||
    !unit ||
    minThreshold === undefined ||
    costPrice === undefined ||
    sellingPrice === undefined
  ) {
    return res.status(400).json({
      success: false,
      message: "Please provide all required fields.",
    });
  }

  const previousStock = Number(inventoryItems[itemIndex].currentStock);

  const updatedItem = {
    ...inventoryItems[itemIndex],
    itemName: itemName.trim(),
    name: itemName.trim(), // parity
    category: category.trim(),
    currentStock: Number(currentStock),
    unit: unit.trim(),
    minThreshold: Number(minThreshold),
    costPrice: Number(costPrice),
    sellingPrice: Number(sellingPrice),
    expiryDate: expiryDate || "",
    supplier: supplier ? supplier.trim() : "Unknown Supplier",
    lastUpdated: getTodayDate(),
  };

  updatedItem.status = calculateStatus(updatedItem);
  updateInventoryItemRecord(itemIndex, updatedItem, workspaceContext);

  createTransaction(
    {
      itemId: updatedItem.id,
      itemName: updatedItem.itemName,
      type: "edit",
      quantity: Math.abs(Number(updatedItem.currentStock) - previousStock),
      reason: "Item details edited",
      source: "manual_edit",
      previousStock,
      newStock: Number(updatedItem.currentStock),
    },
    workspaceContext,
  );

  saveInventoryState(getInventoryState(workspaceContext).db);
  syncPostgresInventoryItem(workspaceContext, updatedItem);
  publishRealtimeEvent({ scope: req.tenant || workspaceContext, event: { eventName: "inventory.updated", entityType: "inventory_item", entityId: updatedItem.id, occurredAt: new Date().toISOString(), officeId: workspaceContext.officeId, vendorId: workspaceContext.vendorId, inventoryChanged: true } });
  res.status(200).json({
    success: true,
    message: "Inventory item updated successfully.",
    data: updatedItem,
    workspace: workspaceContext,
  });
};

// Duplicated getAllInventory was here, removed.

export const updateInventoryStock = (req, res) => {
  try {
    const workspaceContext = req.workspace || getWorkspaceContextFromRequest(req);
    const { officeId, vendorId } = workspaceContext;
    ensureWorkspace(workspaceContext);

    const { inventory, inventoryTransactions, vendorState, db } = getInventoryState({
      officeId,
      vendorId,
    });

    const itemId = Number(req.params.id);
    const { quantity, reason, updateType } = req.body;

    const itemIndex = inventory.findIndex(
      (item) => String(item.id) === String(itemId),
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Inventory item not found.",
      });
    }

    const inventoryItem = vendorState.inventory[itemIndex];
    const beforeStock = Number(inventoryItem.currentStock || 0);

    let afterStock;
    let effectiveUpdateType = updateType || "set";

    const inputQty = Number(quantity);

    if (effectiveUpdateType === "add") {
      afterStock = beforeStock + inputQty;
    } else if (effectiveUpdateType === "reduce") {
      afterStock = Math.max(0, beforeStock - inputQty);
    } else {
      // default "set" behavior
      afterStock = inputQty;
    }

    if (Number.isNaN(afterStock) || afterStock < 0) {
      return res.status(400).json({
        success: false,
        message: "Valid non-negative quantity is required.",
      });
    }

    const delta = roundQty(afterStock - beforeStock);
    const now = new Date().toISOString();

    inventoryItem.currentStock = roundQty(afterStock);
    inventoryItem.lastUpdated = now.split("T")[0];
    inventoryItem.lastUpdatedAt = now;
    inventoryItem.status = deriveInventoryStatus(inventoryItem);

    const transaction = {
      id: `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      officeId,
      vendorId,
      inventoryItemId: inventoryItem.id,
      itemName: inventoryItem.itemName || inventoryItem.name, // legacy mapping
      inventoryItemName: inventoryItem.itemName || inventoryItem.name,
      type: "manual_adjustment",
      direction: delta >= 0 ? "in" : "out",
      quantity: Math.abs(delta),
      unit: inventoryItem.unit || "",
      beforeStock,
      afterStock,
      previousStock: beforeStock, // parity
      newStock: afterStock, // parity
      sourceType: "inventory_adjustment",
      sourceId: inventoryItem.id,
      timestamp: now, // parity
      createdAt: now,
      meta: {
        reason: reason || `Manual stock update (${effectiveUpdateType})`,
      },
    };

    if (!Array.isArray(vendorState.inventoryTransactions)) {
      vendorState.inventoryTransactions = [];
    }
    vendorState.inventoryTransactions.unshift(transaction);

    // Legacy support
    createTransaction(
      {
        itemId: inventoryItem.id,
        itemName: inventoryItem.itemName,
        type: delta >= 0 ? "add" : "reduce",
        quantity: Math.abs(delta),
        reason: reason || "Manual stock update",
        source: "manual_stock_update",
        previousStock: beforeStock,
        newStock: afterStock,
      },
      workspaceContext,
    );

    saveInventoryState(db);
    syncPostgresInventoryItem(workspaceContext, inventoryItem);
    publishRealtimeEvent({ scope: req.tenant || workspaceContext, event: { eventName: "inventory.changed", entityType: "inventory_item", entityId: inventoryItem.id, occurredAt: now, officeId, vendorId, previousStock: beforeStock, currentStock: afterStock, inventoryChanged: true } });
    res.status(200).json({
      success: true,
      message: "Stock updated successfully.",
      item: inventoryItem,
      data: inventoryItem, // compatibility
      workspace: workspaceContext,
    });
  } catch (error) {
    console.error("PATCH /api/inventory/:id/stock error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update stock.",
    });
  }
};

export const deleteSelectedInventoryItems = (req, res) => {
  const workspaceContext = getWorkspaceContextFromRequest(req);
  ensureWorkspace(workspaceContext);
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Please provide at least one item id to delete.",
    });
  }

  const inventoryItems = getAllInventoryItems(workspaceContext);
  const itemsToDelete = inventoryItems.filter((item) => ids.includes(item.id));

  itemsToDelete.forEach((item) => {
    createTransaction(
      {
        itemId: item.id,
        itemName: item.itemName,
        type: "delete",
        quantity: item.currentStock,
        reason: "Item deleted",
        source: "manual_delete",
        previousStock: item.currentStock,
        newStock: 0,
      },
      workspaceContext,
    );
  });

  deleteInventoryItemsByIds(ids, workspaceContext);

  res.status(200).json({
    success: true,
    message: "Selected inventory items deleted successfully.",
    data: getAllInventoryItems(workspaceContext),
    workspace: workspaceContext,
  });
};

export const getReorderSuggestions = (req, res) => {
  try {
    const workspaceContext = req.workspace || getWorkspaceContextFromRequest(req);
    const { officeId, vendorId } = workspaceContext;
    ensureWorkspace(workspaceContext);

    const { inventory, inventoryTransactions } = getInventoryState({
      officeId,
      vendorId,
    });

    const metrics = buildInventoryMetrics({
      inventory,
      transactions: inventoryTransactions,
      now: new Date(),
    });

    const metricMap = new Map(
      metrics.map((entry) => [String(entry.inventoryItemId), entry]),
    );

    const suggestions = inventory
      .map((item) => {
        const itemMetrics = metricMap.get(String(item.id));
        return buildReorderSuggestions({
          item,
          metrics: itemMetrics,
        });
      })
      .filter((item) => item.shouldReorder)
      .sort((a, b) => {
        const urgencyRank = {
          critical: 4,
          high: 3,
          medium: 2,
          low: 1,
        };

        if (urgencyRank[b.urgency] !== urgencyRank[a.urgency]) {
          return urgencyRank[b.urgency] - urgencyRank[a.urgency];
        }

        const aDays = a.daysRemaining ?? Number.POSITIVE_INFINITY;
        const bDays = b.daysRemaining ?? Number.POSITIVE_INFINITY;
        return aDays - bDays;
      });

    res.status(200).json({
      success: true,
      count: suggestions.length,
      data: suggestions,
      workspace: workspaceContext,
    });
  } catch (error) {
    console.error("GET /api/inventory/reorder/suggestions error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reorder suggestions.",
    });
  }
};

export const getDemandAnalytics = (req, res) => {
  try {
    const workspaceContext = req.workspace || getWorkspaceContextFromRequest(req);
    const { officeId, vendorId } = workspaceContext;
    ensureWorkspace(workspaceContext);

    const { inventory, inventoryTransactions } = getInventoryState({
      officeId,
      vendorId,
    });

    const metrics = buildInventoryMetrics({
      inventory,
      transactions: inventoryTransactions,
      now: new Date(),
    });

    const summary = {
      totalItems: metrics.length,
      fastMovingItems: metrics.filter((item) => item.velocity === "fast").length,
      mediumMovingItems: metrics.filter((item) => item.velocity === "medium")
        .length,
      slowMovingItems: metrics.filter((item) => item.velocity === "slow").length,
      idleItems: metrics.filter((item) => item.velocity === "idle").length,
      criticalCoverageItems: metrics.filter(
        (item) => item.stockCoverageStatus === "critical",
      ).length,
      lowCoverageItems: metrics.filter(
        (item) => item.stockCoverageStatus === "low",
      ).length,
      watchCoverageItems: metrics.filter(
        (item) => item.stockCoverageStatus === "watch",
      ).length,
      totalConsumption7d: metrics.reduce(
        (sum, item) => sum + Number(item.consumption7d || 0),
        0,
      ),
      totalConsumption30d: metrics.reduce(
        (sum, item) => sum + Number(item.consumption30d || 0),
        0,
      ),
    };

    const topConsumedItems = [...metrics]
      .sort((a, b) => b.consumption7d - a.consumption7d)
      .slice(0, 5)
      .map((item) => ({
        inventoryItemId: item.inventoryItemId,
        inventoryItemName: item.inventoryItemName,
        category: item.category,
        unit: item.unit,
        consumption7d: item.consumption7d,
        consumption30d: item.consumption30d,
        avgDailyUsage30d: item.avgDailyUsage30d,
        velocity: item.velocity,
        daysRemaining: item.daysRemaining,
      }));

    res.status(200).json({
      success: true,
      summary,
      topConsumedItems,
      itemMetrics: metrics,
      data: metrics, // compatibility
      workspace: workspaceContext,
    });
  } catch (error) {
    console.error("GET /api/inventory/demand/analytics error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch demand analytics.",
    });
  }
};

export const getIntelligenceSummary = (req, res) => {
  try {
    const workspaceContext = req.workspace || getWorkspaceContextFromRequest(req);
    const { officeId, vendorId } = workspaceContext;
    ensureWorkspace(workspaceContext);

    const { inventory, inventoryTransactions } = getInventoryState({
      officeId,
      vendorId,
    });

    const metrics = buildInventoryMetrics({
      inventory,
      transactions: inventoryTransactions,
      now: new Date(),
    });

    const summary = buildIntelligenceSummary({ inventory, metrics });

    res.status(200).json({
      success: true,
      data: summary,
      workspace: workspaceContext,
    });
  } catch (error) {
    console.error("GET /api/inventory/intelligence/summary error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch intelligence summary.",
    });
  }
};

export const getAIHealthScore = (req, res) => {
  try {
    const workspaceContext = req.workspace || getWorkspaceContextFromRequest(req);
    const { officeId, vendorId } = workspaceContext;
    ensureWorkspace(workspaceContext);

    const { inventory, inventoryTransactions } = getInventoryState({
      officeId,
      vendorId,
    });
    const { recipes } = getRecipeState({ officeId, vendorId });
    const { sales } = getSalesState({ officeId, vendorId });

    const metrics = buildInventoryMetrics({
      inventory,
      transactions: inventoryTransactions,
      now: new Date(),
    });

    const supplierAnalytics = buildSupplierAnalytics({
      inventory,
      metrics,
    });

    const outOfStockCount = inventory.filter(
      (item) => String(item.status || "").toLowerCase() === "out of stock" || Number(item.currentStock) === 0,
    ).length;
    const lowStockCount = inventory.filter(
      (item) => String(item.status || "").toLowerCase() === "low stock" || Number(item.currentStock) <= Number(item.minThreshold || 0),
    ).length;
    const expiringSoonCount = inventory.filter((item) => {
      if (!item.expiryDate) return false;
      const diffDays = Math.ceil((new Date(item.expiryDate) - new Date()) / 86400000);
      return diffDays >= 0 && diffDays <= 3;
    }).length;

    const reorderSuggestions = inventory
      .map((item) => {
        const itemMetrics = metrics.find((m) => String(m.inventoryItemId) === String(item.id));
        return buildReorderSuggestions({ item, metrics: itemMetrics });
      })
      .filter((item) => item.shouldReorder);

    const criticalReorders = reorderSuggestions.filter(
      (item) => item.urgency === "critical" || item.urgency === "high",
    ).length;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const highDemandRiskItems = inventory.filter((item) => {
      const itemMetrics = metrics.find((m) => String(m.inventoryItemId) === String(item.id));
      return itemMetrics?.stockCoverageStatus === "critical" || itemMetrics?.stockCoverageStatus === "low";
    }).length;

    const highRiskSuppliers = supplierAnalytics.filter(
      (supplier) => supplier.riskLevel === "high",
    ).length;

    let score = 100;
    score -= outOfStockCount * 15;
    score -= Math.max(0, lowStockCount - outOfStockCount) * 8;
    score -= expiringSoonCount * 6;
    score -= highRiskSuppliers * 10;
    score -= criticalReorders * 8;
    score -= highDemandRiskItems * 7;
    score = Math.max(0, Math.min(100, Math.round(score)));

    let status = "Excellent";
    let topSignal = "Operations are stable.";
    if (score < 85) { status = "Good"; topSignal = "Some operational attention needed."; }
    if (score < 70) { status = "Warning"; topSignal = "Inventory and supplier risks are building up."; }
    if (score < 50) { status = "Critical"; topSignal = "Immediate action needed on stock and procurement."; }

    return res.status(200).json({
      success: true,
      data: {
        score,
        status,
        topSignal,
        metrics: {
          totalItems: inventory.length,
          totalSales: sales.length,
          totalRecipes: recipes.length,
          outOfStockCount,
          lowStockCount,
          expiringSoonCount,
          highRiskSuppliers,
          criticalReorders,
          highDemandRiskItems,
        },
      },
      workspace: workspaceContext,
    });
  } catch (error) {
    console.error("GET /api/inventory/ai-health-score error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to calculate AI health score.",
      error: error.message,
    });
  }
};

export const getActionCenter = (req, res) => {
  try {
    const workspaceContext = req.workspace || getWorkspaceContextFromRequest(req);
    const { officeId, vendorId } = workspaceContext;
    ensureWorkspace(workspaceContext);

    const { inventory, inventoryTransactions } = getInventoryState({
      officeId,
      vendorId,
    });

    const metrics = buildInventoryMetrics({
      inventory,
      transactions: inventoryTransactions,
      now: new Date(),
    });

    const reorderSuggestions = inventory
      .map((item) => {
        const metric = metrics.find(
          (m) => String(m.inventoryItemId) === String(item.id),
        );
        return buildReorderSuggestions({ item, metrics: metric });
      })
      .filter((i) => i.shouldReorder);

    const suppliers = buildSupplierAnalytics({
      inventory,
      metrics,
    });

    const expiryMetrics = buildExpiryMetrics({
      inventory,
      itemMetrics: metrics,
      now: new Date(),
    });

    const alerts = buildActionCenterAlerts({
      metrics,
      reorderSuggestions,
      suppliers,
      expiryMetrics,
    });

    res.status(200).json({
      success: true,
      count: alerts.length,
      data: alerts,
      workspace: workspaceContext,
    });
  } catch (err) {
    console.error("Action center error:", err);
    res.status(500).json({ success: false, message: "Action center failed" });
  }
};

export const reviewAction = (req, res) => {
  const { actionKey } = req.body;

  if (!actionKey) {
    return res.status(400).json({
      success: false,
      message: "actionKey required",
    });
  }

  const state = setActionState(actionKey, "reviewed");

  res.status(200).json({
    success: true,
    data: state,
  });
};

export const snoozeAction = (req, res) => {
  const { actionKey } = req.body;

  if (!actionKey) {
    return res.status(400).json({
      success: false,
      message: "actionKey required",
    });
  }

  const state = setActionState(actionKey, "snoozed");

  res.status(200).json({
    success: true,
    data: state,
  });
};

export const dismissAction = (req, res) => {
  const { actionKey } = req.body;

  if (!actionKey) {
    return res.status(400).json({
      success: false,
      message: "actionKey required",
    });
  }

  const state = setActionState(actionKey, "dismissed");

  res.status(200).json({
    success: true,
    data: state,
  });
};

export const getEOQAnalytics = (req, res) => {
  try {
    const workspaceContext = req.workspace || getWorkspaceContextFromRequest(req);
    ensureWorkspace(workspaceContext);
    const { inventory, inventoryTransactions } = getInventoryState(workspaceContext);
    const metrics = buildInventoryMetrics({ inventory, transactions: inventoryTransactions, now: new Date() });
    const data = inventory.map(item => {
      const m = metrics.find(x => String(x.inventoryItemId) === String(item.id)) || {};
      const avgDailyUsage = Number(m.avgDailyUsage30d || 0);
      const annualDemand = Math.round(avgDailyUsage * 365);
      const orderingCost = 250;
      const holdingCost = Number((Number(item.costPrice || 0) * 0.2).toFixed(2));
      const eoq = annualDemand > 0 && holdingCost > 0 ? Math.round(Math.sqrt((2 * annualDemand * orderingCost) / holdingCost)) : 0;
      return { itemId:item.id, itemName:item.itemName || item.name, category:item.category, supplier:item.supplier, unit:item.unit, currentStock:Number(item.currentStock||0), avgDailyUsage:Number(avgDailyUsage.toFixed(2)), annualDemand, orderingCost, holdingCost, eoq, reorderFrequencyDays:avgDailyUsage>0&&eoq>0?Number((eoq/avgDailyUsage).toFixed(1)):null, reorderSuggested:Number(item.currentStock||0)<=Number(item.minThreshold||0) };
    }).sort((a,b)=>Number(b.reorderSuggested)-Number(a.reorderSuggested)||b.annualDemand-a.annualDemand);
    return res.status(200).json({success:true,count:data.length,data,workspace:workspaceContext});
  } catch(error) {
    console.error('GET /api/inventory/eoq error:',error);
    return res.status(500).json({success:false,message:'Failed to fetch EOQ analytics.'});
  }
};

export const getWasteAnalytics = (req, res) => {
  try {
    const workspaceContext = req.workspace || getWorkspaceContextFromRequest(req);
    ensureWorkspace(workspaceContext);
    const { wasteEvents, inventory } = getInventoryState(workspaceContext);
    const now = new Date();
    const summary = buildWasteSummary({ wasteEvents, now });
    const topWasteItems = buildWasteByItem({ wasteEvents, limit: 10 }).map((item) => ({
      itemName: item.inventoryItemName,
      quantity: item.totalWasteQty,
      cost: item.totalWasteCost,
      events: item.totalWasteEvents,
    }));
    const wasteByReason = buildWasteByReason({ wasteEvents }).map((item) => ({
      reason: item.reason,
      quantity: item.totalWasteQty,
      cost: item.totalWasteCost,
      events: item.totalWasteEvents,
    }));
    const categoryMap = new Map();
    for (const item of topWasteItems) {
      const inv = inventory.find((x) => String(x.itemName || x.name).toLowerCase() === String(item.itemName).toLowerCase());
      const category = inv?.category || 'Unknown';
      const row = categoryMap.get(category) || { category, quantity: 0, cost: 0 };
      row.quantity += Number(item.quantity || 0);
      row.cost += Number(item.cost || 0);
      categoryMap.set(category, row);
    }
    const trendMap = new Map();
    for (const event of wasteEvents) {
      const date = new Date(event.createdAt || event.timestamp);
      if (Number.isNaN(date.getTime())) continue;
      const key = date.toISOString().slice(0, 10);
      const row = trendMap.get(key) || { date: key, quantity: 0, cost: 0 };
      row.quantity += Number(event.quantity || 0);
      row.cost += Number(event.wasteCost ?? (Number(event.quantity || 0) * Number(event.unitCost || 0)));
      trendMap.set(key, row);
    }
    const wasteTrend = Array.from(trendMap.values()).sort((a,b) => a.date.localeCompare(b.date)).slice(-30).map(x => ({...x, quantity:Number(x.quantity.toFixed(2)), cost:Number(x.cost.toFixed(2))}));
    const reasonLeader = wasteByReason[0];
    return res.status(200).json({
      success: true,
      data: {
        totalWasteQuantity: summary.totalWasteQty,
        totalWasteCost: summary.totalWasteCost,
        wasteEvents: summary.totalWasteEvents,
        wasteEvents7d: summary.wasteEvents7d,
        wasteCost7d: summary.wasteCost7d,
        topWasteItems,
        wasteByCategory: Array.from(categoryMap.values()).sort((a,b)=>b.cost-a.cost),
        wasteByReason,
        wasteTrend,
        rootCause: reasonLeader ? { reason: reasonLeader.reason, cost: reasonLeader.cost, sharePct: summary.totalWasteCost ? Number((reasonLeader.cost / summary.totalWasteCost * 100).toFixed(1)) : 0 } : null,
      },
      workspace: workspaceContext,
    });
  } catch (error) {
    console.error('GET /api/inventory/waste-analytics error:', error);
    return res.status(500).json({ success:false, message:'Failed to fetch waste analytics.' });
  }
};

export const getDemandForecast = (req, res) => {
  try {
    const workspaceContext = req.workspace || getWorkspaceContextFromRequest(req);
    ensureWorkspace(workspaceContext);
    const { inventory, inventoryTransactions } = getInventoryState(workspaceContext);
    const metrics = buildInventoryMetrics({ inventory, transactions: inventoryTransactions, now: new Date() });
    const prioritized = metrics.map((item) => ({
      itemId: item.inventoryItemId,
      itemName: item.inventoryItemName,
      category: item.category,
      supplier: item.supplier,
      unit: item.unit,
      currentStock: item.currentStock,
      avgDailyUsage: item.avgDailyUsage30d,
      forecast7Days: Number((item.avgDailyUsage30d * 7).toFixed(2)),
      forecast14Days: Number((item.avgDailyUsage30d * 14).toFixed(2)),
      projectedStock7Days: Number((item.currentStock - item.avgDailyUsage30d * 7).toFixed(2)),
      projectedStock14Days: Number((item.currentStock - item.avgDailyUsage30d * 14).toFixed(2)),
      daysRemaining: item.daysRemaining,
      forecastRisk: item.stockCoverageStatus === 'critical' ? 'Critical' : item.stockCoverageStatus === 'low' ? 'High' : item.stockCoverageStatus === 'watch' ? 'Medium' : 'Low',
    })).sort((a,b) => ({Critical:4,High:3,Medium:2,Low:1}[b.forecastRisk] || 0) - ({Critical:4,High:3,Medium:2,Low:1}[a.forecastRisk] || 0));
    return res.status(200).json({ success:true, count:prioritized.length, data:prioritized, workspace:workspaceContext });
  } catch (error) {
    console.error('GET /api/inventory/demand-forecast error:', error);
    return res.status(500).json({ success:false, message:'Failed to fetch demand forecast.' });
  }
};

export const getProcurementPlan = (req, res) => {
  try {
    const workspaceContext = req.workspace || getWorkspaceContextFromRequest(req);
    ensureWorkspace(workspaceContext);
    const { inventory, inventoryTransactions } = getInventoryState(workspaceContext);
    const metrics = buildInventoryMetrics({ inventory, transactions: inventoryTransactions, now: new Date() });
    const rows = inventory.map((item) => {
      const m = metrics.find(x => String(x.inventoryItemId) === String(item.id)) || {};
      const avg = Number(m.avgDailyUsage30d || 0);
      const forecast14Days = avg * 14;
      const currentStock = Number(item.currentStock || 0);
      const minThreshold = Number(item.minThreshold || 0);
      const costPrice = Number(item.costPrice || 0);
      const annualDemand = Math.round(avg * 365);
      const orderingCost = 250;
      const holdingCost = costPrice * 0.2;
      const eoq = annualDemand > 0 && holdingCost > 0 ? Math.round(Math.sqrt((2 * annualDemand * orderingCost) / holdingCost)) : 0;
      const recommendedOrderQty = Math.max(0, Math.ceil(Math.max(minThreshold - currentStock, forecast14Days - currentStock, eoq && currentStock <= minThreshold ? eoq : 0)));
      const estimatedCost = Number((recommendedOrderQty * costPrice).toFixed(2));
      let procurementPriority = 'Low';
      if (currentStock <= 0 || (m.daysRemaining !== null && m.daysRemaining <= 2)) procurementPriority = 'Critical';
      else if (currentStock <= minThreshold || (m.daysRemaining !== null && m.daysRemaining <= 5)) procurementPriority = 'High';
      else if (m.daysRemaining !== null && m.daysRemaining <= 10) procurementPriority = 'Medium';
      return { itemId:item.id, itemName:item.itemName || item.name, category:item.category, supplier:item.supplier || 'Unknown Supplier', unit:item.unit, currentStock, minThreshold, avgDailyUsage:avg, forecast7Days:Number((avg*7).toFixed(2)), forecast14Days:Number(forecast14Days.toFixed(2)), projectedStock7Days:Number((currentStock-avg*7).toFixed(2)), projectedStock14Days:Number((currentStock-forecast14Days).toFixed(2)), eoq, suggestedReorderQty:Math.max(0, Math.ceil(minThreshold-currentStock)), recommendedOrderQty, estimatedCost, coverageDaysAfterReorder:avg>0?Number(((currentStock+recommendedOrderQty)/avg).toFixed(1)):null, procurementPriority, reorderNeeded:recommendedOrderQty>0 };
    }).filter(row=>row.reorderNeeded).sort((a,b)=>({Critical:4,High:3,Medium:2,Low:1}[b.procurementPriority]-({Critical:4,High:3,Medium:2,Low:1}[a.procurementPriority]) || b.estimatedCost-a.estimatedCost));
    const summary = { totalItemsToProcure:rows.length, totalEstimatedSpend:Number(rows.reduce((s,r)=>s+r.estimatedCost,0).toFixed(2)), criticalItems:rows.filter(r=>r.procurementPriority==='Critical').length, highPriorityItems:rows.filter(r=>r.procurementPriority==='High').length };
    return res.status(200).json({success:true,data:rows,summary,workspace:workspaceContext});
  } catch (error) {
    console.error('GET /api/inventory/procurement-plan error:', error);
    return res.status(500).json({success:false,message:'Failed to fetch procurement plan.'});
  }
};

export const resetActionStates = (req, res) => {
  const resetCount = transactionData.reduce((count, tx) => count, 0);

  for (const action of transactionData) {
    // no-op placeholder to keep compatibility if transaction structure grows later
  }

  res.status(200).json({
    success: true,
    message: "Action state reset endpoint is ready.",
    data: {
      resetCount,
    },
  });
};

export const getWorkspaceHealth = (req, res) => {
  const workspaceContext = getWorkspaceContextFromRequest(req);
  ensureWorkspace(workspaceContext);

  const inventoryItems = getAllInventoryItems(workspaceContext);
  const { recipes: recipeItems } = getRecipeState(workspaceContext);
  const { sales: salesItems } = getSalesState(workspaceContext);
  const { inventoryTransactions: transactionItems } = getInventoryState(workspaceContext);

  const inventoryCount = inventoryItems.length;
  const recipeCount = recipeItems.length;
  const salesCount = salesItems.length;
  const transactionCount = transactionItems.length;

  const lowStockCount = inventoryItems.filter(
    (item) => item.status === "Low Stock",
  ).length;

  const outOfStockCount = inventoryItems.filter(
    (item) => item.status === "Out of Stock",
  ).length;

  const expiringSoonCount = inventoryItems.filter(
    (item) => item.status === "Expiring Soon",
  ).length;

  const totalInventoryValue = inventoryItems.reduce((sum, item) => {
    return sum + Number(item.currentStock || 0) * Number(item.costPrice || 0);
  }, 0);

  const totalRevenue = salesItems.reduce((sum, sale) => {
    return sum + Number(sale.totalAmount || 0);
  }, 0);

  let healthStatus = "Healthy";

  if (lowStockCount >= 2 || outOfStockCount >= 1 || expiringSoonCount >= 2) {
    healthStatus = "Needs Attention";
  }

  if (outOfStockCount >= 2 || lowStockCount >= 4 || expiringSoonCount >= 3) {
    healthStatus = "Critical";
  }

  res.status(200).json({
    success: true,
    data: {
      inventoryCount,
      recipeCount,
      salesCount,
      transactionCount,
      lowStockCount,
      outOfStockCount,
      expiringSoonCount,
      totalInventoryValue: Number(totalInventoryValue.toFixed(2)),
      totalRevenue: Number(totalRevenue.toFixed(2)),
      healthStatus,
      generatedAt: new Date().toISOString(),
    },
    workspace: workspaceContext,
  });
};

export const getExpiryAnalytics = (req, res) => {
  try {
    const workspaceContext =
      req.workspace || getWorkspaceContextFromRequest(req);
    const { officeId, vendorId } = workspaceContext;
    ensureWorkspace(workspaceContext);

    const { inventory } = getInventoryState({ officeId, vendorId });
    const metrics = buildInventoryMetrics({
      inventory,
      transactions: [], // Not needed for simple expiry
      now: new Date(),
    });

    const expiryMetrics = buildExpiryMetrics({
      inventory,
      itemMetrics: metrics,
      now: new Date(),
    });

    const summary = buildExpirySummary({
      inventory,
      expiryMetrics,
      now: new Date(),
    });

    res.status(200).json({
      success: true,
      data: {
        metrics: expiryMetrics,
        summary,
      },
      workspace: workspaceContext,
    });
  } catch (error) {
    console.error("getExpiryAnalytics error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch expiry analytics" });
  }
};

export const getStockRisk = (req, res) => {
  try {
    const workspaceContext =
      req.workspace || getWorkspaceContextFromRequest(req);
    const { officeId, vendorId } = workspaceContext;
    ensureWorkspace(workspaceContext);

    const { inventory } = getInventoryState({ officeId, vendorId });

    // Simple risk: out of stock or low stock
    const riskItems = inventory
      .filter(
        (item) =>
          item.status === "Out of Stock" || item.status === "Low Stock",
      )
      .map((item) => ({
        id: item.id,
        name: item.itemName || item.name,
        currentStock: item.currentStock,
        minThreshold: item.minThreshold,
        status: item.status,
        urgency: item.status === "Out of Stock" ? "critical" : "high",
      }));

    res.status(200).json({
      success: true,
      data: riskItems,
      workspace: workspaceContext,
    });
  } catch (error) {
    console.error("getStockRisk error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch stock risk" });
  }
};

export const resetCurrentWorkspace = (req, res) => {
  const workspaceContext = getWorkspaceContextFromRequest(req);
  ensureWorkspace(workspaceContext);

  const resetStore = resetWorkspaceStore(workspaceContext);

  res.status(200).json({
    success: true,
    message: "Workspace reset successfully.",
    workspace: workspaceContext,
    data: {
      inventoryCount: resetStore.inventory.length,
      recipeCount: resetStore.recipes.length,
      salesCount: resetStore.sales.length,
      transactionCount: resetStore.transactions.length,
    },
  });
};

export const getWorkspaceRegistry = (req, res) => {
  const workspaces = getAllRegisteredWorkspaces();

  res.status(200).json({
    success: true,
    count: workspaces.length,
    data: workspaces,
  });
};
