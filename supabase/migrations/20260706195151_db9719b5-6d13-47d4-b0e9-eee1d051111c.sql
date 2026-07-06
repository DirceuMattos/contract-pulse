
-- Fix demo role bypass on clients
DROP POLICY IF EXISTS clients_select ON public.clients;
CREATE POLICY clients_select ON public.clients FOR SELECT
USING (
  CASE
    WHEN has_role(auth.uid(), 'demo'::app_role) THEN is_demo = true
    ELSE has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'intermediario'::app_role, 'administrativo'::app_role, 'rh'::app_role, 'lider_tribo'::app_role, 'comercial'::app_role, 'juridico'::app_role, 'superadmin'::app_role, 'coordenacao_suporte'::app_role, 'projetos_produtos'::app_role])
  END
);

-- Fix demo role bypass on contracts
DROP POLICY IF EXISTS contracts_select ON public.contracts;
CREATE POLICY contracts_select ON public.contracts FOR SELECT
USING (
  CASE
    WHEN has_role(auth.uid(), 'demo'::app_role) THEN is_demo = true
    ELSE has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'intermediario'::app_role, 'administrativo'::app_role, 'rh'::app_role, 'lider_tribo'::app_role, 'comercial'::app_role, 'juridico'::app_role, 'superadmin'::app_role, 'coordenacao_suporte'::app_role, 'projetos_produtos'::app_role])
  END
);

-- Fix demo role bypass on resources
DROP POLICY IF EXISTS resources_select ON public.resources;
CREATE POLICY resources_select ON public.resources FOR SELECT
USING (
  CASE
    WHEN has_role(auth.uid(), 'demo'::app_role) THEN is_demo = true
    ELSE has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'intermediario'::app_role, 'administrativo'::app_role, 'rh'::app_role, 'lider_tribo'::app_role, 'superadmin'::app_role, 'coordenacao_suporte'::app_role, 'projetos_produtos'::app_role])
  END
);

-- Scope client-logos storage writes to admin-level roles
DROP POLICY IF EXISTS "Authenticated can update client-logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete client-logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can insert client-logos" ON storage.objects;

CREATE POLICY "Admins can insert client-logos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'client-logos'
  AND public.has_any_role(auth.uid(), ARRAY['c-level'::public.app_role, 'administrativo'::public.app_role, 'comercial'::public.app_role, 'superadmin'::public.app_role])
);

CREATE POLICY "Admins can update client-logos" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'client-logos'
  AND public.has_any_role(auth.uid(), ARRAY['c-level'::public.app_role, 'administrativo'::public.app_role, 'comercial'::public.app_role, 'superadmin'::public.app_role])
);

CREATE POLICY "Admins can delete client-logos" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'client-logos'
  AND public.has_any_role(auth.uid(), ARRAY['c-level'::public.app_role, 'administrativo'::public.app_role, 'comercial'::public.app_role, 'superadmin'::public.app_role])
);
