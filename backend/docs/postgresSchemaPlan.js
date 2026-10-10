// Batch 11: PostgreSQL schema map.
// The executable source of truth is backend/prisma/schema.prisma.

export const POSTGRES_SCHEMA_PLAN = {
  tenancy: ["organizations", "offices", "vendors"],
  identity: ["users", "sessions"],
  operations: [
    "inventory_items",
    "recipes",
    "recipe_ingredients",
    "sales",
    "inventory_transactions",
    "waste_events",
  ],
  procurement: ["suppliers", "purchase_orders", "purchase_order_items"],
  intelligence: [
    "demand_observations",
    "forecast_runs",
    "recommendation_outcomes",
    "analytics_events",
  ],
};

export const DATABASE_MIGRATION_POLICY = {
  demoMode: "json",
  productionMode: "postgres",
  rule: "Introduce repository-backed cutovers incrementally; do not remove the working demo store in Batch 11.",
};
