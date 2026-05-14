
-- resources: allow lider_tribo to INSERT
DROP POLICY IF EXISTS resources_insert ON public.resources;
CREATE POLICY resources_insert ON public.resources
FOR INSERT TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'intermediario'::app_role, 'administrativo'::app_role, 'rh'::app_role, 'lider_tribo'::app_role]));

-- contracts: allow lider_tribo to UPDATE (for ultima_atualizacao_recursos timestamp)
DROP POLICY IF EXISTS contracts_update ON public.contracts;
CREATE POLICY contracts_update ON public.contracts
FOR UPDATE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'intermediario'::app_role, 'administrativo'::app_role, 'rh'::app_role, 'lider_tribo'::app_role]));

-- hr_people: allow lider_tribo to SELECT
DROP POLICY IF EXISTS hr_people_select ON public.hr_people;
CREATE POLICY hr_people_select ON public.hr_people
FOR SELECT TO authenticated
USING (has_any_role(auth.uid(), ARRAY['c-level'::app_role, 'intermediario'::app_role, 'administrativo'::app_role, 'rh'::app_role, 'lider_tribo'::app_role]));
