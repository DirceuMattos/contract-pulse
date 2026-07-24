CREATE TABLE IF NOT EXISTS public.support_cost_monthly_loads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_key text NOT NULL UNIQUE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'syncing', 'imported', 'error')),
  sync_run_id uuid REFERENCES public.support_cost_sync_runs(id) ON DELETE SET NULL,
  tickets_count integer NOT NULL DEFAULT 0,
  total_hours numeric NOT NULL DEFAULT 0,
  inconsistency_count integer NOT NULL DEFAULT 0,
  last_synced_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_cost_monthly_loads_period
ON public.support_cost_monthly_loads (period_start, period_end);

ALTER TABLE public.support_cost_monthly_loads ENABLE ROW LEVEL SECURITY;

CREATE POLICY support_cost_monthly_loads_select ON public.support_cost_monthly_loads
FOR SELECT TO authenticated USING (true);
