-- Align HR photo permissions between frontend and Supabase RLS.
-- Allowed to update HR photos: C-Level, Superadmin, Administrativo and RH.

INSERT INTO storage.buckets (id, name, public)
VALUES ('hr-avatars', 'hr-avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "hr-avatars public read" ON storage.objects;
DROP POLICY IF EXISTS "hr-avatars authenticated read" ON storage.objects;
DROP POLICY IF EXISTS "hr-avatars authenticated insert" ON storage.objects;
DROP POLICY IF EXISTS "hr-avatars authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "hr-avatars authenticated delete" ON storage.objects;
DROP POLICY IF EXISTS "hr-avatars role-restricted insert" ON storage.objects;
DROP POLICY IF EXISTS "hr-avatars role-restricted update" ON storage.objects;
DROP POLICY IF EXISTS "hr-avatars role-restricted delete" ON storage.objects;
DROP POLICY IF EXISTS "hr-avatars read" ON storage.objects;
DROP POLICY IF EXISTS "hr-avatars insert" ON storage.objects;
DROP POLICY IF EXISTS "hr-avatars update" ON storage.objects;
DROP POLICY IF EXISTS "hr-avatars delete" ON storage.objects;

CREATE POLICY "hr-avatars read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'hr-avatars');

CREATE POLICY "hr-avatars insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'hr-avatars'
    AND EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN (
          'c-level'::public.app_role,
          'superadmin'::public.app_role,
          'administrativo'::public.app_role,
          'rh'::public.app_role
        )
    )
  );

CREATE POLICY "hr-avatars update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'hr-avatars'
    AND EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN (
          'c-level'::public.app_role,
          'superadmin'::public.app_role,
          'administrativo'::public.app_role,
          'rh'::public.app_role
        )
    )
  )
  WITH CHECK (
    bucket_id = 'hr-avatars'
    AND EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN (
          'c-level'::public.app_role,
          'superadmin'::public.app_role,
          'administrativo'::public.app_role,
          'rh'::public.app_role
        )
    )
  );

CREATE POLICY "hr-avatars delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'hr-avatars'
    AND EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN (
          'c-level'::public.app_role,
          'superadmin'::public.app_role,
          'administrativo'::public.app_role,
          'rh'::public.app_role
        )
    )
  );

DROP POLICY IF EXISTS hr_people_update ON public.hr_people;

CREATE POLICY hr_people_update
  ON public.hr_people FOR UPDATE
  TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY[
      'c-level',
      'superadmin',
      'administrativo',
      'rh'
    ]::public.app_role[])
  )
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY[
      'c-level',
      'superadmin',
      'administrativo',
      'rh'
    ]::public.app_role[])
  );
