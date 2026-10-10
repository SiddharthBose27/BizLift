// server/domain/entityBuilders.js

import { createEntityId } from "../utils/idFactory.js";
import {
  normalizeNullableString,
  normalizeNumber,
  normalizeTimestamp,
  normalizeArray,
} from "../utils/entityNormalizer.js";

/**
 * Standardized Sale Entity Builder.
 */
export const buildSaleEntity = ({
  officeId,
  vendorId,
  recipeId,
  recipeName,
  quantity,
  channel,
  notes,
  inventoryImpact,
  sellingPrice,
  totalAmount,
  paymentMethod,
  customerName,
  taxRate,
  subtotal,
  taxAmount,
  grandTotal,
  orderId,
  receiptNumber,
  createdAt,
}) => {
  const timestamp = normalizeTimestamp(createdAt);

  return {
    id: createEntityId("sale"),
    officeId,
    vendorId,
    recipeId,
    recipeName,
    quantity: normalizeNumber(quantity),
    sellingPrice: normalizeNumber(sellingPrice),
    totalAmount: normalizeNumber(totalAmount),
    subtotal: normalizeNumber(subtotal ?? totalAmount),
    taxRate: normalizeNumber(taxRate),
    taxAmount: normalizeNumber(taxAmount),
    grandTotal: normalizeNumber(grandTotal ?? totalAmount),
    paymentMethod: normalizeNullableString(paymentMethod) || "cash",
    customerName: normalizeNullableString(customerName) || "Walk-in Customer",
    orderId: normalizeNullableString(orderId) || createEntityId("order"),
    receiptNumber: normalizeNullableString(receiptNumber) || "",
    channel: normalizeNullableString(channel) || "manual",
    notes: normalizeNullableString(notes) || "",
    createdAt: timestamp,
    inventoryImpact: inventoryImpact || {
      validated: false,
      deductionCount: 0,
    },
  };
};

/**
 * Standardized Inventory Transaction Entity Builder.
 */
export const buildInventoryTransactionEntity = ({
  officeId,
  vendorId,
  inventoryItemId,
  inventoryItemName,
  type,
  direction,
  quantity,
  unit,
  beforeStock,
  afterStock,
  sourceType,
  sourceId,
  recipeId,
  recipeName,
  meta,
  createdAt,
}) => ({
  id: createEntityId("txn"),
  officeId,
  vendorId,
  inventoryItemId,
  inventoryItemName,
  type,
  direction,
  quantity: normalizeNumber(quantity),
  unit: normalizeNullableString(unit) || "",
  beforeStock: normalizeNumber(beforeStock),
  afterStock: normalizeNumber(afterStock),
  sourceType: normalizeNullableString(sourceType) || "",
  sourceId: normalizeNullableString(sourceId) || "",
  recipeId: normalizeNullableString(recipeId),
  recipeName: normalizeNullableString(recipeName),
  createdAt: normalizeTimestamp(createdAt),
  meta: meta || {},
});

/**
 * Standardized Waste Event Entity Builder.
 */
export const buildWasteEventEntity = ({
  officeId,
  vendorId,
  inventoryItemId,
  inventoryItemName,
  quantity,
  unit,
  unitCost,
  reason,
  notes,
  beforeStock,
  afterStock,
  createdAt,
}) => ({
  id: createEntityId("waste"),
  officeId,
  vendorId,
  inventoryItemId,
  inventoryItemName,
  quantity: normalizeNumber(quantity),
  unit: normalizeNullableString(unit) || "",
  unitCost: normalizeNumber(unitCost),
  reason: normalizeNullableString(reason) || "unspecified",
  notes: normalizeNullableString(notes) || "",
  beforeStock: normalizeNumber(beforeStock),
  afterStock: normalizeNumber(afterStock),
  createdAt: normalizeTimestamp(createdAt),
});

/**
 * Standardized Recipe Entity Builder.
 */
export const buildRecipeEntity = ({
  officeId,
  vendorId,
  name,
  ingredients,
  createdAt,
  updatedAt,
}) => ({
  id: createEntityId("recipe"),
  officeId,
  vendorId,
  name: String(name || "").trim(),
  ingredients: normalizeArray(ingredients),
  createdAt: normalizeTimestamp(createdAt),
  updatedAt: normalizeTimestamp(updatedAt || createdAt),
});
