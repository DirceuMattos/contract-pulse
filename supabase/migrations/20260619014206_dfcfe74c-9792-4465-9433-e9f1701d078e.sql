
-- Restrict read access on business tables to authenticated users only.
-- Previously the SELECT policies applied to {public} (which includes anon),
-- and the CASE branch returned true for non-demo rows regardless of auth.uid().

DROP POLICY IF EXISTS contracts_select ON public.contracts;
CREATE POLICY contracts_select ON public.contracts FOR SELECT TO authenticated
USING (
  CASE
    WHEN has_role(auth.uid(), 'demo'::app_role) THEN (is_demo = true)
    ELSE ((is_demo = false) OR (is_demo IS NULL))
  END
);

DROP POLICY IF EXISTS clients_select ON public.clients;
CREATE POLICY clients_select ON public.clients FOR SELECT TO authenticated
USING (
  CASE
    WHEN has_role(auth.uid(), 'demo'::app_role) THEN (is_demo = true)
    ELSE ((is_demo = false) OR (is_demo IS NULL))
  END
);

DROP POLICY IF EXISTS resources_select ON public.resources;
CREATE POLICY resources_select ON public.resources FOR SELECT TO authenticated
USING (
  CASE
    WHEN has_role(auth.uid(), 'demo'::app_role) THEN (is_demo = true)
    ELSE ((is_demo = false) OR (is_demo IS NULL))
  END
);

DROP POLICY IF EXISTS teams_select ON public.teams;
CREATE POLICY teams_select ON public.teams FOR SELECT TO authenticated
USING (
  CASE
    WHEN has_role(auth.uid(), 'demo'::app_role) THEN (is_demo = true)
    ELSE ((is_demo = false) OR (is_demo IS NULL))
  END
);
