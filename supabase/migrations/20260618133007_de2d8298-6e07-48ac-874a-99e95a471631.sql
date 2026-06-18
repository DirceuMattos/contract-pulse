DROP POLICY IF EXISTS resources_insert ON public.resources;
CREATE POLICY resources_insert ON public.resources
FOR INSERT TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'intermediario'::app_role, 'administrativo'::app_role, 'rh'::app_role, 'lider_tribo'::app_role, 'superadmin'::app_role]));