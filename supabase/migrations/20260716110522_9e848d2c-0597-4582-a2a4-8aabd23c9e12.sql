
DROP POLICY IF EXISTS jr_select ON public.job_requests;
CREATE POLICY jr_select ON public.job_requests FOR SELECT TO authenticated
USING (has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'superadmin'::app_role, 'projetos_produtos'::app_role, 'lider_tribo'::app_role, 'rh'::app_role, 'administrativo'::app_role, 'intermediario'::app_role]));

DROP POLICY IF EXISTS jrsh_select ON public.job_request_status_history;
CREATE POLICY jrsh_select ON public.job_request_status_history FOR SELECT TO authenticated
USING (has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'superadmin'::app_role, 'projetos_produtos'::app_role, 'lider_tribo'::app_role, 'rh'::app_role, 'administrativo'::app_role, 'intermediario'::app_role]));

REVOKE EXECUTE ON FUNCTION public.log_job_request_status_change() FROM PUBLIC, anon, authenticated;
