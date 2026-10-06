ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "active" boolean NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login_at" timestamptz;

UPDATE "users" SET "email" = lower(trim("email"));
UPDATE "users" SET "active" = false WHERE "email" = 'agent@agency.local';

CREATE TABLE IF NOT EXISTS "user_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL UNIQUE,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "last_seen_at" timestamptz NOT NULL DEFAULT now(),
  "revoked_at" timestamptz
);
CREATE INDEX IF NOT EXISTS "user_sessions_user_idx" ON "user_sessions"("user_id");
CREATE INDEX IF NOT EXISTS "user_sessions_expires_idx" ON "user_sessions"("expires_at");
CREATE INDEX IF NOT EXISTS "user_sessions_revoked_idx" ON "user_sessions"("revoked_at");
