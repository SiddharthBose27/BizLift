/**
 * server/services/recipeEngine.js (Batch 5)
 * Logic for recipe validation, normalization, and dependency analysis.
 */

const normalize = (value) => String(value || "").trim().toLowerCase();

const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const findInventoryMatch = (inventory, ingredient) => {
  const directId =
    ingredient.inventoryItemId ||
    ingredient.itemId ||
    ingredient.ingredientItemId;

  if (directId) {
    const byId = inventory.find((item) => String(item.id) === String(directId));
    if (byId) return byId;
  }

  const ingredientName = normalize(
    ingredient.inventoryItemName ||
      ingredient.itemName ||
      ingredient.name ||
      ingredient.ingredientName,
  );

  if (!ingredientName) return null;

  return inventory.find((item) => {
    const itemName = normalize(item.name || item.itemName);
    return itemName === ingredientName;
  });
};

export const normalizeRecipeIngredient = (ingredient, inventory) => {
  const inventoryMatch = findInventoryMatch(inventory, ingredient);

  return {
    inventoryItemId:
      inventoryMatch?.id ||
      ingredient.inventoryItemId ||
      ingredient.itemId ||
      null,
    inventoryItemName:
      inventoryMatch?.name ||
      inventoryMatch?.itemName ||
      ingredient.inventoryItemName ||
      ingredient.itemName ||
      ingredient.name ||
      ingredient.ingredientName ||
      "",
    quantity: safeNumber(ingredient.quantity || ingredient.qty),
    unit: ingredient.unit || inventoryMatch?.unit || "",
  };
};

export const validateRecipePayload = ({ recipe, inventory }) => {
  const errors = [];

  const recipeName = String(recipe?.menuItemName || recipe?.name || "").trim();
  if (!recipeName) {
    errors.push("Recipe name is required.");
  }

  const ingredients = Array.isArray(recipe?.ingredients)
    ? recipe.ingredients
    : [];
  if (!ingredients.length) {
    errors.push("At least one ingredient is required.");
  }

  const normalizedIngredients = ingredients.map((ingredient) =>
    normalizeRecipeIngredient(ingredient, inventory),
  );

  normalizedIngredients.forEach((ingredient, index) => {
    if (!ingredient.inventoryItemId && !ingredient.inventoryItemName) {
      errors.push(
        `Ingredient ${index + 1} is missing a valid inventory mapping.`,
      );
    }

    if (!ingredient.quantity || ingredient.quantity <= 0) {
      errors.push(
        `Ingredient ${index + 1} must have quantity greater than zero.`,
      );
    }

    const matchedItem = inventory.find(
      (item) => String(item.id) === String(ingredient.inventoryItemId),
    );

    if (!matchedItem) {
      errors.push(
        `Ingredient "${ingredient.inventoryItemName || `#${index + 1}`}" is not linked to inventory.`,
      );
      return;
    }

    const recipeUnit = normalize(ingredient.unit);
    const inventoryUnit = normalize(matchedItem.unit);

    if (recipeUnit && inventoryUnit && recipeUnit !== inventoryUnit) {
      errors.push(
        `Unit mismatch for "${ingredient.inventoryItemName}": recipe uses ${ingredient.unit}, inventory uses ${matchedItem.unit}.`,
      );
    }
  });

  return {
    ok: errors.length === 0,
    errors,
    normalizedRecipe: {
      ...recipe,
      menuItemName: recipeName,
      ingredients: normalizedIngredients,
    },
  };
};

export const buildRecipeDependencySummary = ({ recipes, inventory }) => {
  const dependencyMap = new Map();

  recipes.forEach((recipe) => {
    const ingredients = Array.isArray(recipe.ingredients)
      ? recipe.ingredients
      : [];

    ingredients.forEach((ingredient) => {
      const inventoryMatch = findInventoryMatch(inventory, ingredient);
      if (!inventoryMatch) return;

      const key = String(inventoryMatch.id);

      if (!dependencyMap.has(key)) {
        dependencyMap.set(key, {
          inventoryItemId: inventoryMatch.id,
          inventoryItemName: inventoryMatch.name || inventoryMatch.itemName,
          recipeCount: 0,
          recipeNames: [],
        });
      }

      const entry = dependencyMap.get(key);
      entry.recipeCount += 1;
      entry.recipeNames.push(recipe.menuItemName || recipe.name);
    });
  });

  return Array.from(dependencyMap.values()).sort(
    (a, b) => b.recipeCount - a.recipeCount,
  );
};
