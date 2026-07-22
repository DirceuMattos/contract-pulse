DROP POLICY IF EXISTS hr_timeline_insert ON public.hr_timeline;
CREATE POLICY hr_timeline_insert ON public.hr_timeline FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['c-level','superadmin','intermediario','administrativo','rh']::app_role[]));

DROP POLICY IF EXISTS hr_timeline_update ON public.hr_timeline;
CREATE POLICY hr_timeline_update ON public.hr_timeline FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['c-level','superadmin','intermediario','administrativo','rh']::app_role[]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['c-level','superadmin','intermediario','administrativo','rh']::app_role[]));

DROP POLICY IF EXISTS hr_timeline_delete ON public.hr_timeline;
CREATE POLICY hr_timeline_delete ON public.hr_timeline FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['c-level','superadmin','intermediario','administrativo','rh']::app_role[]));
