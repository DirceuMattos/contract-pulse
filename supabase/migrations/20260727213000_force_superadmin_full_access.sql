CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (role = _role OR role = 'superadmin'::public.app_role)
  )
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles public.app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (role = ANY(_roles) OR role = 'superadmin'::public.app_role)
  )
$$;

INSERT INTO public.role_module_permissions (
  role,
  module_key,
  can_access,
  can_edit,
  can_create,
  can_delete,
  can_export,
  can_view_values,
  can_view_hr_costs,
  can_allocate
)
SELECT
  'superadmin',
  module_key,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true
FROM (
  SELECT unnest(ARRAY[
    'DASHBOARD',
    'HR_DASHBOARD',
    'CLIENTS',
    'CONTRACTS',
    'CONTRACT_DETAIL',
    'RESOURCES',
    'HISTORY',
    'DOCUMENTS',
    'ALERTS',
    'SQUADS',
    'CALCULATOR',
    'USERS_ADMIN',
    'ACCESS_LOGS',
    'SETTINGS',
    'IMPORT_EXPORT',
    'HR',
    'AI',
    'AI_LOGS',
    'RECEIVABLES',
    'REPORTS',
    'SUPPORT_COSTS',
    'OVERTIME',
    'TRANSPORT',
    'JOB_REQUESTS',
    'JOB_SKILLS',
    'PROFILES_ADMIN'
  ]) AS module_key
) modules
ON CONFLICT (role, module_key) DO UPDATE SET
  can_access = true,
  can_edit = true,
  can_create = true,
  can_delete = true,
  can_export = true,
  can_view_values = true,
  can_view_hr_costs = true,
  can_allocate = true,
  updated_at = now();
