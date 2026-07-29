-- FIX DEFINITIVO — download de documentos de contrato.
-- Causa: as policies do bucket 'contract-documents' no banco estavam
-- regredidas (faltavam lider_tribo, juridico, superadmin no SELECT), por
-- sobrescrita da migration 20260723120000. Bucket é privado, então o
-- download por signed URL depende do SELECT policy.
-- Reaplica as 3 policies alinhadas ao repositório. 2026-07-30

-- Leitura (download / signed URL / preview)
DROP POLICY IF EXISTS cd_select ON storage.objects;
CREATE POLICY cd_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'contract-documents'
    AND public.has_any_role(auth.uid(), ARRAY[
      'c-level','intermediario','administrativo','rh',
      'lider_tribo','juridico','superadmin'
    ]::public.app_role[])
  );

-- Update (migração de legado, substituição de arquivo)
DROP POLICY IF EXISTS cd_update ON storage.objects;
CREATE POLICY cd_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'contract-documents'
    AND public.has_any_role(auth.uid(), ARRAY[
      'c-level','intermediario','administrativo','rh','superadmin'
    ]::public.app_role[])
  )
  WITH CHECK (
    bucket_id = 'contract-documents'
    AND public.has_any_role(auth.uid(), ARRAY[
      'c-level','intermediario','administrativo','rh','superadmin'
    ]::public.app_role[])
  );

-- Delete (remoção de anexo)
DROP POLICY IF EXISTS cd_delete ON storage.objects;
CREATE POLICY cd_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'contract-documents'
    AND public.has_any_role(auth.uid(), ARRAY[
      'c-level','intermediario','administrativo','superadmin'
    ]::public.app_role[])
  );

-- Conferência:
-- select policyname, cmd, qual from pg_policies
-- where schemaname='storage' and tablename='objects' and policyname like 'cd_%';
