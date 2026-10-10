CREATE TABLE "ml_models" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT,
  "office_id" TEXT NOT NULL,
  "vendor_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "task" TEXT NOT NULL,
  "algorithm" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT false,
  "feature_set" JSONB,
  "hyperparameters" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ml_models_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ml_models_vendor_id_name_version_key" ON "ml_models"("vendor_id", "name", "version");
CREATE INDEX "ml_models_vendor_id_name_is_active_idx" ON "ml_models"("vendor_id", "name", "is_active");
CREATE INDEX "ml_models_office_id_task_idx" ON "ml_models"("office_id", "task");
ALTER TABLE "ml_models" ADD CONSTRAINT "ml_models_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ml_models" ADD CONSTRAINT "ml_models_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ml_models" ADD CONSTRAINT "ml_models_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ml_training_runs" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT,
  "office_id" TEXT NOT NULL,
  "vendor_id" TEXT NOT NULL,
  "model_id" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "dataset_rows" INTEGER NOT NULL,
  "train_rows" INTEGER NOT NULL,
  "validation_rows" INTEGER NOT NULL,
  "mae" DECIMAL(14,6),
  "rmse" DECIMAL(14,6),
  "mape" DECIMAL(14,6),
  "started_at" TIMESTAMP(3) NOT NULL,
  "completed_at" TIMESTAMP(3),
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ml_training_runs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ml_training_runs_vendor_id_created_at_idx" ON "ml_training_runs"("vendor_id", "created_at");
CREATE INDEX "ml_training_runs_model_id_created_at_idx" ON "ml_training_runs"("model_id", "created_at");
ALTER TABLE "ml_training_runs" ADD CONSTRAINT "ml_training_runs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ml_training_runs" ADD CONSTRAINT "ml_training_runs_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ml_training_runs" ADD CONSTRAINT "ml_training_runs_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ml_training_runs" ADD CONSTRAINT "ml_training_runs_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ml_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ml_predictions" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT,
  "office_id" TEXT NOT NULL,
  "vendor_id" TEXT NOT NULL,
  "model_id" TEXT NOT NULL,
  "item_key" TEXT NOT NULL,
  "predicted_at" TIMESTAMP(3) NOT NULL,
  "horizon_step" INTEGER NOT NULL,
  "predicted_value" DECIMAL(14,4) NOT NULL,
  "lower_bound" DECIMAL(14,4),
  "upper_bound" DECIMAL(14,4),
  "confidence" DECIMAL(6,5),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ml_predictions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ml_predictions_vendor_id_item_key_predicted_at_idx" ON "ml_predictions"("vendor_id", "item_key", "predicted_at");
CREATE INDEX "ml_predictions_model_id_predicted_at_idx" ON "ml_predictions"("model_id", "predicted_at");
ALTER TABLE "ml_predictions" ADD CONSTRAINT "ml_predictions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ml_predictions" ADD CONSTRAINT "ml_predictions_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ml_predictions" ADD CONSTRAINT "ml_predictions_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ml_predictions" ADD CONSTRAINT "ml_predictions_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ml_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ml_drift_checks" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT,
  "office_id" TEXT NOT NULL,
  "vendor_id" TEXT NOT NULL,
  "model_id" TEXT NOT NULL,
  "feature" TEXT NOT NULL,
  "baseline_mean" DECIMAL(14,6),
  "recent_mean" DECIMAL(14,6),
  "drift_score" DECIMAL(10,6) NOT NULL,
  "status" TEXT NOT NULL,
  "checked_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ml_drift_checks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ml_drift_checks_vendor_id_checked_at_idx" ON "ml_drift_checks"("vendor_id", "checked_at");
CREATE INDEX "ml_drift_checks_model_id_checked_at_idx" ON "ml_drift_checks"("model_id", "checked_at");
ALTER TABLE "ml_drift_checks" ADD CONSTRAINT "ml_drift_checks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ml_drift_checks" ADD CONSTRAINT "ml_drift_checks_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ml_drift_checks" ADD CONSTRAINT "ml_drift_checks_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ml_drift_checks" ADD CONSTRAINT "ml_drift_checks_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ml_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;
