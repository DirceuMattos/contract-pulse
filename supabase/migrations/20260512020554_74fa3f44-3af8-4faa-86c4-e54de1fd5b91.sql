DROP POLICY IF EXISTS feedz_events_select ON public.feedz_sync_events;
CREATE POLICY feedz_events_select ON public.feedz_sync_events
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'rh'::app_role]));

DROP POLICY IF EXISTS cd_select ON storage.objects;
CREATE POLICY cd_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'contract-documents'
    AND public.has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'intermediario'::app_role, 'administrativo'::app_role, 'rh'::app_role])
  );