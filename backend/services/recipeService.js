import { getWorkspaceStore } from "./workspaceService.js";

const getWorkspaceRecipeStore = (workspaceContext) => {
  return getWorkspaceStore(workspaceContext).recipes;
};

export const getAllRecipes = (workspaceContext) => {
  return getWorkspaceRecipeStore(workspaceContext);
};

export const getRecipeById = (id, workspaceContext) => {
  return getWorkspaceRecipeStore(workspaceContext).find(
    (recipe) => Number(recipe.id) === Number(id),
  );
};

export const getRecipeIndexById = (id, workspaceContext) => {
  return getWorkspaceRecipeStore(workspaceContext).findIndex(
    (recipe) => Number(recipe.id) === Number(id),
  );
};

export const getNextRecipeId = (workspaceContext) => {
  const store = getWorkspaceRecipeStore(workspaceContext);
  if (!store.length) return 1;
  return Math.max(...store.map((item) => Number(item.id) || 0)) + 1;
};

export const createRecipeRecord = (recipe, workspaceContext) => {
  const store = getWorkspaceRecipeStore(workspaceContext);
  store.push(recipe);
  return recipe;
};

export const updateRecipeRecord = (index, updatedRecipe, workspaceContext) => {
  const store = getWorkspaceRecipeStore(workspaceContext);
  store[index] = updatedRecipe;
  return store[index];
};

export const deleteRecipeRecord = (index, workspaceContext) => {
  const store = getWorkspaceRecipeStore(workspaceContext);
  return store.splice(index, 1)[0];
};
