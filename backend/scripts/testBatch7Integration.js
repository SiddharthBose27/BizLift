import assert from "node:assert/strict";
import { getIdempotencyKey, findIdempotentResponse, saveIdempotentResponse } from "../services/idempotencyService.js";
import { buildRecipeConsumptionPlan } from "../services/inventoryEngine.js";

const request = { get: (name) => name === "Idempotency-Key" ? "pos-request-123" : null, body: {} };
assert.equal(getIdempotencyKey(request), "pos-request-123");
assert.equal(getIdempotencyKey({ get: () => "x".repeat(161), body: {} }), null);
const workspace = {};
const response = { orderId: "order-1", grandTotal: 140 };
saveIdempotentResponse(workspace, "pos-request-123", "order", response, "2026-10-09T00:00:00.000Z");
assert.deepEqual(findIdempotentResponse(workspace, "pos-request-123", "order"), response);
assert.equal(findIdempotentResponse(workspace, "pos-request-123", "sale"), null);

const inventory = [{ id: 1, itemName: "Paneer", currentStock: 100, unit: "g" }];
const recipe = { menuItemName: "Paneer Wrap", ingredients: [{ inventoryItemId: 1, inventoryItemName: "Paneer", quantity: 40, unit: "g" }] };
const shadow = inventory.map((item) => ({ ...item }));
const first = buildRecipeConsumptionPlan({ recipe, quantitySold: 1, inventory: shadow });
assert.equal(first.ok, true);
shadow.find((item) => item.id === 1).currentStock = first.plan[0].afterStock;
const second = buildRecipeConsumptionPlan({ recipe, quantitySold: 2, inventory: shadow });
assert.equal(second.ok, false);
assert.equal(second.shortages[0].availableQty, 60);
assert.equal(second.shortages[0].requiredQty, 80);

const duplicateIngredientRecipe = { menuItemName: "Double Paneer Wrap", ingredients: [
  { inventoryItemId: 1, inventoryItemName: "Paneer", quantity: 30, unit: "g" },
  { inventoryItemId: 1, inventoryItemName: "Paneer", quantity: 30, unit: "g" },
] };
const duplicateIngredientPlan = buildRecipeConsumptionPlan({ recipe: duplicateIngredientRecipe, quantitySold: 1, inventory: [{ id: 1, itemName: "Paneer", currentStock: 50, unit: "g" }] });
assert.equal(duplicateIngredientPlan.ok, false, "duplicate ingredient rows must aggregate demand");
assert.equal(duplicateIngredientPlan.shortages[0].availableQty, 20);
assert.equal(duplicateIngredientPlan.shortages[0].requiredQty, 30);
