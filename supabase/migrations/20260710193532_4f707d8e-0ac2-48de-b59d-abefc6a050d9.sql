-- Fix demo role bypass on monthly_reports
DROP POLICY IF EXISTS monthly_reports_select ON public.monthly_reports;
CREATE POLICY monthly_reports_select ON public.monthly_reports FOR SELECT
USING (
  CASE
    WHEN public.has_role(auth.uid(), 'demo'::public.app_role) THEN (
      EXISTS (
        SELECT 1 FROM public.contracts c
        WHERE c.id = public.monthly_reports.contract_id
          AND c.is_demo = true
      )
    )
    ELSE public.has_any_role(auth.uid(), ARRAY['c-level'::public.app_role, 'intermediario'::public.app_role, 'administrativo'::public.app_role, 'lider_tribo'::public.app_role, 'superadmin'::public.app_role, 'coordenacao_suporte'::public.app_role, 'projetos_produtos'::public.app_role])
  END
);

-- Fix demo role bypass on report_sections
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
    ELSE public.has_any_role(auth.uid(), ARRAY['c-level'::public.app_role, 'intermediario'::public.app_role, 'administrativo'::public.app_role, 'lider_tribo'::public.app_role, 'superadmin'::public.app_role, 'coordenacao_suporte'::public.app_role, 'projetos_produtos'::public.app_role])
  END
);