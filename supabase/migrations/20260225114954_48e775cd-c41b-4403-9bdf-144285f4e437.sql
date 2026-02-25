-- Fix user_roles SELECT: allow users to read their own role
DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
CREATE POLICY "user_roles_select" ON public.user_roles
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'c-level'::app_role)
  );

-- Fix user_module_permissions SELECT: allow users to read their own permissions
DROP POLICY IF EXISTS "ump_select" ON public.user_module_permissions;
CREATE POLICY "ump_select" ON public.user_module_permissions
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'c-level'::app_role)
  );