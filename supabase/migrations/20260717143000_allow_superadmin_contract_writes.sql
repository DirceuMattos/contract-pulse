-- Allow Superadmin to create and edit contracts.
-- The frontend already authorizes this role; these RLS policies align the database.

DROP POLICY IF EXISTS contracts_insert ON public.contracts;
CREATE POLICY contracts_insert ON public.contracts
FOR INSERT TO authenticated
WITH CHECK (
  public.has_any_role(
    auth.uid(),
    ARRAY[
      'c-level'::public.app_role,
      'intermediario'::public.app_role,
      'administrativo'::public.app_role,
      'rh'::public.app_role,
      'superadmin'::public.app_role
    ]
  )
);

DROP POLICY IF EXISTS contracts_update ON public.contracts;
CREATE POLICY contracts_update ON public.contracts
FOR UPDATE TO authenticated
USING (
  public.has_any_role(
    auth.uid(),
    ARRAY[
      'c-level'::public.app_role,
      'intermediario'::public.app_role,
      'administrativo'::public.app_role,
      'rh'::public.app_role,
      'lider_tribo'::public.app_role,
      'superadmin'::public.app_role
    ]
  )
)
WITH CHECK (
  public.has_any_role(
    auth.uid(),
    ARRAY[
      'c-level'::public.app_role,
      'intermediario'::public.app_role,
      'administrativo'::public.app_role,
      'rh'::public.app_role,
      'lider_tribo'::public.app_role,
      'superadmin'::public.app_role
    ]
  )
);
