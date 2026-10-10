-- BizLift Batch 11 — PostgreSQL foundation.
-- Generated as a reviewable baseline migration. Prisma can manage future migrations.

CREATE TYPE "InventoryStatus" AS ENUM ('healthy', 'low', 'out');
CREATE TYPE "InventoryTransactionType" AS ENUM ('sale_deduction', 'manual_adjustment', 'waste', 'purchase_receipt', 'return_in', 'return_out');
CREATE TYPE "OrderChannel" AS ENUM ('pos', 'online', 'kiosk', 'other');
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('draft', 'submitted', 'approved', 'ordered', 'partially_received', 'received', 'cancelled');

CREATE TABLE "organizations" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");
CREATE INDEX "organizations_created_at_idx" ON "organizations"("created_at");

CREATE TABLE "offices" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "offices_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "offices_organization_id_idx" ON "offices"("organization_id");

CREATE TABLE "vendors" (
  "id" TEXT NOT NULL,
  "office_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "vendors_office_id_idx" ON "vendors"("office_id");

CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT,
  "office_id" TEXT,
  "vendor_id" TEXT,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_organization_id_idx" ON "users"("organization_id");
CREATE INDEX "users_office_id_vendor_id_idx" ON "users"("office_id", "vendor_id");
CREATE INDEX "users_role_idx" ON "users"("role");

CREATE TABLE "sessions" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMP(3),
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");
CREATE INDEX "sessions_user_id_expires_at_idx" ON "sessions"("user_id", "expires_at");
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

CREATE TABLE "inventory_items" (
  "id" TEXT NOT NULL,
  "office_id" TEXT NOT NULL,
  "vendor_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT,
  "unit" TEXT NOT NULL,
  "current_stock" DECIMAL(14,3) NOT NULL DEFAULT 0,
  "min_threshold" DECIMAL(14,3) NOT NULL DEFAULT 0,
  "cost_price" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "selling_price" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "supplier_name" TEXT,
  "expiry_date" TIMESTAMP(3),
  "status" "InventoryStatus" NOT NULL DEFAULT 'healthy',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_items_office_id_vendor_id_idx" ON "inventory_items"("office_id", "vendor_id");
CREATE INDEX "inventory_items_vendor_id_status_idx" ON "inventory_items"("vendor_id", "status");
CREATE INDEX "inventory_items_vendor_id_expiry_date_idx" ON "inventory_items"("vendor_id", "expiry_date");

CREATE TABLE "recipes" (
  "id" TEXT NOT NULL,
  "office_id" TEXT NOT NULL,
  "vendor_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "recipes_office_id_vendor_id_idx" ON "recipes"("office_id", "vendor_id");

CREATE TABLE "recipe_ingredients" (
  "id" TEXT NOT NULL,
  "recipe_id" TEXT NOT NULL,
  "inventory_item_id" TEXT NOT NULL,
  "quantity" DECIMAL(14,3) NOT NULL,
  "unit" TEXT NOT NULL,
  CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "recipe_ingredients_recipe_id_inventory_item_id_key" ON "recipe_ingredients"("recipe_id", "inventory_item_id");
CREATE INDEX "recipe_ingredients_inventory_item_id_idx" ON "recipe_ingredients"("inventory_item_id");

CREATE TABLE "sales" (
  "id" TEXT NOT NULL,
  "office_id" TEXT NOT NULL,
  "vendor_id" TEXT NOT NULL,
  "recipe_id" TEXT,
  "recipe_name" TEXT,
  "quantity" DECIMAL(14,3) NOT NULL,
  "unit_price" DECIMAL(14,2),
  "total_amount" DECIMAL(14,2),
  "channel" "OrderChannel" NOT NULL DEFAULT 'pos',
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "sales_vendor_id_created_at_idx" ON "sales"("vendor_id", "created_at");
CREATE INDEX "sales_office_id_created_at_idx" ON "sales"("office_id", "created_at");

CREATE TABLE "inventory_transactions" (
  "id" TEXT NOT NULL,
  "office_id" TEXT NOT NULL,
  "vendor_id" TEXT NOT NULL,
  "inventory_item_id" TEXT NOT NULL,
  "inventory_item_name" TEXT,
  "type" "InventoryTransactionType" NOT NULL,
  "direction" TEXT NOT NULL,
  "quantity" DECIMAL(14,3) NOT NULL,
  "unit" TEXT NOT NULL,
  "before_stock" DECIMAL(14,3) NOT NULL,
  "after_stock" DECIMAL(14,3) NOT NULL,
  "source_type" TEXT,
  "source_id" TEXT,
  "sale_id" TEXT,
  "recipe_id" TEXT,
  "recipe_name" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "inventory_transactions_vendor_id_created_at_idx" ON "inventory_transactions"("vendor_id", "created_at");
CREATE INDEX "inventory_transactions_inventory_item_id_created_at_idx" ON "inventory_transactions"("inventory_item_id", "created_at");
CREATE INDEX "inventory_transactions_source_type_source_id_idx" ON "inventory_transactions"("source_type", "source_id");

CREATE TABLE "waste_events" (
  "id" TEXT NOT NULL,
  "office_id" TEXT NOT NULL,
  "vendor_id" TEXT NOT NULL,
  "inventory_item_id" TEXT NOT NULL,
  "inventory_item_name" TEXT,
  "quantity" DECIMAL(14,3) NOT NULL,
  "unit" TEXT NOT NULL,
  "unit_cost" DECIMAL(14,2) NOT NULL,
  "reason" TEXT NOT NULL,
  "notes" TEXT,
  "before_stock" DECIMAL(14,3) NOT NULL,
  "after_stock" DECIMAL(14,3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "waste_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "waste_events_vendor_id_created_at_idx" ON "waste_events"("vendor_id", "created_at");
CREATE INDEX "waste_events_vendor_id_reason_idx" ON "waste_events"("vendor_id", "reason");

CREATE TABLE "suppliers" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT,
  "office_id" TEXT,
  "vendor_id" TEXT,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "lead_time_days" DECIMAL(8,2),
  "reliability" DECIMAL(5,2),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "suppliers_organization_id_idx" ON "suppliers"("organization_id");
CREATE INDEX "suppliers_office_id_vendor_id_idx" ON "suppliers"("office_id", "vendor_id");

CREATE TABLE "purchase_orders" (
  "id" TEXT NOT NULL,
  "office_id" TEXT NOT NULL,
  "vendor_id" TEXT NOT NULL,
  "supplier_id" TEXT NOT NULL,
  "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'draft',
  "total_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "expected_date" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "purchase_orders_vendor_id_status_idx" ON "purchase_orders"("vendor_id", "status");
CREATE INDEX "purchase_orders_supplier_id_created_at_idx" ON "purchase_orders"("supplier_id", "created_at");

CREATE TABLE "purchase_order_items" (
  "id" TEXT NOT NULL,
  "purchase_order_id" TEXT NOT NULL,
  "inventory_item_id" TEXT NOT NULL,
  "quantity" DECIMAL(14,3) NOT NULL,
  "unit_cost" DECIMAL(14,2) NOT NULL,
  "received_qty" DECIMAL(14,3) NOT NULL DEFAULT 0,
  CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "purchase_order_items_inventory_item_id_idx" ON "purchase_order_items"("inventory_item_id");

CREATE TABLE "demand_observations" (
  "id" TEXT NOT NULL,
  "office_id" TEXT NOT NULL,
  "vendor_id" TEXT NOT NULL,
  "observed_at" TIMESTAMP(3) NOT NULL,
  "item_key" TEXT NOT NULL,
  "quantity" DECIMAL(14,3) NOT NULL,
  "source" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "demand_observations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "demand_observations_vendor_id_item_key_observed_at_idx" ON "demand_observations"("vendor_id", "item_key", "observed_at");
CREATE INDEX "demand_observations_office_id_observed_at_idx" ON "demand_observations"("office_id", "observed_at");

CREATE TABLE "forecast_runs" (
  "id" TEXT NOT NULL,
  "office_id" TEXT NOT NULL,
  "vendor_id" TEXT NOT NULL,
  "model_name" TEXT NOT NULL,
  "model_version" TEXT NOT NULL,
  "horizon" INTEGER NOT NULL,
  "mae" DECIMAL(14,6),
  "rmse" DECIMAL(14,6),
  "mape" DECIMAL(14,6),
  "confidence" DECIMAL(6,5),
  "drift_score" DECIMAL(8,5),
  "status" TEXT NOT NULL,
  "started_at" TIMESTAMP(3) NOT NULL,
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "forecast_runs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "forecast_runs_vendor_id_created_at_idx" ON "forecast_runs"("vendor_id", "created_at");
CREATE INDEX "forecast_runs_model_name_model_version_idx" ON "forecast_runs"("model_name", "model_version");

CREATE TABLE "recommendation_outcomes" (
  "id" TEXT NOT NULL,
  "office_id" TEXT NOT NULL,
  "vendor_id" TEXT NOT NULL,
  "recommendation_type" TEXT NOT NULL,
  "recommendation_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "outcome" TEXT,
  "financial_impact" DECIMAL(14,2),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "recommendation_outcomes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "recommendation_outcomes_vendor_id_created_at_idx" ON "recommendation_outcomes"("vendor_id", "created_at");
CREATE INDEX "recommendation_outcomes_recommendation_type_recommendation_id_idx" ON "recommendation_outcomes"("recommendation_type", "recommendation_id");

CREATE TABLE "analytics_events" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT,
  "office_id" TEXT,
  "vendor_id" TEXT,
  "user_id" TEXT,
  "event_name" TEXT NOT NULL,
  "entity_type" TEXT,
  "entity_id" TEXT,
  "payload" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "analytics_events_organization_id_created_at_idx" ON "analytics_events"("organization_id", "created_at");
CREATE INDEX "analytics_events_vendor_id_event_name_created_at_idx" ON "analytics_events"("vendor_id", "event_name", "created_at");
CREATE INDEX "analytics_events_entity_type_entity_id_idx" ON "analytics_events"("entity_type", "entity_id");

ALTER TABLE "offices" ADD CONSTRAINT "offices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sales" ADD CONSTRAINT "sales_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sales" ADD CONSTRAINT "sales_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sales" ADD CONSTRAINT "sales_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "waste_events" ADD CONSTRAINT "waste_events_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "waste_events" ADD CONSTRAINT "waste_events_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "waste_events" ADD CONSTRAINT "waste_events_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "demand_observations" ADD CONSTRAINT "demand_observations_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "demand_observations" ADD CONSTRAINT "demand_observations_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "forecast_runs" ADD CONSTRAINT "forecast_runs_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "forecast_runs" ADD CONSTRAINT "forecast_runs_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
