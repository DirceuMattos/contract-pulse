
DROP POLICY IF EXISTS "hr-avatars public read" ON storage.objects;
DROP POLICY IF EXISTS "hr-avatars authenticated insert" ON storage.objects;
DROP POLICY IF EXISTS "hr-avatars authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "hr-avatars authenticated delete" ON storage.objects;

CREATE POLICY "hr-avatars authenticated read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'hr-avatars');

CREATE POLICY "hr-avatars role-restricted insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'hr-avatars'
    AND public.has_any_role(auth.uid(), ARRAY['c-level','administrativo','intermediario','rh','lider_tribo']::app_role[])
  );

CREATE POLICY "hr-avatars role-restricted update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'hr-avatars'
    AND public.has_any_role(auth.uid(), ARRAY['c-level','administrativo','intermediario','rh','lider_tribo']::app_role[])
  );

CREATE POLICY "hr-avatars role-restricted delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'hr-avatars'
    AND public.has_any_role(auth.uid(), ARRAY['c-level','administrativo','intermediario','rh','lider_tribo']::app_role[])
  );
