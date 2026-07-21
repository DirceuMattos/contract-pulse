DROP POLICY IF EXISTS jr_write ON public.job_requests;
DROP POLICY IF EXISTS jr_insert ON public.job_requests;
DROP POLICY IF EXISTS jr_update ON public.job_requests;
DROP POLICY IF EXISTS jr_delete ON public.job_requests;

CREATE POLICY jr_insert ON public.job_requests
FOR INSERT TO authenticated
WITH CHECK (
  public.has_any_role(
    auth.uid(),
    ARRAY[
      'superadmin'::public.app_role,
      'c-level'::public.app_role,
      'projetos_produtos'::public.app_role,
      'lider_tribo'::public.app_role,
      'rh'::public.app_role,
      'administrativo'::public.app_role
    ]
  )
);

CREATE POLICY jr_update ON public.job_requests
FOR UPDATE TO authenticated
USING (
  public.has_any_role(
    auth.uid(),
    ARRAY[
      'superadmin'::public.app_role,
      'c-level'::public.app_role,
      'projetos_produtos'::public.app_role,
      'lider_tribo'::public.app_role,
      'rh'::public.app_role,
      'administrativo'::public.app_role
    ]
  )
)
WITH CHECK (
  public.has_any_role(
    auth.uid(),
    ARRAY[
      'superadmin'::public.app_role,
      'c-level'::public.app_role,
      'projetos_produtos'::public.app_role,
      'lider_tribo'::public.app_role,
      'rh'::public.app_role,
      'administrativo'::public.app_role
    ]
  )
);

CREATE POLICY jr_delete ON public.job_requests
FOR DELETE TO authenticated
USING (
  public.has_any_role(
    auth.uid(),
    ARRAY[
      'superadmin'::public.app_role,
      'rh'::public.app_role,
      'administrativo'::public.app_role
    ]
  )
);
