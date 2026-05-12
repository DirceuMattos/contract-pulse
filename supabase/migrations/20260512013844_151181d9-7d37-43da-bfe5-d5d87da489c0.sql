
DROP POLICY IF EXISTS hci_select ON public.hr_correction_items;
CREATE POLICY hci_select ON public.hr_correction_items
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'rh'::app_role]));

DROP POLICY IF EXISTS fsc_select ON public.feedz_sync_change;
DROP POLICY IF EXISTS fsc_insert ON public.feedz_sync_change;
DROP POLICY IF EXISTS fsc_update ON public.feedz_sync_change;
DROP POLICY IF EXISTS fsc_delete ON public.feedz_sync_change;

CREATE POLICY fsc_select ON public.feedz_sync_change
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'rh'::app_role]));

CREATE POLICY fsc_insert ON public.feedz_sync_change
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'c-level'::app_role));

CREATE POLICY fsc_update ON public.feedz_sync_change
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'c-level'::app_role));

CREATE POLICY fsc_delete ON public.feedz_sync_change
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'c-level'::app_role));
