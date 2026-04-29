-- Restrict hr_people SELECT to authenticated users with appropriate roles
DROP POLICY IF EXISTS hr_people_select ON public.hr_people;
CREATE POLICY hr_people_select ON public.hr_people
  FOR SELECT
  TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'intermediario'::app_role, 'administrativo'::app_role, 'rh'::app_role])
  );

-- Also tighten hr_timeline (same PII exposure pattern via {public})
DROP POLICY IF EXISTS hr_timeline_select ON public.hr_timeline;
CREATE POLICY hr_timeline_select ON public.hr_timeline
  FOR SELECT
  TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'intermediario'::app_role, 'administrativo'::app_role, 'rh'::app_role])
  );