
DROP POLICY IF EXISTS cd_insert ON storage.objects;
CREATE POLICY cd_insert ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'contract-documents'
    AND has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'intermediario'::app_role, 'administrativo'::app_role, 'rh'::app_role])
  );

DROP POLICY IF EXISTS cd_delete ON storage.objects;
CREATE POLICY cd_delete ON storage.objects FOR DELETE
  USING (
    bucket_id = 'contract-documents'
    AND has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'intermediario'::app_role, 'administrativo'::app_role])
  );
