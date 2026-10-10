// server/utils/idFactory.js

/**
 * Standardized entity ID factory.
 * @param {string} prefix - The prefix for the ID (e.g., 'sale', 'txn', 'recipe').
 * @returns {string} - A unique ID string.
 */
export const createEntityId = (prefix) => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};
