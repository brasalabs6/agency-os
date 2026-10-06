-- Defense in depth: AgencyOS does not use Supabase Data API roles.
REVOKE USAGE ON SCHEMA public FROM anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
