DROP POLICY IF EXISTS support_milvus_clients_select ON public.support_milvus_clients;
CREATE POLICY support_milvus_clients_select ON public.support_milvus_clients
FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['c-level','superadmin','administrativo','coordenacao_suporte']::app_role[]));