DROP POLICY IF EXISTS teams_insert ON public.teams;
CREATE POLICY teams_insert ON public.teams
FOR INSERT TO authenticated
WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY[
    'superadmin'::public.app_role,
    'c-level'::public.app_role,
    'intermediario'::public.app_role,
    'administrativo'::public.app_role,
    'rh'::public.app_role
  ])
);

DROP POLICY IF EXISTS teams_update ON public.teams;
CREATE POLICY teams_update ON public.teams
FOR UPDATE TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY[
    'superadmin'::public.app_role,
    'c-level'::public.app_role,
    'intermediario'::public.app_role,
    'administrativo'::public.app_role,
    'rh'::public.app_role
  ])
)
WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY[
    'superadmin'::public.app_role,
    'c-level'::public.app_role,
    'intermediario'::public.app_role,
    'administrativo'::public.app_role,
    'rh'::public.app_role
  ])
);

DROP POLICY IF EXISTS teams_delete ON public.teams;
CREATE POLICY teams_delete ON public.teams
FOR DELETE TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY[
    'superadmin'::public.app_role,
    'c-level'::public.app_role
  ])
);
