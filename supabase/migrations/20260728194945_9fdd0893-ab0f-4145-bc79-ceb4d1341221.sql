DROP POLICY IF EXISTS "db_export_select_admin" ON storage.objects;
DROP POLICY IF EXISTS "db_export_insert_admin" ON storage.objects;
DROP POLICY IF EXISTS "db_export_update_admin" ON storage.objects;
DROP POLICY IF EXISTS "db_export_delete_admin" ON storage.objects;

CREATE POLICY "db_export_select_admin" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'database_export_13_07_26'
  AND (public.has_role(auth.uid(), 'superadmin'::app_role) OR public.has_role(auth.uid(), 'c-level'::app_role))
);

CREATE POLICY "db_export_insert_admin" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'database_export_13_07_26'
  AND (public.has_role(auth.uid(), 'superadmin'::app_role) OR public.has_role(auth.uid(), 'c-level'::app_role))
);

CREATE POLICY "db_export_update_admin" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'database_export_13_07_26'
  AND (public.has_role(auth.uid(), 'superadmin'::app_role) OR public.has_role(auth.uid(), 'c-level'::app_role))
)
WITH CHECK (
  bucket_id = 'database_export_13_07_26'
  AND (public.has_role(auth.uid(), 'superadmin'::app_role) OR public.has_role(auth.uid(), 'c-level'::app_role))
);

CREATE POLICY "db_export_delete_admin" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'database_export_13_07_26'
  AND (public.has_role(auth.uid(), 'superadmin'::app_role) OR public.has_role(auth.uid(), 'c-level'::app_role))
);