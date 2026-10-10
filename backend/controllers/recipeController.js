import {
  getAllRecipes as getAllRecipeRecords,
  getRecipeById,
  getRecipeIndexById,
  getNextRecipeId,
  createRecipeRecord,
  updateRecipeRecord,
  deleteRecipeRecord,
} from "../services/recipeService.js";
import { getWorkspaceContextFromRequest } from "../utils/workspaceContext.js";
import { ensureWorkspace } from "../services/workspaceService.js";
import {
  getRecipeState,
  saveRecipeState,
} from "../repositories/recipeRepository.js";
import {
  validateRecipePayload,
  buildRecipeDependencySummary,
} from "../services/recipeEngine.js";
import { buildRecipeEntity } from "../domain/entityBuilders.js";

const getTimestamp = () => {
  return new Date().toISOString();
};

export const getAllRecipes = (req, res) => {
  try {
    const workspaceContext = req.workspace || getWorkspaceContextFromRequest(req);
    const { officeId, vendorId } = workspaceContext;
    ensureWorkspace(workspaceContext);

    const { recipes } = getRecipeState({ officeId, vendorId });

    res.status(200).json({
      success: true,
      count: recipes.length,
      data: recipes,
      workspace: workspaceContext,
    });
  } catch (error) {
    console.error("getAllRecipes error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const createRecipe = (req, res) => {
  try {
    const workspaceContext = req.workspace || getWorkspaceContextFromRequest(req);
    const { officeId, vendorId } = workspaceContext;
    ensureWorkspace(workspaceContext);

    const { inventory, recipes, db } = getRecipeState({ officeId, vendorId });

    const validation = validateRecipePayload({
      recipe: req.body,
      inventory,
    });

    if (!validation.ok) {
      return res.status(400).json({
        success: false,
        message: "Recipe validation failed.",
        errors: validation.errors,
      });
    }

    const { normalizedRecipe } = validation;

    const now = new Date().toISOString();

    const newRecipe = buildRecipeEntity({
      officeId,
      vendorId,
      name: validation.normalizedRecipe.menuItemName || validation.normalizedRecipe.name,
      ingredients: validation.normalizedRecipe.ingredients,
      createdAt: now,
      updatedAt: now,
    });

    // Handle sellingPrice explicitly if not in builder
    newRecipe.sellingPrice = Number(req.body.sellingPrice || 0);
    newRecipe.menuItemName = newRecipe.name;

    recipes.unshift(newRecipe);

    saveRecipeState(db);

    res.status(201).json({
      success: true,
      message: "Recipe created successfully.",
      data: newRecipe,
      workspace: workspaceContext,
    });
  } catch (error) {
    console.error("createRecipe error:", error);
    res.status(500).json({ success: false, message: "Failed to create recipe" });
  }
};

export const updateRecipe = (req, res) => {
  const workspaceContext = getWorkspaceContextFromRequest(req);
  ensureWorkspace(workspaceContext);
  const recipeId = Number(req.params.id);
  const { menuItemName, sellingPrice, ingredients } = req.body;

  const recipeIndex = getRecipeIndexById(recipeId, workspaceContext);

  if (recipeIndex === -1) {
    return res.status(404).json({
      success: false,
      message: "Recipe not found.",
    });
  }

  if (
    !menuItemName ||
    !Array.isArray(ingredients) ||
    ingredients.length === 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Please provide a menu item name and at least one ingredient.",
    });
  }

  const cleanedIngredients = ingredients
    .filter(
      (ingredient) =>
        ingredient.inventoryItemId &&
        ingredient.itemName &&
        ingredient.quantity !== undefined &&
        ingredient.unit,
    )
    .map((ingredient) => ({
      inventoryItemId: Number(ingredient.inventoryItemId),
      itemName: ingredient.itemName.trim(),
      quantity: Number(ingredient.quantity),
      unit: ingredient.unit.trim(),
    }));

  const recipes = getAllRecipeRecords(workspaceContext);

  const updatedRecipe = {
    ...recipes[recipeIndex],
    menuItemName: menuItemName.trim(),
    sellingPrice: sellingPrice ? Number(sellingPrice) : 0,
    ingredients: cleanedIngredients,
    updatedAt: getTimestamp(),
  };

  updateRecipeRecord(recipeIndex, updatedRecipe, workspaceContext);
  const { db } = getRecipeState(workspaceContext);
  saveRecipeState(db);

  res.status(200).json({
    success: true,
    message: "Recipe updated successfully.",
    data: updatedRecipe,
    workspace: workspaceContext,
  });
};

export const deleteRecipe = (req, res) => {
  const workspaceContext = getWorkspaceContextFromRequest(req);
  ensureWorkspace(workspaceContext);
  const recipeId = Number(req.params.id);
  const recipeIndex = getRecipeIndexById(recipeId, workspaceContext);

  if (recipeIndex === -1) {
    return res.status(404).json({
      success: false,
      message: "Recipe not found.",
    });
  }

  const deletedRecipe = deleteRecipeRecord(recipeIndex, workspaceContext);
  const { db } = getRecipeState(workspaceContext);
  saveRecipeState(db);

  res.status(200).json({
    success: true,
    message: "Recipe deleted successfully.",
    data: deletedRecipe,
    workspace: workspaceContext,
  });
};

export const getRecipeDependencySummary = (req, res) => {
  try {
    const workspaceContext = req.workspace || getWorkspaceContextFromRequest(req);
    const { officeId, vendorId } = workspaceContext;
    ensureWorkspace(workspaceContext);

    const { recipes, inventory } = getRecipeState({ officeId, vendorId });

    const summary = buildRecipeDependencySummary({
      recipes,
      inventory,
    });

    res.status(200).json({
      success: true,
      data: summary,
      workspace: workspaceContext,
    });
  } catch (error) {
    console.error("getRecipeDependencySummary error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch dependency summary" });
  }
};
