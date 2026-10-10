import {
  getAllSalesRecords,
  getNextSaleId,
  createSaleRecord,
} from "../services/salesService.js";
import { getRecipeById } from "../services/recipeService.js";
import {
  getInventoryItemById,
  getInventoryItemIndexById,
  getAllInventoryItems,
  updateInventoryItemRecord,
} from "../services/inventoryService.js";
import {
  getNextTransactionId,
  createTransactionRecord,
  createInventoryTransactionRecord,
} from "../services/transactionService.js";
import { getWorkspaceContextFromRequest } from "../utils/workspaceContext.js";
import { ensureWorkspace } from "../services/workspaceService.js";
import {
  getSalesState,
  saveSalesState,
} from "../repositories/salesRepository.js";
import {
  buildRecipeConsumptionPlan,
  applyConsumptionPlan,
} from "../services/inventoryEngine.js";
import {
  buildSalesSummary,
  buildTopSellingRecipes,
  buildHourlySalesDistribution,
  buildDailySalesTrend,
} from "../services/salesAnalytics.js";
import {
  buildSaleEntity,
  buildInventoryTransactionEntity,
} from "../domain/entityBuilders.js";
import { ok, fail } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { publishRealtimeEvent } from "../services/realtimeEventService.js";
import { getPrisma } from "../utils/postgres.js";
import { getIdempotencyKey, findIdempotentResponse, saveIdempotentResponse } from "../services/idempotencyService.js";

const getTimestamp = () => new Date().toISOString();

const getTodayDate = () => {
  return new Date().toISOString().split("T")[0];
};

// Mirror operational stock into the organization registry's PostgreSQL inventory
// so organization-admin screens and POS/analytics stay consistent in hybrid mode.
const syncPostgresInventoryStock = async ({ officeId, vendorId, inventory }) => {
  try {
    const prisma = await getPrisma();
    if (!prisma || !Array.isArray(inventory)) return;
    for (const item of inventory) {
      const name = String(item.itemName || item.name || "").trim();
      if (!name) continue;
      const stock = Number(item.currentStock || 0);
      const threshold = Number(item.minThreshold || 0);
      const status = stock <= 0 ? "out" : stock <= threshold ? "low" : "healthy";
      await prisma.inventoryItem.updateMany({
        where: { officeId, vendorId, name },
        data: { currentStock: stock, status },
      });
    }
  } catch (error) {
    // The primary POS write has already succeeded. Surface the mirror failure for
    // diagnostics without falsely reporting the completed sale as failed.
    console.error("PostgreSQL inventory mirror failed:", error.message);
  }
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
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays <= 3) {
      return "Expiring Soon";
    }
  }

  return "In Stock";
};

const getNextId = (collection) => {
  if (!collection.length) return 1;
  return Math.max(...collection.map((item) => Number(item.id) || 0)) + 1;
};

const createTransaction = (
  { itemId, itemName, type, quantity, reason, previousStock, newStock },
  workspaceContext,
) => {
  createTransactionRecord(
    {
      id: getNextTransactionId(workspaceContext),
      itemId,
      itemName,
      type,
      quantity,
      reason,
      previousStock,
      newStock,
      timestamp: getTimestamp(),
    },
    workspaceContext,
  );
};

export const getAllSales = (req, res) => {
  try {
    const workspaceContext = req.workspace || getWorkspaceContextFromRequest(req);
    const { officeId, vendorId } = workspaceContext;
    ensureWorkspace(workspaceContext);

    const { sales } = getSalesState({ officeId, vendorId });

    res.status(200).json({
      success: true,
      count: sales.length,
      data: sales,
      workspace: workspaceContext,
    });
  } catch (error) {
    console.error("getAllSales error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const createSale = asyncHandler(async (req, res) => {
  const workspaceContext = req.workspace || getWorkspaceContextFromRequest(req);
  const { officeId, vendorId } = workspaceContext;
  ensureWorkspace(workspaceContext);

  const { recipeId, quantity, channel, notes, paymentMethod, customerName, taxRate } = req.body;

  if (!recipeId) {
    return fail(res, "recipeId is required.", 400);
  }

  const numericQuantity = Number(quantity);
  if (!numericQuantity || numericQuantity <= 0) {
    return fail(res, "Valid quantity greater than zero is required.", 400);
  }

  const { inventory, recipes, sales, inventoryTransactions, vendorState, db } =
    getSalesState({ officeId, vendorId });
  const idempotencyKey = getIdempotencyKey(req);
  const previousResponse = findIdempotentResponse(vendorState, idempotencyKey, "sale");
  if (previousResponse) return ok(res, previousResponse, "Duplicate request ignored; original sale returned.", 200);

  const recipe = recipes.find((r) => String(r.id) === String(recipeId));
  if (!recipe) {
    return fail(res, "Recipe not found.", 404);
  }

  // Check inventory availability
  const planResult = buildRecipeConsumptionPlan({
    recipe,
    quantitySold: numericQuantity,
    inventory,
  });

  if (!planResult.ok) {
    return fail(res, planResult.message || "Inventory validation failed.", 409, {
      shortages: planResult.shortages,
    });
  }

  const now = new Date().toISOString();

  const saleRecord = buildSaleEntity({
    officeId,
    vendorId,
    recipeId: recipe.id,
    recipeName: recipe.menuItemName || recipe.name,
    quantity: numericQuantity,
    sellingPrice: Number(recipe.sellingPrice),
    totalAmount: Number(recipe.sellingPrice || 0) * numericQuantity,
    sellingPrice: Number(recipe.sellingPrice || 0),
    subtotal: Number(recipe.sellingPrice || 0) * numericQuantity,
    taxRate: Number(taxRate || 0),
    taxAmount: Number((Number(recipe.sellingPrice || 0) * numericQuantity * Number(taxRate || 0)) / 100),
    grandTotal: Number((Number(recipe.sellingPrice || 0) * numericQuantity * (1 + Number(taxRate || 0) / 100))),
    paymentMethod: paymentMethod || "cash",
    customerName: customerName || "Walk-in Customer",
    channel: channel || "manual",
    notes: notes || "",
    createdAt: now,
    inventoryImpact: {
      validated: true,
      deductionCount: planResult.plan.length,
    },
    deductions: planResult.plan.map((p) => ({
      inventoryItemId: p.inventoryItemId,
      itemName: p.inventoryItemName,
      deductedQuantity: p.requiredQty,
    })),
  });

  const saleId = saleRecord.id;

  const deductionTransactions = applyConsumptionPlan({
    inventory,
    plan: planResult.plan,
    officeId,
    vendorId,
    saleId,
    recipeId: recipe.id,
    recipeName: recipe.menuItemName || recipe.name,
  });

  // In-memory update is handled by applyConsumptionPlan
  sales.unshift(saleRecord);
  inventoryTransactions.unshift(...deductionTransactions);

  // Legacy support: also update transactions if they exist
  if (vendorState.transactions) {
    deductionTransactions.forEach((dt) => {
      createTransactionRecord(
        {
          id: getNextTransactionId(workspaceContext),
          itemId: dt.inventoryItemId,
          itemName: dt.inventoryItemName,
          type: "reduce",
          quantity: dt.quantity,
          reason: `Auto deduction from sale: ${saleRecord.recipeName} x ${numericQuantity}`,
          previousStock: dt.beforeStock,
          newStock: dt.afterStock,
          timestamp: now,
        },
        workspaceContext,
      );
    });
  }

  const responseData = { sale: saleRecord, data: saleRecord, deductions: deductionTransactions, workspace: workspaceContext };
  saveIdempotentResponse(vendorState, idempotencyKey, "sale", responseData);
  saveSalesState(db);
  await syncPostgresInventoryStock({ officeId, vendorId, inventory });
  publishRealtimeEvent({ scope: req.tenant || workspaceContext, event: {
    eventName: "sale.created", entityType: "sale", entityId: saleRecord.id,
    occurredAt: now, officeId, vendorId, orderId: saleRecord.orderId || null,
    revenue: saleRecord.grandTotal ?? saleRecord.totalAmount ?? 0,
    items: [{ recipeId: recipe.id, recipeName: saleRecord.recipeName, quantity: numericQuantity }],
    inventoryChanged: deductionTransactions.length > 0,
  }});

  return ok(res, responseData, "Sale recorded and inventory deducted successfully.", 201);
});

export const createOrder = asyncHandler(async (req, res) => {
  const workspaceContext = req.workspace || getWorkspaceContextFromRequest(req);
  const { officeId, vendorId } = workspaceContext;
  ensureWorkspace(workspaceContext);
  const { items = [], paymentMethod = "cash", customerName = "Walk-in Customer", taxRate = 0, channel = "counter", notes = "" } = req.body;
  if (!Array.isArray(items) || items.length === 0) return fail(res, "At least one order item is required.", 400);
  const { inventory, recipes, sales, inventoryTransactions, vendorState, db } = getSalesState({ officeId, vendorId });
  const idempotencyKey = getIdempotencyKey(req);
  const previousResponse = findIdempotentResponse(vendorState, idempotencyKey, "order");
  if (previousResponse) return ok(res, previousResponse, "Duplicate request ignored; original order returned.", 200);
  const normalized = [];
  // Plan against a shadow inventory so repeated ingredients across different
  // order lines are aggregated before any stock is changed.
  const planningInventory = inventory.map((item) => ({ ...item }));
  for (const item of items) {
    const recipe = recipes.find((r) => String(r.id) === String(item.recipeId));
    const quantity = Number(item.quantity || item.quantitySold || 0);
    if (!recipe) return fail(res, `Recipe ${item.recipeId} not found.`, 404);
    if (!quantity || quantity <= 0) return fail(res, `Invalid quantity for ${recipe.menuItemName || recipe.name}.`, 400);
    const planResult = buildRecipeConsumptionPlan({ recipe, quantitySold: quantity, inventory: planningInventory });
    if (!planResult.ok) return fail(res, `Cannot fulfill ${recipe.menuItemName || recipe.name}.`, 409, { shortages: planResult.shortages, recipeName: recipe.menuItemName || recipe.name });
    // Apply the plan to the shadow state before validating the next line.
    for (const step of planResult.plan) {
      const shadowItem = planningInventory.find((entry) => String(entry.id) === String(step.inventoryItemId));
      if (shadowItem) shadowItem.currentStock = step.afterStock;
    }
    normalized.push({ recipe, quantity, plan: planResult.plan });
  }
  const now = new Date().toISOString();
  const orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const receiptNumber = `BL-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-${String(Date.now()).slice(-6)}`;
  const subtotal = Number(normalized.reduce((sum, x) => sum + Number(x.recipe.sellingPrice || 0) * x.quantity, 0).toFixed(2));
  const rate = Number(taxRate || 0);
  const taxAmount = Number((subtotal * rate / 100).toFixed(2));
  const grandTotal = Number((subtotal + taxAmount).toFixed(2));
  const allTransactions = [];
  const createdSales = [];
  for (const line of normalized) {
    const sale = buildSaleEntity({ officeId, vendorId, recipeId: line.recipe.id, recipeName: line.recipe.menuItemName || line.recipe.name, quantity: line.quantity, sellingPrice: Number(line.recipe.sellingPrice || 0), totalAmount: Number((Number(line.recipe.sellingPrice || 0) * line.quantity).toFixed(2)), subtotal: Number((Number(line.recipe.sellingPrice || 0) * line.quantity).toFixed(2)), taxRate: rate, taxAmount: Number((Number(line.recipe.sellingPrice || 0) * line.quantity * rate / 100).toFixed(2)), grandTotal: Number(((Number(line.recipe.sellingPrice || 0) * line.quantity) * (1 + rate / 100)).toFixed(2)), paymentMethod, customerName, orderId, receiptNumber, channel, notes, createdAt: now, inventoryImpact: { validated: true, deductionCount: line.plan.length }, deductions: line.plan.map((part) => ({ inventoryItemId: part.inventoryItemId, itemName: part.inventoryItemName, deductedQuantity: part.requiredQty })) });
    const txns = applyConsumptionPlan({ inventory, plan: line.plan, officeId, vendorId, saleId: sale.id, recipeId: line.recipe.id, recipeName: line.recipe.menuItemName || line.recipe.name });
    allTransactions.push(...txns);
    createdSales.push(sale);
  }
  sales.unshift(...createdSales);
  inventoryTransactions.unshift(...allTransactions);
  if (vendorState.transactions) allTransactions.forEach((dt) => createTransactionRecord({ id: getNextTransactionId(workspaceContext), itemId: dt.inventoryItemId, itemName: dt.inventoryItemName, type: "reduce", quantity: dt.quantity, reason: `Auto deduction from order ${receiptNumber}`, previousStock: dt.beforeStock, newStock: dt.afterStock, timestamp: now }, workspaceContext));
  const responseData = { orderId, receiptNumber, items: createdSales, deductions: allTransactions, subtotal, taxRate: rate, taxAmount, grandTotal, paymentMethod, customerName, createdAt: now, workspace: workspaceContext };
  saveIdempotentResponse(vendorState, idempotencyKey, "order", responseData);
  saveSalesState(db);
  await syncPostgresInventoryStock({ officeId, vendorId, inventory });
  publishRealtimeEvent({ scope: req.tenant || workspaceContext, event: {
    eventName: "order.created", entityType: "order", entityId: orderId,
    occurredAt: now, officeId, vendorId, orderId, receiptNumber, revenue: grandTotal,
    items: createdSales.map((sale) => ({ recipeId: sale.recipeId, recipeName: sale.recipeName, quantity: sale.quantitySold ?? sale.quantity })),
    inventoryChanged: allTransactions.length > 0,
  }});
  return ok(res, responseData, "Order recorded, bill generated, and inventory deducted successfully.", 201);
});

export const getSalesAnalytics = (req, res) => {
  const workspaceContext = getWorkspaceContextFromRequest(req);
  ensureWorkspace(workspaceContext);

  const salesRecords = getAllSalesRecords(workspaceContext);

  const totalRevenue = salesRecords.reduce(
    (sum, sale) => sum + Number(sale.totalAmount || 0),
    0,
  );

  const totalUnitsSold = salesRecords.reduce(
    (sum, sale) => sum + Number(sale.quantitySold || 0),
    0,
  );

  const averageOrderValue =
    salesRecords.length > 0
      ? Number((totalRevenue / salesRecords.length).toFixed(2))
      : 0;

  const menuItemMap = {};
  const revenueTrendMap = {};
  const unitTrendMap = {};

  for (const sale of salesRecords) {
    const menuItemName = sale.menuItemName || "Unknown Item";
    const quantitySold = Number(sale.quantitySold || 0);
    const totalAmount = Number(sale.totalAmount || 0);

    if (!menuItemMap[menuItemName]) {
      menuItemMap[menuItemName] = {
        menuItemName,
        unitsSold: 0,
        revenue: 0,
        saleCount: 0,
      };
    }

    menuItemMap[menuItemName].unitsSold += quantitySold;
    menuItemMap[menuItemName].revenue += totalAmount;
    menuItemMap[menuItemName].saleCount += 1;

    const dateKey = new Date(sale.createdAt).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });

    if (!revenueTrendMap[dateKey]) {
      revenueTrendMap[dateKey] = {
        date: dateKey,
        revenue: 0,
      };
    }

    if (!unitTrendMap[dateKey]) {
      unitTrendMap[dateKey] = {
        date: dateKey,
        units: 0,
      };
    }

    revenueTrendMap[dateKey].revenue += totalAmount;
    unitTrendMap[dateKey].units += quantitySold;
  }

  const topMenuItems = Object.values(menuItemMap)
    .map((item) => ({
      ...item,
      revenue: Number(item.revenue.toFixed(2)),
    }))
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, 10);

  const slowMovingItems = Object.values(menuItemMap)
    .map((item) => ({
      ...item,
      revenue: Number(item.revenue.toFixed(2)),
    }))
    .sort((a, b) => a.unitsSold - b.unitsSold)
    .slice(0, 5);

  const revenueTrend = Object.values(revenueTrendMap).map((item) => ({
    ...item,
    revenue: Number(item.revenue.toFixed(2)),
  }));

  const unitTrend = Object.values(unitTrendMap);

  const recentSales = [...salesRecords]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);

  res.status(200).json({
    success: true,
    data: {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalUnitsSold,
      totalSalesCount: salesRecords.length,
      averageOrderValue,
      topMenuItems,
      slowMovingItems,
      revenueTrend,
      unitTrend,
      recentSales,
    },
    workspace: workspaceContext,
  });
};

export const getEnhancedSalesAnalytics = (req, res) => {
  try {
    const workspaceContext = req.workspace || getWorkspaceContextFromRequest(req);
    const { officeId, vendorId } = workspaceContext;
    ensureWorkspace(workspaceContext);

    const { sales, recipes } = getSalesState({ officeId, vendorId });

    res.status(200).json({
      success: true,
      data: {
        summary: buildSalesSummary({ sales, now: new Date() }),
        topSellingRecipes: buildTopSellingRecipes({ sales, limit: 5 }),
        hourlyDistribution: buildHourlySalesDistribution({ sales }),
        dailyTrend7d: buildDailySalesTrend({ sales, days: 7, now: new Date() }),
      },
      workspace: workspaceContext,
    });
  } catch (error) {
    console.error("getEnhancedSalesAnalytics error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch enhanced analytics" });
  }
};

export const cancelOrder = asyncHandler(async (req, res) => {
  const workspaceContext = req.workspace || getWorkspaceContextFromRequest(req);
  const { officeId, vendorId } = workspaceContext;
  ensureWorkspace(workspaceContext);
  const { orderId } = req.params;
  const { reason = 'Order cancelled' } = req.body || {};
  const { inventory, sales, inventoryTransactions, vendorState, db } = getSalesState({ officeId, vendorId });
  const orderSales = sales.filter(s => String(s.orderId) === String(orderId));
  if (!orderSales.length) return fail(res, 'Order not found.', 404);
  if (orderSales.every(s => String(s.status || 'completed').toLowerCase() === 'cancelled')) return fail(res, 'Order is already cancelled.', 409);
  const now = new Date().toISOString();
  const reversals = [];
  for (const sale of orderSales) {
    if (String(sale.status || 'completed').toLowerCase() === 'cancelled') continue;
    for (const deduction of (sale.deductions || [])) {
      const item = inventory.find(i => String(i.id) === String(deduction.inventoryItemId));
      if (!item) throw new Error(`Inventory item ${deduction.inventoryItemId} no longer exists.`);
      const before = Number(item.currentStock || 0);
      const qty = Number(deduction.deductedQuantity || deduction.quantity || 0);
      item.currentStock = Number((before + qty).toFixed(4));
      item.lastUpdatedAt = now;
      item.status = calculateStatus(item);
      const tx = buildInventoryTransactionEntity({ officeId,vendorId,inventoryItemId:item.id,inventoryItemName:item.itemName||item.name,type:'sale_reversal',direction:'in',quantity:qty,unit:item.unit||'',beforeStock:before,afterStock:item.currentStock,sourceType:'order_cancellation',sourceId:orderId,recipeId:sale.recipeId,recipeName:sale.recipeName,createdAt:now,meta:{reason} });
      reversals.push(tx); inventoryTransactions.unshift(tx);
    }
    sale.status='cancelled'; sale.cancelledAt=now; sale.cancellationReason=String(reason).trim();
  }
  if (vendorState.transactions) reversals.forEach(dt => createTransactionRecord({id:getNextTransactionId(workspaceContext),itemId:dt.inventoryItemId,itemName:dt.inventoryItemName,type:'add',quantity:dt.quantity,reason:`Order cancellation ${orderId}: ${reason}`,previousStock:dt.beforeStock,newStock:dt.afterStock,timestamp:now},workspaceContext));
  saveSalesState(db);
  await syncPostgresInventoryStock({ officeId, vendorId, inventory });
  publishRealtimeEvent({ scope: req.tenant || workspaceContext, event: {
    eventName: "order.cancelled", entityType: "order", entityId: orderId,
    occurredAt: now, officeId, vendorId, orderId, inventoryChanged: reversals.length > 0,
  }});
  res.json({success:true,data:{orderId,status:'cancelled',restoredTransactions:reversals.length,sales:orderSales},workspace:workspaceContext,message:'Order cancelled and deducted stock restored.'});
});
