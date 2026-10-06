CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "role" text NOT NULL DEFAULT 'MEMBER',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "leads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "legal_name" text,
  "segment" text,
  "city" text,
  "state" text,
  "website" text,
  "google_maps_url" text,
  "instagram_url" text,
  "phone" text,
  "whatsapp" text,
  "email" text,
  "contact_name" text,
  "contact_role" text,
  "status" text NOT NULL DEFAULT 'DISCOVERED',
  "score" integer,
  "score_reasons" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "primary_opportunity" text,
  "opportunity_notes" text,
  "owner_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "tags" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "source_type" text,
  "source_url" text,
  "next_action" text,
  "next_action_at" timestamptz,
  "next_action_owner_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "do_not_contact" boolean NOT NULL DEFAULT false,
  "version" integer NOT NULL DEFAULT 1,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "leads_score_range" CHECK ("score" IS NULL OR ("score" >= 0 AND "score" <= 100))
);
CREATE INDEX IF NOT EXISTS "leads_status_idx" ON "leads"("status");
CREATE INDEX IF NOT EXISTS "leads_score_idx" ON "leads"("score");
CREATE INDEX IF NOT EXISTS "leads_city_idx" ON "leads"("city");
CREATE INDEX IF NOT EXISTS "leads_next_action_at_idx" ON "leads"("next_action_at");
CREATE INDEX IF NOT EXISTS "leads_updated_at_idx" ON "leads"("updated_at");

CREATE TABLE IF NOT EXISTS "lead_activities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "lead_id" uuid NOT NULL REFERENCES "leads"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "actor_type" text NOT NULL,
  "actor_id" text NOT NULL,
  "actor_name" text NOT NULL,
  "summary" text NOT NULL,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "lead_activities_lead_idx" ON "lead_activities"("lead_id");
CREATE INDEX IF NOT EXISTS "lead_activities_created_idx" ON "lead_activities"("created_at");

CREATE TABLE IF NOT EXISTS "lead_evidence" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "lead_id" uuid NOT NULL REFERENCES "leads"("id") ON DELETE CASCADE,
  "source_url" text NOT NULL,
  "source_type" text,
  "observed_at" timestamptz,
  "claim" text NOT NULL,
  "value" text NOT NULL,
  "confidence" integer,
  "created_by" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "evidence_confidence_range" CHECK ("confidence" IS NULL OR ("confidence" >= 0 AND "confidence" <= 100))
);
CREATE INDEX IF NOT EXISTS "lead_evidence_lead_idx" ON "lead_evidence"("lead_id");

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "actor_type" text NOT NULL,
  "actor_id" text NOT NULL,
  "tool" text,
  "action" text NOT NULL,
  "lead_id" uuid REFERENCES "leads"("id") ON DELETE SET NULL,
  "input" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "result" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "audit_logs_lead_idx" ON "audit_logs"("lead_id");
CREATE INDEX IF NOT EXISTS "audit_logs_created_idx" ON "audit_logs"("created_at");
