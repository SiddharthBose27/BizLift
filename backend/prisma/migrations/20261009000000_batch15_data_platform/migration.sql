-- Batch 15 — Data Platform metric snapshots
CREATE TABLE "data_metric_snapshots" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT,
  "office_id" TEXT,
  "vendor_id" TEXT,
  "metric_key" TEXT NOT NULL,
  "metric_value" DECIMAL(18,4) NOT NULL,
  "dimension" JSONB,
  "captured_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "data_metric_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "data_metric_snapshots_vendor_id_metric_key_captured_at_idx" ON "data_metric_snapshots"("vendor_id", "metric_key", "captured_at");
CREATE INDEX "data_metric_snapshots_office_id_metric_key_captured_at_idx" ON "data_metric_snapshots"("office_id", "metric_key", "captured_at");
CREATE INDEX "data_metric_snapshots_organization_id_metric_key_captured_at_idx" ON "data_metric_snapshots"("organization_id", "metric_key", "captured_at");

ALTER TABLE "data_metric_snapshots" ADD CONSTRAINT "data_metric_snapshots_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "data_metric_snapshots" ADD CONSTRAINT "data_metric_snapshots_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "data_metric_snapshots" ADD CONSTRAINT "data_metric_snapshots_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
