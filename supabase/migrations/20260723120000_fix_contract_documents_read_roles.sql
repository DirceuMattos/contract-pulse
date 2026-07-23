DROP POLICY IF EXISTS cd_select ON storage.objects;

CREATE POLICY cd_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'contract-documents'
    AND public.has_any_role(
      auth.uid(),
      ARRAY[
        'c-level'::public.app_role,
        'intermediario'::public.app_role,
        'administrativo'::public.app_role,
        'rh'::public.app_role,
        'lider_tribo'::public.app_role,
        'juridico'::public.app_role,
        'superadmin'::public.app_role
      ]
    )
  );
