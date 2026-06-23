
ALTER TABLE public.user_module_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS teams_select ON public.teams;
CREATE POLICY teams_select ON public.teams FOR SELECT TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY['c-level','intermediario','administrativo','rh','lider_tribo','superadmin']::app_role[])
  AND ((is_demo = false) OR (is_demo IS NULL))
  OR (has_role(auth.uid(), 'demo'::app_role) AND is_demo = true)
);
