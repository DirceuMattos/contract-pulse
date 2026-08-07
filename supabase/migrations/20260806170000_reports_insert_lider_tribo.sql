-- Relatórios (problema Itaquá): a P.O. (lider_tribo) não conseguia DUPLICAR o mês
-- porque as policies de INSERT de monthly_reports e report_sections não incluíam
-- lider_tribo (só c-level/superadmin/intermediario). O INSERT era bloqueado pela
-- RLS e a duplicação falhava silenciosamente. Acrescenta lider_tribo.
-- Mesmo padrão do bug spa_insert (Squads/Wesley). 2026-08-06

DROP POLICY IF EXISTS monthly_reports_insert ON public.monthly_reports;
CREATE POLICY monthly_reports_insert ON public.monthly_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY[
      'c-level'::public.app_role,
      'superadmin'::public.app_role,
      'intermediario'::public.app_role,
      'lider_tribo'::public.app_role
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
      'lider_tribo'::public.app_role
    ])
  );

-- UPDATE também precisa de lider_tribo (a P.O. edita e sincroniza o relatório).
DROP POLICY IF EXISTS monthly_reports_update ON public.monthly_reports;
CREATE POLICY monthly_reports_update ON public.monthly_reports
  FOR UPDATE TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY[
      'c-level'::public.app_role,
      'superadmin'::public.app_role,
      'intermediario'::public.app_role,
      'lider_tribo'::public.app_role
    ])
  )
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY[
      'c-level'::public.app_role,
      'superadmin'::public.app_role,
      'intermediario'::public.app_role,
      'lider_tribo'::public.app_role
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
      'lider_tribo'::public.app_role
    ])
  )
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY[
      'c-level'::public.app_role,
      'superadmin'::public.app_role,
      'intermediario'::public.app_role,
      'lider_tribo'::public.app_role
    ])
  );
