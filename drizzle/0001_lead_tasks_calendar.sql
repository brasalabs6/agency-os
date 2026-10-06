CREATE TABLE IF NOT EXISTS "lead_tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "lead_id" uuid NOT NULL REFERENCES "leads"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "description" text,
  "type" text NOT NULL DEFAULT 'TASK',
  "status" text NOT NULL DEFAULT 'TODO',
  "priority" text NOT NULL DEFAULT 'MEDIUM',
  "due_at" timestamptz,
  "start_at" timestamptz,
  "end_at" timestamptz,
  "all_day" boolean NOT NULL DEFAULT false,
  "owner_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_by_type" text NOT NULL,
  "created_by_id" text,
  "completed_at" timestamptz,
  "canceled_at" timestamptz,
  "version" integer NOT NULL DEFAULT 1,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "lead_tasks_event_pair" CHECK (("start_at" IS NULL) = ("end_at" IS NULL)),
  CONSTRAINT "lead_tasks_event_order" CHECK ("end_at" IS NULL OR "end_at" >= "start_at"),
  CONSTRAINT "lead_tasks_done_completed" CHECK ("status" <> 'DONE' OR "completed_at" IS NOT NULL),
  CONSTRAINT "lead_tasks_canceled_at" CHECK ("status" <> 'CANCELED' OR "canceled_at" IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS "lead_tasks_lead_idx" ON "lead_tasks"("lead_id");
CREATE INDEX IF NOT EXISTS "lead_tasks_status_idx" ON "lead_tasks"("status");
CREATE INDEX IF NOT EXISTS "lead_tasks_owner_idx" ON "lead_tasks"("owner_id");
CREATE INDEX IF NOT EXISTS "lead_tasks_due_idx" ON "lead_tasks"("due_at");
CREATE INDEX IF NOT EXISTS "lead_tasks_start_idx" ON "lead_tasks"("start_at");
CREATE INDEX IF NOT EXISTS "lead_tasks_end_idx" ON "lead_tasks"("end_at");
CREATE INDEX IF NOT EXISTS "lead_tasks_owner_status_due_idx" ON "lead_tasks"("owner_id", "status", "due_at");
CREATE INDEX IF NOT EXISTS "lead_tasks_lead_status_idx" ON "lead_tasks"("lead_id", "status");

-- Idempotent compatibility migration: existing next_action values become the first task.
INSERT INTO "lead_tasks" (
  "lead_id", "title", "type", "status", "priority", "due_at", "all_day",
  "owner_id", "sort_order", "created_by_type", "created_by_id"
)
SELECT
  l."id", l."next_action", 'TASK', 'TODO', 'MEDIUM', l."next_action_at", false,
  COALESCE(l."next_action_owner_id", l."owner_id"), 100, 'SYSTEM', 'migration:0001'
FROM "leads" l
WHERE l."next_action" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "lead_tasks" t
    WHERE t."lead_id" = l."id" AND t."title" = l."next_action" AND t."status" IN ('TODO', 'DOING')
  );
