ALTER TYPE public.module_key ADD VALUE IF NOT EXISTS 'SUPPORT_COSTS';

UPDATE public.role_profiles
SET modules = (
  SELECT jsonb_agg(module_key)::json
  FROM (
    SELECT DISTINCT value AS module_key
    FROM jsonb_array_elements_text(COALESCE(modules::jsonb, '[]'::jsonb))
    UNION
    SELECT 'SUPPORT_COSTS'
  ) merged_modules
)
WHERE role IN ('rh', 'administrativo', 'c-level', 'superadmin', 'lider_tribo');

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
VALUES
  ('c-level', 'SUPPORT_COSTS', true, true, true, true, true, true, true, true),
  ('superadmin', 'SUPPORT_COSTS', true, true, true, true, true, true, true, true),
  ('administrativo', 'SUPPORT_COSTS', true, true, true, true, true, true, true, true),
  ('rh', 'SUPPORT_COSTS', true, true, true, true, false, false, false, false),
  ('lider_tribo', 'SUPPORT_COSTS', true, true, false, false, false, false, false, false)
ON CONFLICT (role, module_key) DO UPDATE SET
  can_access = EXCLUDED.can_access,
  can_edit = EXCLUDED.can_edit,
  can_create = EXCLUDED.can_create,
  can_delete = EXCLUDED.can_delete,
  can_export = EXCLUDED.can_export,
  can_view_values = EXCLUDED.can_view_values,
  can_view_hr_costs = EXCLUDED.can_view_hr_costs,
  can_allocate = EXCLUDED.can_allocate,
  updated_at = now();
