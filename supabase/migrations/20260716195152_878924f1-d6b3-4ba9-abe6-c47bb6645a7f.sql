DROP POLICY IF EXISTS "Authenticated can read client-logos" ON storage.objects;
CREATE POLICY "Roles can read client-logos" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'client-logos'
  AND public.has_any_role(auth.uid(), ARRAY[
    'c-level','superadmin','administrativo','comercial',
    'projetos_produtos','lider_tribo','rh','intermediario','leitor'
  ]::app_role[])
);