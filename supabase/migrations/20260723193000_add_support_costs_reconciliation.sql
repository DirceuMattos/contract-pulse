CREATE TABLE IF NOT EXISTS public.support_milvus_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  milvus_client_name text NOT NULL,
  milvus_client_key text NOT NULL UNIQUE,
  milvus_document text,
  milvus_token text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_milvus_client_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  milvus_client_id uuid NOT NULL REFERENCES public.support_milvus_clients(id) ON DELETE CASCADE,
  hub_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('matched', 'pending', 'ambiguous', 'ignored')),
  match_method text NOT NULL DEFAULT 'auto',
  confidence numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (milvus_client_id)
);

CREATE TABLE IF NOT EXISTS public.support_milvus_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  milvus_client_id uuid REFERENCES public.support_milvus_clients(id) ON DELETE CASCADE,
  milvus_project_name text NOT NULL,
  milvus_project_key text NOT NULL,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (milvus_client_id, milvus_project_key)
);

CREATE TABLE IF NOT EXISTS public.support_milvus_project_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  milvus_project_id uuid NOT NULL REFERENCES public.support_milvus_projects(id) ON DELETE CASCADE,
  hub_contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('matched', 'pending', 'ambiguous', 'ignored')),
  match_method text NOT NULL DEFAULT 'auto',
  confidence numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (milvus_project_id)
);

CREATE TABLE IF NOT EXISTS public.support_cost_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date_from date NOT NULL,
  date_to date NOT NULL,
  requested_client_name text,
  requested_client_names text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'error')),
  records_detected integer NOT NULL DEFAULT 0,
  tickets_stored integer NOT NULL DEFAULT 0,
  inconsistency_count integer NOT NULL DEFAULT 0,
  diagnostics jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.support_cost_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_run_id uuid REFERENCES public.support_cost_sync_runs(id) ON DELETE SET NULL,
  milvus_ticket_code text NOT NULL,
  milvus_ticket_id text,
  milvus_client_id uuid REFERENCES public.support_milvus_clients(id) ON DELETE SET NULL,
  milvus_project_id uuid REFERENCES public.support_milvus_projects(id) ON DELETE SET NULL,
  hub_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  hub_contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  project_name text NOT NULL,
  analyst_name text NOT NULL,
  ticket_date date,
  hours numeric NOT NULL DEFAULT 0,
  subject text,
  status text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (milvus_ticket_code)
);

CREATE TABLE IF NOT EXISTS public.support_cost_inconsistencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_run_id uuid REFERENCES public.support_cost_sync_runs(id) ON DELETE CASCADE,
  reason_code text NOT NULL,
  reason_detail text NOT NULL DEFAULT '',
  milvus_client_id uuid REFERENCES public.support_milvus_clients(id) ON DELETE SET NULL,
  milvus_project_id uuid REFERENCES public.support_milvus_projects(id) ON DELETE SET NULL,
  milvus_ticket_code text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_milvus_clients_name ON public.support_milvus_clients (milvus_client_name);
CREATE INDEX IF NOT EXISTS idx_support_milvus_client_mappings_hub ON public.support_milvus_client_mappings (hub_client_id);
CREATE INDEX IF NOT EXISTS idx_support_milvus_project_mappings_contract ON public.support_milvus_project_mappings (hub_contract_id);
CREATE INDEX IF NOT EXISTS idx_support_cost_tickets_period ON public.support_cost_tickets (ticket_date);
CREATE INDEX IF NOT EXISTS idx_support_cost_tickets_client ON public.support_cost_tickets (hub_client_id, client_name);
CREATE INDEX IF NOT EXISTS idx_support_cost_tickets_project ON public.support_cost_tickets (hub_contract_id, project_name);
CREATE INDEX IF NOT EXISTS idx_support_cost_inconsistencies_open ON public.support_cost_inconsistencies (resolved_at, reason_code);

ALTER TABLE public.support_milvus_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_milvus_client_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_milvus_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_milvus_project_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_cost_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_cost_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_cost_inconsistencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY support_milvus_clients_select ON public.support_milvus_clients
FOR SELECT TO authenticated USING (true);

CREATE POLICY support_milvus_client_mappings_select ON public.support_milvus_client_mappings
FOR SELECT TO authenticated USING (true);

CREATE POLICY support_milvus_projects_select ON public.support_milvus_projects
FOR SELECT TO authenticated USING (true);

CREATE POLICY support_milvus_project_mappings_select ON public.support_milvus_project_mappings
FOR SELECT TO authenticated USING (true);

CREATE POLICY support_cost_sync_runs_select ON public.support_cost_sync_runs
FOR SELECT TO authenticated USING (true);

CREATE POLICY support_cost_tickets_select ON public.support_cost_tickets
FOR SELECT TO authenticated USING (true);

CREATE POLICY support_cost_inconsistencies_select ON public.support_cost_inconsistencies
FOR SELECT TO authenticated USING (true);

CREATE POLICY support_milvus_client_mappings_modify ON public.support_milvus_client_mappings
FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['superadmin'::public.app_role, 'c-level'::public.app_role, 'administrativo'::public.app_role, 'rh'::public.app_role]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['superadmin'::public.app_role, 'c-level'::public.app_role, 'administrativo'::public.app_role, 'rh'::public.app_role]));

CREATE POLICY support_milvus_project_mappings_modify ON public.support_milvus_project_mappings
FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['superadmin'::public.app_role, 'c-level'::public.app_role, 'administrativo'::public.app_role, 'rh'::public.app_role]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['superadmin'::public.app_role, 'c-level'::public.app_role, 'administrativo'::public.app_role, 'rh'::public.app_role]));
