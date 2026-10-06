-- Per-user MCP credentials for ChatGPT connections.
-- AgencyOS validates opaque query credentials server-side; raw tokens are never stored.

CREATE TABLE IF NOT EXISTS public.mcp_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  token_prefix text NOT NULL,
  scopes jsonb NOT NULL DEFAULT '["leads.read","leads.write"]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz
);

CREATE INDEX IF NOT EXISTS mcp_credentials_user_idx ON public.mcp_credentials(user_id);
CREATE INDEX IF NOT EXISTS mcp_credentials_active_idx ON public.mcp_credentials(active);
CREATE INDEX IF NOT EXISTS mcp_credentials_revoked_idx ON public.mcp_credentials(revoked_at);
CREATE INDEX IF NOT EXISTS mcp_credentials_expires_idx ON public.mcp_credentials(expires_at);

ALTER TABLE public.mcp_credentials ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.mcp_credentials FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL PRIVILEGES ON TABLE public.mcp_credentials FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL PRIVILEGES ON TABLE public.mcp_credentials FROM authenticated;
  END IF;
END
$$;
