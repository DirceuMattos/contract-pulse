ALTER TABLE public.support_cost_monthly_loads
  ADD COLUMN IF NOT EXISTS load_scope text NOT NULL DEFAULT 'full',
  ADD COLUMN IF NOT EXISTS requested_client_names text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.support_cost_monthly_loads
  DROP CONSTRAINT IF EXISTS support_cost_monthly_loads_month_key_key;

CREATE UNIQUE INDEX IF NOT EXISTS support_cost_monthly_loads_month_scope_key
ON public.support_cost_monthly_loads (month_key, load_scope);

CREATE INDEX IF NOT EXISTS idx_support_cost_tickets_milvus_client
ON public.support_cost_tickets (milvus_client_id);

CREATE INDEX IF NOT EXISTS idx_support_cost_tickets_milvus_project
ON public.support_cost_tickets (milvus_project_id);

DROP POLICY IF EXISTS support_cost_inconsistencies_update ON public.support_cost_inconsistencies;
CREATE POLICY support_cost_inconsistencies_update ON public.support_cost_inconsistencies
FOR UPDATE TO authenticated
USING (
  public.has_any_role(
    auth.uid(),
    ARRAY[
      'superadmin'::public.app_role,
      'c-level'::public.app_role,
      'administrativo'::public.app_role,
      'rh'::public.app_role
    ]
  )
)
WITH CHECK (
  public.has_any_role(
    auth.uid(),
    ARRAY[
      'superadmin'::public.app_role,
      'c-level'::public.app_role,
      'administrativo'::public.app_role,
      'rh'::public.app_role
    ]
  )
);

DROP POLICY IF EXISTS support_cost_tickets_update_mapping ON public.support_cost_tickets;
CREATE POLICY support_cost_tickets_update_mapping ON public.support_cost_tickets
FOR UPDATE TO authenticated
USING (
  public.has_any_role(
    auth.uid(),
    ARRAY[
      'superadmin'::public.app_role,
      'c-level'::public.app_role,
      'administrativo'::public.app_role,
      'rh'::public.app_role
    ]
  )
)
WITH CHECK (
  public.has_any_role(
    auth.uid(),
    ARRAY[
      'superadmin'::public.app_role,
      'c-level'::public.app_role,
      'administrativo'::public.app_role,
      'rh'::public.app_role
    ]
  )
);
