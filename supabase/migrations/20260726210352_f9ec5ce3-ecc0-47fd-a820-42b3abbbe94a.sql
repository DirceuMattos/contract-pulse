DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['support_cost_tickets','support_cost_sync_runs','support_cost_monthly_loads','support_cost_inconsistencies','support_milvus_projects','support_milvus_project_mappings','support_milvus_client_mappings']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.has_any_role(auth.uid(), ARRAY[''c-level'',''superadmin'',''administrativo'',''coordenacao_suporte'',''lider_tribo'',''projetos_produtos'',''rh'']::app_role[]))', t || '_select', t);
  END LOOP;
END $$;