
-- contract_subprojects: scope demo to is_demo rows
DROP POLICY IF EXISTS csp_select ON public.contract_subprojects;
CREATE POLICY csp_select ON public.contract_subprojects FOR SELECT TO authenticated
USING (
  CASE
    WHEN has_role(auth.uid(), 'demo'::app_role) THEN is_demo = true
    ELSE has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh','lider_tribo','superadmin']::app_role[])
  END
);

-- hr_timeline: remove demo from select
DROP POLICY IF EXISTS hr_timeline_select ON public.hr_timeline;
CREATE POLICY hr_timeline_select ON public.hr_timeline FOR SELECT TO authenticated
USING (has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh','superadmin']::app_role[]));

-- role_profiles: restrict select to c-level/superadmin
DROP POLICY IF EXISTS role_profiles_select ON public.role_profiles;
CREATE POLICY role_profiles_select ON public.role_profiles FOR SELECT TO authenticated
USING (has_any_role(auth.uid(), ARRAY['c-level','superadmin']::app_role[]));
