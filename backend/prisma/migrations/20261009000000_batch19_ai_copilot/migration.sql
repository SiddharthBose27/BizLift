CREATE TABLE "ai_copilot_runs" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT,
  "office_id" TEXT NOT NULL,
  "vendor_id" TEXT NOT NULL,
  "user_id" TEXT,
  "intent" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "context" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_copilot_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_copilot_actions" (
  "id" TEXT NOT NULL,
  "run_id" TEXT NOT NULL,
  "office_id" TEXT NOT NULL,
  "vendor_id" TEXT NOT NULL,
  "action_type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "rationale" TEXT NOT NULL,
  "priority" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'proposed',
  "expected_impact" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "payload" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acted_at" TIMESTAMP(3),
  CONSTRAINT "ai_copilot_actions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_copilot_runs_vendor_id_created_at_idx" ON "ai_copilot_runs"("vendor_id", "created_at");
CREATE INDEX "ai_copilot_runs_office_id_created_at_idx" ON "ai_copilot_runs"("office_id", "created_at");
CREATE INDEX "ai_copilot_actions_vendor_id_status_created_at_idx" ON "ai_copilot_actions"("vendor_id", "status", "created_at");
CREATE INDEX "ai_copilot_actions_run_id_idx" ON "ai_copilot_actions"("run_id");

ALTER TABLE "ai_copilot_runs" ADD CONSTRAINT "ai_copilot_runs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_copilot_runs" ADD CONSTRAINT "ai_copilot_runs_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_copilot_runs" ADD CONSTRAINT "ai_copilot_runs_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_copilot_actions" ADD CONSTRAINT "ai_copilot_actions_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "ai_copilot_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_copilot_actions" ADD CONSTRAINT "ai_copilot_actions_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_copilot_actions" ADD CONSTRAINT "ai_copilot_actions_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
