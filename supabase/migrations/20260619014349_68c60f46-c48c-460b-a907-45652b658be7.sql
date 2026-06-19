
-- resources: restrict SELECT to roles with legitimate need for cost/HR data
DROP POLICY IF EXISTS resources_select ON public.resources;
CREATE POLICY resources_select ON public.resources FOR SELECT TO authenticated
USING (
  CASE
    WHEN has_role(auth.uid(), 'demo'::app_role) THEN (is_demo = true)
    ELSE (
      ((is_demo = false) OR (is_demo IS NULL))
      AND has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh','lider_tribo','superadmin']::app_role[])
    )
  END
);

-- clients: restrict SELECT to same roles (excludes leitor from PII access)
DROP POLICY IF EXISTS clients_select ON public.clients;
CREATE POLICY clients_select ON public.clients FOR SELECT TO authenticated
USING (
  CASE
    WHEN has_role(auth.uid(), 'demo'::app_role) THEN (is_demo = true)
    ELSE (
      ((is_demo = false) OR (is_demo IS NULL))
      AND has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh','lider_tribo','superadmin']::app_role[])
    )
  END
);

-- simulations: restrict SELECT to commercial roles
DROP POLICY IF EXISTS sim_select ON public.simulations;
CREATE POLICY sim_select ON public.simulations FOR SELECT TO authenticated
USING (has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh','superadmin']::app_role[]));

-- simulation_hr_items: align with simulations
DROP POLICY IF EXISTS simhr_select ON public.simulation_hr_items;
CREATE POLICY simhr_select ON public.simulation_hr_items FOR SELECT TO authenticated
USING (has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh','superadmin']::app_role[]));
