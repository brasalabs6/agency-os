CREATE INDEX IF NOT EXISTS "leads_owner_id_idx" ON "leads"("owner_id");
CREATE INDEX IF NOT EXISTS "leads_next_action_owner_id_idx" ON "leads"("next_action_owner_id");
