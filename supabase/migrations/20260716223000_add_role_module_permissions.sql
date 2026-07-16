CREATE TABLE IF NOT EXISTS public.role_module_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  module_key text NOT NULL,
  can_access boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  can_export boolean NOT NULL DEFAULT false,
  can_view_values boolean NOT NULL DEFAULT false,
  can_view_hr_costs boolean NOT NULL DEFAULT false,
  can_allocate boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (role, module_key)
);

ALTER TABLE public.role_module_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS role_module_permissions_select ON public.role_module_permissions;
CREATE POLICY role_module_permissions_select ON public.role_module_permissions
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'superadmin'::app_role)
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role::text = role_module_permissions.role
  )
);

DROP POLICY IF EXISTS role_module_permissions_modify ON public.role_module_permissions;
CREATE POLICY role_module_permissions_modify ON public.role_module_permissions
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));

DROP TRIGGER IF EXISTS update_role_module_permissions_updated_at ON public.role_module_permissions;
CREATE TRIGGER update_role_module_permissions_updated_at
BEFORE UPDATE ON public.role_module_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
