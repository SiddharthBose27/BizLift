// server/domain/models.js

export const ENTITY_NAMES = {
  OFFICE: "office",
  VENDOR: "vendor",
  INVENTORY_ITEM: "inventory_item",
  RECIPE: "recipe",
  SALE: "sale",
  INVENTORY_TRANSACTION: "inventory_transaction",
  WASTE_EVENT: "waste_event",
  USER: "user",
  SESSION: "session",
};

export const ROLE_NAMES = {
  OFFICE_ADMIN: "office_admin",
  VENDOR: "vendor",
  OWNER: "owner",
  ADMIN: "admin",
  MANAGER: "manager",
  INVENTORY_MANAGER: "inventory_manager",
  CASHIER: "cashier",
  ANALYST: "analyst",
  VIEWER: "viewer",
};

export const INVENTORY_TRANSACTION_TYPES = {
  SALE_DEDUCTION: "sale_deduction",
  MANUAL_ADJUSTMENT: "manual_adjustment",
  WASTE: "waste",
};

export const INVENTORY_STATUS = {
  HEALTHY: "healthy",
  LOW: "low",
  OUT: "out",
};
