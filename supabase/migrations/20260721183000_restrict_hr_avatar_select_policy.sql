-- Restrict object listing/SELECT for HR avatars to authenticated users with an assigned role.
-- The bucket remains public so existing stored public avatar URLs continue to render.

UPDATE storage.buckets
SET public = true
WHERE id = 'hr-avatars';

DROP POLICY IF EXISTS "hr-avatars public read" ON storage.objects;
DROP POLICY IF EXISTS "hr-avatars authenticated read" ON storage.objects;
DROP POLICY IF EXISTS "hr-avatars read" ON storage.objects;

CREATE POLICY "hr-avatars read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'hr-avatars'
    AND EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
    )
  );
