-- AI commercial intelligence, communication approvals, proposals/contracts and client obligations.
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity_type text;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity_id text;
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON public.audit_logs(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS public.business_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  identity jsonb NOT NULL DEFAULT '{}'::jsonb,
  contacts jsonb NOT NULL DEFAULT '{}'::jsonb,
  business_signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  competition jsonb NOT NULL DEFAULT '[]'::jsonb,
  facts jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by_type text NOT NULL,
  created_by_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS business_profiles_lead_idx ON public.business_profiles(lead_id);
CREATE INDEX IF NOT EXISTS business_profiles_lead_version_idx ON public.business_profiles(lead_id, version);

CREATE TABLE IF NOT EXISTS public.diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  business_profile_id uuid REFERENCES public.business_profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'DRAFT',
  version integer NOT NULL DEFAULT 1,
  executive_summary text NOT NULL DEFAULT '',
  strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  gaps jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  recommended_services jsonb NOT NULL DEFAULT '[]'::jsonb,
  internal_notes text,
  public_summary text,
  artifact_ref text,
  rendered_content text,
  generated_by_type text NOT NULL,
  generated_by_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS diagnostics_lead_idx ON public.diagnostics(lead_id);
CREATE INDEX IF NOT EXISTS diagnostics_status_idx ON public.diagnostics(status);
CREATE INDEX IF NOT EXISTS diagnostics_updated_idx ON public.diagnostics(updated_at);

CREATE TABLE IF NOT EXISTS public.score_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  diagnostic_id uuid REFERENCES public.diagnostics(id) ON DELETE SET NULL,
  digital_gap integer NOT NULL CHECK (digital_gap BETWEEN 0 AND 25),
  economic_potential integer NOT NULL CHECK (economic_potential BETWEEN 0 AND 20),
  contactability integer NOT NULL CHECK (contactability BETWEEN 0 AND 15),
  urgency integer NOT NULL CHECK (urgency BETWEEN 0 AND 15),
  service_fit integer NOT NULL CHECK (service_fit BETWEEN 0 AND 15),
  proof_potential integer NOT NULL CHECK (proof_potential BETWEEN 0 AND 10),
  total integer NOT NULL CHECK (total BETWEEN 0 AND 100),
  confidence integer NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_service text,
  created_by_type text NOT NULL,
  created_by_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS score_assessments_lead_idx ON public.score_assessments(lead_id);
CREATE INDEX IF NOT EXISTS score_assessments_created_idx ON public.score_assessments(created_at);

CREATE TABLE IF NOT EXISTS public.ai_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill text NOT NULL,
  skill_version text NOT NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'QUEUED',
  actor_type text NOT NULL,
  actor_id text NOT NULL,
  idempotency_key text,
  input_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_code text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ai_runs_idempotency_idx ON public.ai_runs(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS ai_runs_skill_idx ON public.ai_runs(skill);
CREATE INDEX IF NOT EXISTS ai_runs_lead_idx ON public.ai_runs(lead_id);
CREATE INDEX IF NOT EXISTS ai_runs_status_idx ON public.ai_runs(status);

CREATE TABLE IF NOT EXISTS public.prospecting_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objective text NOT NULL,
  icp jsonb NOT NULL DEFAULT '{}'::jsonb,
  region text,
  segments jsonb NOT NULL DEFAULT '[]'::jsonb,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  max_candidates integer NOT NULL DEFAULT 50 CHECK (max_candidates BETWEEN 1 AND 500),
  status text NOT NULL DEFAULT 'DRAFT',
  ai_run_id uuid REFERENCES public.ai_runs(id) ON DELETE SET NULL,
  counters jsonb NOT NULL DEFAULT '{"found":0,"imported":0,"duplicates":0,"rejected":0}'::jsonb,
  created_by_type text NOT NULL,
  created_by_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS prospecting_runs_status_idx ON public.prospecting_runs(status);
CREATE INDEX IF NOT EXISTS prospecting_runs_created_idx ON public.prospecting_runs(created_at);

CREATE TABLE IF NOT EXISTS public.channel_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'WHATSAPP',
  account_label text NOT NULL,
  status text NOT NULL DEFAULT 'DISCONNECTED',
  capabilities jsonb NOT NULL DEFAULT '["READ"]'::jsonb,
  owner_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  external_account_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS channel_connections_provider_idx ON public.channel_connections(provider);
CREATE INDEX IF NOT EXISTS channel_connections_owner_idx ON public.channel_connections(owner_user_id);

CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.channel_connections(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  contact_address text NOT NULL,
  contact_display_name text,
  last_message_at timestamptz,
  opt_out_detected boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(connection_id, external_id)
);
CREATE INDEX IF NOT EXISTS conversations_lead_idx ON public.conversations(lead_id);
CREATE INDEX IF NOT EXISTS conversations_connection_idx ON public.conversations(connection_id);
CREATE INDEX IF NOT EXISTS conversations_last_message_idx ON public.conversations(last_message_at);

CREATE TABLE IF NOT EXISTS public.channel_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  direction text NOT NULL,
  sent_at timestamptz NOT NULL,
  sender text NOT NULL,
  text text,
  media_type text,
  delivery_status text,
  raw_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, external_id)
);
CREATE INDEX IF NOT EXISTS channel_messages_conversation_idx ON public.channel_messages(conversation_id);
CREATE INDEX IF NOT EXISTS channel_messages_sent_idx ON public.channel_messages(sent_at);

CREATE TABLE IF NOT EXISTS public.approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload_hash text NOT NULL,
  preview text NOT NULL,
  rationale text,
  policy_checks jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'PENDING',
  created_by_type text NOT NULL,
  created_by_id text NOT NULL,
  approved_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejected_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  rejected_at timestamptz,
  executed_at timestamptz,
  execution_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS approval_requests_status_idx ON public.approval_requests(status);
CREATE INDEX IF NOT EXISTS approval_requests_lead_idx ON public.approval_requests(lead_id);
CREATE INDEX IF NOT EXISTS approval_requests_created_idx ON public.approval_requests(created_at);

CREATE TABLE IF NOT EXISTS public.qualifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  decision_makers jsonb NOT NULL DEFAULT '[]'::jsonb,
  problem_statements jsonb NOT NULL DEFAULT '[]'::jsonb,
  desired_outcome text,
  current_process text,
  urgency text,
  explicit_budget_statement text,
  timeline text,
  constraints jsonb NOT NULL DEFAULT '[]'::jsonb,
  technical_dependencies jsonb NOT NULL DEFAULT '[]'::jsonb,
  unanswered_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  service_fit jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by_type text NOT NULL,
  created_by_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS qualifications_lead_idx ON public.qualifications(lead_id);

CREATE TABLE IF NOT EXISTS public.proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  diagnostic_id uuid REFERENCES public.diagnostics(id) ON DELETE SET NULL,
  qualification_id uuid REFERENCES public.qualifications(id) ON DELETE SET NULL,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'DRAFT',
  services jsonb NOT NULL DEFAULT '[]'::jsonb,
  scope jsonb NOT NULL DEFAULT '[]'::jsonb,
  exclusions jsonb NOT NULL DEFAULT '[]'::jsonb,
  assumptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  client_dependencies jsonb NOT NULL DEFAULT '[]'::jsonb,
  milestones jsonb NOT NULL DEFAULT '[]'::jsonb,
  agency_fee_cents integer,
  currency text NOT NULL DEFAULT 'BRL',
  external_costs jsonb NOT NULL DEFAULT '[]'::jsonb,
  payment_terms text,
  validity_until timestamptz,
  rendered_content text,
  artifact_ref text,
  approval_id uuid REFERENCES public.approval_requests(id) ON DELETE SET NULL,
  sent_at timestamptz,
  response_notes text,
  created_by_type text NOT NULL,
  created_by_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS proposals_lead_idx ON public.proposals(lead_id);
CREATE INDEX IF NOT EXISTS proposals_status_idx ON public.proposals(status);

CREATE TABLE IF NOT EXISTS public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE RESTRICT,
  proposal_version integer NOT NULL,
  proposal_snapshot_hash text NOT NULL,
  proposal_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  template_id text NOT NULL,
  template_version text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'DRAFT',
  parties jsonb NOT NULL DEFAULT '{}'::jsonb,
  terms jsonb NOT NULL DEFAULT '{}'::jsonb,
  responsibilities_agency jsonb NOT NULL DEFAULT '[]'::jsonb,
  responsibilities_client jsonb NOT NULL DEFAULT '[]'::jsonb,
  payment_obligations jsonb NOT NULL DEFAULT '[]'::jsonb,
  deliverables jsonb NOT NULL DEFAULT '[]'::jsonb,
  support_obligations jsonb NOT NULL DEFAULT '[]'::jsonb,
  rendered_content text,
  artifact_ref text,
  approval_id uuid REFERENCES public.approval_requests(id) ON DELETE SET NULL,
  signature_provider text,
  external_signature_id text,
  signed_artifact_ref text,
  signed_at timestamptz,
  created_by_type text NOT NULL,
  created_by_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contracts_lead_idx ON public.contracts(lead_id);
CREATE INDEX IF NOT EXISTS contracts_status_idx ON public.contracts(status);
CREATE INDEX IF NOT EXISTS contracts_proposal_idx ON public.contracts(proposal_id);

CREATE TABLE IF NOT EXISTS public.client_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE RESTRICT,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE RESTRICT,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'PLANNED',
  owner_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  started_at timestamptz,
  target_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contract_id)
);
CREATE INDEX IF NOT EXISTS client_projects_lead_idx ON public.client_projects(lead_id);
CREATE INDEX IF NOT EXISTS client_projects_status_idx ON public.client_projects(status);

CREATE TABLE IF NOT EXISTS public.project_obligations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.client_projects(id) ON DELETE CASCADE,
  source_contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE RESTRICT,
  source_key text NOT NULL,
  party text NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'TODO',
  due_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_obligations_project_idx ON public.project_obligations(project_id);
CREATE UNIQUE INDEX IF NOT EXISTS project_obligations_project_source_uidx ON public.project_obligations(project_id, source_key);
CREATE INDEX IF NOT EXISTS project_obligations_status_idx ON public.project_obligations(status);
CREATE INDEX IF NOT EXISTS project_obligations_due_idx ON public.project_obligations(due_at);

-- Internal server-side tables remain inaccessible through Supabase Data API roles.
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospecting_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_obligations ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'business_profiles','diagnostics','score_assessments','ai_runs','prospecting_runs',
    'channel_connections','conversations','channel_messages','approval_requests','qualifications',
    'proposals','contracts','client_projects','project_obligations'
  ] LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC', tbl);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon', tbl);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM authenticated', tbl);
    END IF;
  END LOOP;
END
$$;


-- Existing per-user MCP credentials receive the new agent-safe scopes.
-- There is intentionally no approvals.approve scope for agents.
UPDATE public.mcp_credentials
SET scopes = scopes || '[
  "diagnostics.read","diagnostics.write",
  "prospecting.read","prospecting.write",
  "conversations.read","conversations.write",
  "messages.send.approved",
  "approvals.read","approvals.request",
  "proposals.read","proposals.write","proposals.send.approved",
  "contracts.read","contracts.draft","contracts.send.approved",
  "projects.read","projects.write",
  "ai_runs.read","ai_runs.write"
]'::jsonb
WHERE active = true;
