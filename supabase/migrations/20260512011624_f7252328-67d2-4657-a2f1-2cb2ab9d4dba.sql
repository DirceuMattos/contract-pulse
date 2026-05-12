
DROP POLICY IF EXISTS resources_update ON public.resources;
CREATE POLICY resources_update ON public.resources
  FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'intermediario'::app_role, 'administrativo'::app_role, 'rh'::app_role, 'lider_tribo'::app_role]));

DROP POLICY IF EXISTS spa_update ON public.subproject_allocations;
CREATE POLICY spa_update ON public.subproject_allocations
  FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'intermediario'::app_role, 'lider_tribo'::app_role]));

DROP POLICY IF EXISTS spa_insert ON public.subproject_allocations;
CREATE POLICY spa_insert ON public.subproject_allocations
  FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'intermediario'::app_role, 'lider_tribo'::app_role]));

DROP POLICY IF EXISTS spa_delete ON public.subproject_allocations;
CREATE POLICY spa_delete ON public.subproject_allocations
  FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'lider_tribo'::app_role]));
