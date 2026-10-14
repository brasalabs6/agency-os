-- Conversation Script Graphs: isolated from existing lead/conversation/qualification domains.
-- Run explicitly in production BEFORE enabling CONVERSATION_SCRIPTS_ENABLED.
CREATE TABLE IF NOT EXISTS public.lead_conversation_scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  title text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('WHATSAPP','PHONE','EMAIL','GENERAL')),
  purpose text NOT NULL CHECK (purpose IN ('FIRST_CONTACT','QUALIFICATION','FOLLOW_UP','NEGOTIATION','OTHER')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  draft_revision_id uuid,
  published_revision_id uuid,
  creation_key text NOT NULL,
  creation_actor_id text NOT NULL,
  creation_payload_hash text NOT NULL,
  created_by_type text NOT NULL,
  created_by_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lead_scripts_creation_key_uidx UNIQUE (lead_id, creation_actor_id, creation_key),
  CONSTRAINT lead_scripts_lead_id_uidx UNIQUE (lead_id, id)
);
CREATE INDEX IF NOT EXISTS lead_scripts_lead_idx ON public.lead_conversation_scripts(lead_id);
CREATE INDEX IF NOT EXISTS lead_scripts_lead_updated_idx ON public.lead_conversation_scripts(lead_id,updated_at DESC);

CREATE TABLE IF NOT EXISTS public.lead_conversation_script_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id uuid NOT NULL REFERENCES public.lead_conversation_scripts(id) ON DELETE CASCADE,
  revision_number integer NOT NULL CHECK (revision_number > 0),
  base_revision_id uuid,
  graph jsonb NOT NULL,
  change_summary text,
  created_by_type text NOT NULL,
  created_by_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT script_revisions_number_uidx UNIQUE(script_id,revision_number),
  CONSTRAINT script_revisions_scope_uidx UNIQUE(script_id,id)
);
CREATE INDEX IF NOT EXISTS script_revisions_script_idx ON public.lead_conversation_script_revisions(script_id,revision_number DESC);

-- Enforce same-script pointers with deferrable composite FK because create is circular.
ALTER TABLE public.lead_conversation_scripts
  ADD CONSTRAINT lead_scripts_draft_revision_fk
  FOREIGN KEY (id,draft_revision_id)
  REFERENCES public.lead_conversation_script_revisions(script_id,id)
  DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE public.lead_conversation_scripts
  ADD CONSTRAINT lead_scripts_published_revision_fk
  FOREIGN KEY (id,published_revision_id)
  REFERENCES public.lead_conversation_script_revisions(script_id,id)
  DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE public.lead_conversation_script_revisions
  ADD CONSTRAINT script_revisions_base_fk
  FOREIGN KEY (script_id,base_revision_id)
  REFERENCES public.lead_conversation_script_revisions(script_id,id)
  DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE public.lead_conversation_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_conversation_script_revisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.lead_conversation_scripts, public.lead_conversation_script_revisions FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    REVOKE ALL PRIVILEGES ON TABLE public.lead_conversation_scripts, public.lead_conversation_script_revisions FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    REVOKE ALL PRIVILEGES ON TABLE public.lead_conversation_scripts, public.lead_conversation_script_revisions FROM authenticated;
  END IF;
END $$;

-- SECURITY: Existing MCP credentials retain their original granted scopes.
-- A user must explicitly issue a new credential to opt into scripts.read/scripts.write.
-- Never widen authorization as a side effect of schema migration (AGENTS.md).
