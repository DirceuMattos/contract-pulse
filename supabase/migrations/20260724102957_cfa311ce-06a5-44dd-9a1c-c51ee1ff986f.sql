
DROP POLICY IF EXISTS csp_select ON public.contract_subprojects;
CREATE POLICY csp_select ON public.contract_subprojects FOR SELECT TO authenticated USING (
  CASE
    WHEN has_role(auth.uid(), 'demo'::app_role) THEN (is_demo = true)
    ELSE (COALESCE(is_demo, false) = false AND has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'intermediario'::app_role, 'administrativo'::app_role, 'rh'::app_role, 'lider_tribo'::app_role, 'superadmin'::app_role]))
  END
);

DROP POLICY IF EXISTS jsp_select ON public.job_skill_profiles;
CREATE POLICY jsp_select ON public.job_skill_profiles FOR SELECT TO authenticated USING (
  has_any_role(auth.uid(), ARRAY['superadmin'::app_role, 'c-level'::app_role, 'projetos_produtos'::app_role, 'lider_tribo'::app_role, 'rh'::app_role, 'administrativo'::app_role, 'intermediario'::app_role, 'coordenacao_suporte'::app_role])
);

DROP POLICY IF EXISTS jsps_select ON public.job_skill_profile_skills;
CREATE POLICY jsps_select ON public.job_skill_profile_skills FOR SELECT TO authenticated USING (
  has_any_role(auth.uid(), ARRAY['superadmin'::app_role, 'c-level'::app_role, 'projetos_produtos'::app_role, 'lider_tribo'::app_role, 'rh'::app_role, 'administrativo'::app_role, 'intermediario'::app_role, 'coordenacao_suporte'::app_role])
);

DROP POLICY IF EXISTS skills_select ON public.skills;
CREATE POLICY skills_select ON public.skills FOR SELECT TO authenticated USING (
  has_any_role(auth.uid(), ARRAY['superadmin'::app_role, 'c-level'::app_role, 'projetos_produtos'::app_role, 'lider_tribo'::app_role, 'rh'::app_role, 'administrativo'::app_role, 'intermediario'::app_role, 'coordenacao_suporte'::app_role])
);
