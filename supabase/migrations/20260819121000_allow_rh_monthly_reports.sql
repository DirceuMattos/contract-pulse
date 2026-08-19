-- Permite que o perfil RH acesse o modulo de Relatorios Mensais.
--
-- A liberacao no front remove o bloqueio visual no gerenciador de perfis; este
-- upsert deixa a matriz do banco coerente para ambientes ja existentes.

INSERT INTO public.role_module_permissions (
  role,
  module_key,
  can_access,
  can_edit,
  can_create,
  can_delete,
  can_export,
  can_view_values,
  can_view_hr_costs,
  can_allocate
)
VALUES (
  'rh',
  'REPORTS',
  true,
  false,
  false,
  false,
  false,
  false,
  false,
  false
)
ON CONFLICT (role, module_key) DO UPDATE SET
  can_access = true;

DROP POLICY IF EXISTS monthly_reports_select ON public.monthly_reports;
CREATE POLICY monthly_reports_select ON public.monthly_reports FOR SELECT
USING (
  CASE
    WHEN public.has_role(auth.uid(), 'demo'::public.app_role) THEN (
      EXISTS (
        SELECT 1
          FROM public.contracts c
         WHERE c.id = public.monthly_reports.contract_id
           AND c.is_demo = true
      )
    )
    ELSE public.has_any_role(auth.uid(), ARRAY[
      'c-level'::public.app_role,
      'intermediario'::public.app_role,
      'administrativo'::public.app_role,
      'lider_tribo'::public.app_role,
      'superadmin'::public.app_role,
      'coordenacao_suporte'::public.app_role,
      'projetos_produtos'::public.app_role,
      'rh'::public.app_role
    ])
  END
);

DROP POLICY IF EXISTS report_sections_select ON public.report_sections;
CREATE POLICY report_sections_select ON public.report_sections FOR SELECT
USING (
  CASE
    WHEN public.has_role(auth.uid(), 'demo'::public.app_role) THEN (
      EXISTS (
        SELECT 1
          FROM public.monthly_reports mr
          JOIN public.contracts c ON c.id = mr.contract_id
         WHERE mr.id = public.report_sections.report_id
           AND c.is_demo = true
      )
    )
    ELSE public.has_any_role(auth.uid(), ARRAY[
      'c-level'::public.app_role,
      'intermediario'::public.app_role,
      'administrativo'::public.app_role,
      'lider_tribo'::public.app_role,
      'superadmin'::public.app_role,
      'coordenacao_suporte'::public.app_role,
      'projetos_produtos'::public.app_role,
      'rh'::public.app_role
    ])
  END
);

DROP POLICY IF EXISTS monthly_reports_insert ON public.monthly_reports;
CREATE POLICY monthly_reports_insert ON public.monthly_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY[
      'c-level'::public.app_role,
      'superadmin'::public.app_role,
      'intermediario'::public.app_role,
      'lider_tribo'::public.app_role,
      'rh'::public.app_role
    ])
  );

DROP POLICY IF EXISTS report_sections_insert ON public.report_sections;
CREATE POLICY report_sections_insert ON public.report_sections
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY[
      'c-level'::public.app_role,
      'superadmin'::public.app_role,
      'intermediario'::public.app_role,
      'lider_tribo'::public.app_role,
      'rh'::public.app_role
    ])
  );

DROP POLICY IF EXISTS monthly_reports_update ON public.monthly_reports;
CREATE POLICY monthly_reports_update ON public.monthly_reports
  FOR UPDATE TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY[
      'c-level'::public.app_role,
      'superadmin'::public.app_role,
      'intermediario'::public.app_role,
      'lider_tribo'::public.app_role,
      'rh'::public.app_role
    ])
  )
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY[
      'c-level'::public.app_role,
      'superadmin'::public.app_role,
      'intermediario'::public.app_role,
      'lider_tribo'::public.app_role,
      'rh'::public.app_role
    ])
  );

DROP POLICY IF EXISTS report_sections_update ON public.report_sections;
CREATE POLICY report_sections_update ON public.report_sections
  FOR UPDATE TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY[
      'c-level'::public.app_role,
      'superadmin'::public.app_role,
      'intermediario'::public.app_role,
      'lider_tribo'::public.app_role,
      'rh'::public.app_role
    ])
  )
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY[
      'c-level'::public.app_role,
      'superadmin'::public.app_role,
      'intermediario'::public.app_role,
      'lider_tribo'::public.app_role,
      'rh'::public.app_role
    ])
  );

DROP POLICY IF EXISTS ref_select ON public.report_external_files;
CREATE POLICY ref_select ON public.report_external_files
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY[
    'c-level','superadmin','lider_tribo','administrativo','coordenacao_suporte','projetos_produtos','rh'
  ]::public.app_role[]));

DROP POLICY IF EXISTS ref_insert ON public.report_external_files;
CREATE POLICY ref_insert ON public.report_external_files
  FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY[
    'c-level','superadmin','lider_tribo','administrativo','coordenacao_suporte','projetos_produtos','rh'
  ]::public.app_role[]));

DROP POLICY IF EXISTS "re_select" ON storage.objects;
CREATE POLICY "re_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'report-external' AND public.has_any_role(auth.uid(), ARRAY[
    'c-level','superadmin','lider_tribo','administrativo','coordenacao_suporte','projetos_produtos','rh'
  ]::public.app_role[]));

DROP POLICY IF EXISTS "re_insert" ON storage.objects;
CREATE POLICY "re_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'report-external' AND public.has_any_role(auth.uid(), ARRAY[
    'c-level','superadmin','lider_tribo','administrativo','coordenacao_suporte','projetos_produtos','rh'
  ]::public.app_role[]));
