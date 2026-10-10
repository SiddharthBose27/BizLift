/**
 * server/services/inventoryEngine.js (Refined Batch 1)
 * Central engine for inventory consumption planning and application.
 */

export const roundQty = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 1000) / 1000;

export const normalize = (value) => String(value || "").trim().toLowerCase();

export const deriveInventoryStatus = (item) => {
  const stock = Number(item.currentStock || 0);
  const threshold = Number(item.minThreshold ?? item.lowStockThreshold ?? 0);

  if (stock <= 0) return "Out of Stock";
  if (threshold > 0 && stock <= threshold) return "Low Stock";
  return "In Stock";
};

export const findInventoryItemForIngredient = (inventory, ingredient) => {
  const ingredientItemId =
    ingredient.inventoryItemId ||
    ingredient.itemId ||
    ingredient.ingredientItemId;

  if (ingredientItemId) {
    const directMatch = inventory.find(
      (item) => String(item.id) === String(ingredientItemId),
    );
    if (directMatch) return directMatch;
  }

  const ingredientName = normalize(
    ingredient.inventoryItemName ||
      ingredient.itemName ||
      ingredient.name ||
      ingredient.ingredientName,
  );

  if (!ingredientName) return null;

  return inventory.find((item) => {
    const itemName = normalize(item.itemName || item.name);
    return itemName === ingredientName;
  });
};

export const buildRecipeConsumptionPlan = ({
  recipe,
  quantitySold,
  inventory,
}) => {
  const qtySold = Number(quantitySold || 0);

  if (!qtySold || qtySold <= 0) {
    return {
      ok: false,
      code: "INVALID_SALE_QUANTITY",
      message: "Sale quantity must be greater than zero.",
      shortages: [],
      plan: [],
    };
  }

  const ingredients = Array.isArray(recipe?.ingredients)
    ? recipe.ingredients
    : [];

  if (!ingredients.length) {
    return {
      ok: false,
      code: "RECIPE_HAS_NO_INGREDIENTS",
      message: "Recipe does not contain ingredients.",
      shortages: [],
      plan: [],
    };
  }

  const shortages = [];
  const plan = [];
  const plannedByInventoryId = new Map();

  for (const ingredient of ingredients) {
    const matchedItem = findInventoryItemForIngredient(inventory, ingredient);

    const ingredientLabel =
      ingredient.inventoryItemName ||
      ingredient.itemName ||
      ingredient.name ||
      ingredient.ingredientName ||
      "Unknown ingredient";

    const ingredientQty = Number(ingredient.quantity || ingredient.qty || 0);
    const requiredQty = roundQty(ingredientQty * qtySold);

    if (!matchedItem) {
      shortages.push({
        ingredientName: ingredientLabel,
        reason: "MISSING_INVENTORY_MAPPING",
        requiredQty,
        availableQty: 0,
        unit: ingredient.unit || "",
      });
      continue;
    }

    const ingredientUnit = normalize(ingredient.unit);
    const inventoryUnit = normalize(matchedItem.unit);

    if (ingredientUnit && inventoryUnit && ingredientUnit !== inventoryUnit) {
      shortages.push({
        ingredientName: matchedItem.itemName || matchedItem.name || ingredientLabel,
        reason: "UNIT_MISMATCH",
        requiredQty,
        availableQty: Number(matchedItem.currentStock || 0),
        unit: `${ingredient.unit} vs ${matchedItem.unit}`,
        inventoryItemId: matchedItem.id,
      });
      continue;
    }

    const baseStock = Number(matchedItem.currentStock || 0);
    const previouslyPlanned = Number(plannedByInventoryId.get(String(matchedItem.id)) || 0);
    const availableQty = Math.max(0, baseStock - previouslyPlanned);

    if (availableQty < requiredQty) {
      shortages.push({
        ingredientName: matchedItem.itemName || matchedItem.name || ingredientLabel,
        reason: "INSUFFICIENT_STOCK",
        requiredQty,
        availableQty,
        deficitQty: roundQty(requiredQty - availableQty),
        unit: matchedItem.unit || ingredient.unit || "",
        inventoryItemId: matchedItem.id,
      });
      continue;
    }

    plannedByInventoryId.set(String(matchedItem.id), previouslyPlanned + requiredQty);
    plan.push({
      inventoryItemId: matchedItem.id,
      inventoryItemName: matchedItem.itemName || matchedItem.name || ingredientLabel,
      unit: matchedItem.unit || ingredient.unit || "",
      requiredQty,
      beforeStock: roundQty(availableQty),
      afterStock: roundQty(availableQty - requiredQty),
      ingredientReference: {
        recipeIngredientId: ingredient.id || null,
        ingredientName: ingredientLabel,
      },
    });
  }

  if (shortages.length) {
    return {
      ok: false,
      code: "INSUFFICIENT_INVENTORY",
      message: "Inventory validation failed for this sale.",
      shortages,
      plan,
    };
  }

  return {
    ok: true,
    code: "OK",
    message: "Inventory validation passed.",
    shortages: [],
    plan,
  };
};

export const applyConsumptionPlan = ({
  inventory,
  plan,
  officeId,
  vendorId,
  saleId,
  recipeId,
  recipeName,
}) => {
  const now = new Date().toISOString();
  const transactions = [];

  for (const step of plan) {
    const item = inventory.find(
      (entry) => String(entry.id) === String(step.inventoryItemId),
    );

    if (!item) continue;

    item.currentStock = roundQty(step.afterStock);
    item.lastUpdated = now.split("T")[0]; // Keeping existing field name lastUpdated
    item.lastUpdatedAt = now; // Adding batch 1 field
    item.status = deriveInventoryStatus(item);

    transactions.push({
      id: `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      officeId,
      vendorId,
      inventoryItemId: item.id,
      itemName: item.itemName || item.name || step.inventoryItemName, // Legacy mapping
      inventoryItemName: item.itemName || item.name || step.inventoryItemName,
      type: "sale_deduction",
      direction: "out",
      quantity: step.requiredQty,
      unit: step.unit || item.unit || "",
      beforeStock: step.beforeStock,
      afterStock: step.afterStock,
      previousStock: step.beforeStock, // Legacy mapping
      newStock: step.afterStock, // Legacy mapping
      sourceType: "sale",
      sourceId: saleId,
      recipeId,
      recipeName,
      timestamp: now, // Legacy mapping
      createdAt: now,
      meta: {
        reason: "Recipe consumption after sale",
        ingredientReference: step.ingredientReference,
      },
    });
  }

  return transactions;
};

export const buildReorderSuggestions = ({ item, metrics }) => {
  const stock = Number(item.currentStock || 0);
  const minThreshold = Number(item.minThreshold || item.lowStockThreshold || 0);
  const avgDailyUsage = Number(metrics?.averageDailyUsage ?? metrics?.avgDailyUsage30d ?? 0);

  const daysRemaining =
    avgDailyUsage > 0 ? Math.floor(stock / avgDailyUsage) : 999;

  // Should reorder if below threshold OR if we have less than 3 days of stock
  const shouldReorder = stock <= minThreshold || daysRemaining <= 3;

  let urgency = "low";
  if (stock <= 0) {
    urgency = "critical";
  } else if (stock <= minThreshold * 0.5 || daysRemaining <= 1) {
    urgency = "high";
  } else if (stock <= minThreshold || daysRemaining <= 2) {
    urgency = "medium";
  }

  return {
    ...item,
    inventoryItemId: item.id,
    shouldReorder,
    urgency,
    daysRemaining: daysRemaining === 999 ? null : daysRemaining,
    suggestedReorderQty: Math.max(0, Math.ceil(Math.max(minThreshold - stock, avgDailyUsage * 7 - stock))),
    avgDailyUsage30d: Number(avgDailyUsage.toFixed(2)),
    estimatedCost: Number((Math.max(0, Math.ceil(Math.max(minThreshold - stock, avgDailyUsage * 7 - stock))) * Number(item.costPrice || 0)).toFixed(2)),
    forecast14Days: Number((avgDailyUsage * 14).toFixed(2)),
    coverageDaysAfterReorder: avgDailyUsage > 0 ? Number(((stock + Math.max(0, Math.ceil(Math.max(minThreshold - stock, avgDailyUsage * 7 - stock)))) / avgDailyUsage).toFixed(1)) : null,
  };
};
