
-- 1) Add receivables columns to contracts
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS superlogica_subscription_id text,
  ADD COLUMN IF NOT EXISTS superlogica_subscription_label text,
  ADD COLUMN IF NOT EXISTS superlogica_match_hint text,
  ADD COLUMN IF NOT EXISTS superlogica_customer_cnpj text,
  ADD COLUMN IF NOT EXISTS receivables_status text,
  ADD COLUMN IF NOT EXISTS receivables_open_amount numeric,
  ADD COLUMN IF NOT EXISTS receivables_overdue_amount numeric,
  ADD COLUMN IF NOT EXISTS receivables_last_payment_at timestamptz,
  ADD COLUMN IF NOT EXISTS receivables_last_sync_at timestamptz;

CREATE INDEX IF NOT EXISTS ix_contracts_superlogica_subscription
  ON public.contracts(superlogica_subscription_id);

-- 2) Sync runs table
CREATE TABLE IF NOT EXISTS public.superlogica_sync_run (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  fetched_subscriptions int NOT NULL DEFAULT 0,
  updated_contracts int NOT NULL DEFAULT 0,
  invoices_upserted int NOT NULL DEFAULT 0,
  errors_count int NOT NULL DEFAULT 0,
  error_summary text
);

CREATE INDEX IF NOT EXISTS ix_superlogica_sync_run_started
  ON public.superlogica_sync_run(started_at DESC);

ALTER TABLE public.superlogica_sync_run ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ssr_select" ON public.superlogica_sync_run
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "ssr_insert" ON public.superlogica_sync_run
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'c-level'::app_role));

CREATE POLICY "ssr_update" ON public.superlogica_sync_run
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'c-level'::app_role));

CREATE POLICY "ssr_delete" ON public.superlogica_sync_run
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'c-level'::app_role));

-- 3) Subscriptions snapshot table
CREATE TABLE IF NOT EXISTS public.receivables_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  superlogica_subscription_id text NOT NULL,
  customer_cnpj text,
  customer_name text,
  label text,
  status text,
  amount numeric,
  periodicity text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(superlogica_subscription_id)
);

ALTER TABLE public.receivables_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rs_select" ON public.receivables_subscriptions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "rs_insert" ON public.receivables_subscriptions
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'c-level'::app_role));

CREATE POLICY "rs_update" ON public.receivables_subscriptions
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'c-level'::app_role));

CREATE POLICY "rs_delete" ON public.receivables_subscriptions
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'c-level'::app_role));

-- 4) Invoices table
CREATE TABLE IF NOT EXISTS public.receivables_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  superlogica_subscription_id text NOT NULL,
  external_invoice_id text,
  competence text,
  due_date date,
  status text NOT NULL DEFAULT 'open',
  amount numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  paid_at timestamptz,
  days_overdue int NOT NULL DEFAULT 0,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_receivables_inv_external
  ON public.receivables_invoices(superlogica_subscription_id, external_invoice_id)
  WHERE external_invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_receivables_invoices_contract
  ON public.receivables_invoices(contract_id, due_date DESC);

CREATE INDEX IF NOT EXISTS ix_receivables_invoices_sub
  ON public.receivables_invoices(superlogica_subscription_id, due_date DESC);

CREATE INDEX IF NOT EXISTS ix_receivables_invoices_status
  ON public.receivables_invoices(status);

ALTER TABLE public.receivables_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ri_select" ON public.receivables_invoices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "ri_insert" ON public.receivables_invoices
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'c-level'::app_role));

CREATE POLICY "ri_update" ON public.receivables_invoices
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'c-level'::app_role));

CREATE POLICY "ri_delete" ON public.receivables_invoices
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'c-level'::app_role));
