
-- 1. ai_external_search_logs: add INSERT/UPDATE/DELETE policies (admin-only; edge functions use service role and bypass RLS)
CREATE POLICY "aesl_insert" ON public.ai_external_search_logs FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'superadmin'::app_role]));
CREATE POLICY "aesl_update" ON public.ai_external_search_logs FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'superadmin'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'superadmin'::app_role]));
CREATE POLICY "aesl_delete" ON public.ai_external_search_logs FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'superadmin'::app_role]));

-- 2. contract-documents bucket: add UPDATE policy mirroring INSERT permissions
CREATE POLICY "cd_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'contract-documents'::text AND has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'intermediario'::app_role, 'administrativo'::app_role, 'rh'::app_role]))
  WITH CHECK (bucket_id = 'contract-documents'::text AND has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'intermediario'::app_role, 'administrativo'::app_role, 'rh'::app_role]));

-- 3. doc_chunk_embeddings: add admin-only SELECT policy (writes happen via service role)
CREATE POLICY "dce_select" ON public.doc_chunk_embeddings FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'superadmin'::app_role]));
CREATE POLICY "dce_admin_manage" ON public.doc_chunk_embeddings FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'superadmin'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'superadmin'::app_role]));

-- 4. Revoke EXECUTE on SECURITY DEFINER helpers from anon/public (keep authenticated/service_role)
REVOKE EXECUTE ON FUNCTION public.get_doc_extractions_status() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_transport_years() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_transport_yearly_totals() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_vault_secret(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_clevel() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_doc_extractions_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_transport_years() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_transport_yearly_totals() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_clevel() TO authenticated;

-- 5. Pin search_path on the one function missing it
ALTER FUNCTION public.get_vault_secret(text) SET search_path = public;

-- 6. Public bucket listing: drop the broad SELECT policy on hr-avatars.
-- Files remain accessible via their public URLs (public bucket); only listing/searching the bucket via the API is removed.
DROP POLICY IF EXISTS "hr-avatars authenticated read" ON storage.objects;

-- 7. Replace always-true INSERT policy on report_sync_logs with an authenticated check.
-- Edge functions use the service role and bypass RLS, so legitimate sync inserts continue to work.
DROP POLICY IF EXISTS "report_sync_logs_insert" ON public.report_sync_logs;
CREATE POLICY "report_sync_logs_insert" ON public.report_sync_logs FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'superadmin'::app_role]));
