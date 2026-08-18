-- I10 Fase 0 — Módulos de Equipamentos e permissões iniciais
--
-- Cria as duas chaves de módulo previstas na §5 do PRD (lista de controle e
-- submódulo de requisição, separados porque nem todos que requisitam podem ver
-- a lista) e distribui os acessos conforme a §6.
--
-- Depende de 20260812120000_add_head_role.sql (valor 'head' no enum).

-- ---------------------------------------------------------------------------
-- 1. Perfil Head no registro de perfis
-- ---------------------------------------------------------------------------

INSERT INTO public.role_profiles (role, label, modules)
VALUES ('head', 'Head de Área', '["EQUIPMENT_REQUESTS"]'::jsonb)
ON CONFLICT (role) DO UPDATE
  SET label = EXCLUDED.label,
      modules = EXCLUDED.modules;

-- ---------------------------------------------------------------------------
-- 2. Permissões por módulo
-- ---------------------------------------------------------------------------
-- EQUIPMENT          — lista de controle do inventário
-- EQUIPMENT_REQUESTS — submódulo de requisição
--
-- Conforme a §6 do PRD v3. O Head enxerga exclusivamente EQUIPMENT_REQUESTS.

-- Lista de controle
INSERT INTO public.role_module_permissions
  (role, module_key, can_access, can_edit, can_create, can_delete, can_export, can_view_values, can_view_hr_costs, can_allocate)
VALUES
  ('superadmin',          'EQUIPMENT', true, true, true, true, true, true, false, false),
  ('c-level',             'EQUIPMENT', true, true, true, true, true, true, false, false),
  ('administrativo',      'EQUIPMENT', true, true, true, true, true, true, false, false),
  ('coordenacao_suporte', 'EQUIPMENT', true, true, true, true, true, true, false, false),
  ('rh',                  'EQUIPMENT', true, true, true, false, true, true, false, false)
ON CONFLICT (role, module_key) DO UPDATE
  SET can_access      = EXCLUDED.can_access,
      can_edit        = EXCLUDED.can_edit,
      can_create      = EXCLUDED.can_create,
      can_delete      = EXCLUDED.can_delete,
      can_export      = EXCLUDED.can_export,
      can_view_values = EXCLUDED.can_view_values;

-- Submódulo de requisição
INSERT INTO public.role_module_permissions
  (role, module_key, can_access, can_edit, can_create, can_delete, can_export, can_view_values, can_view_hr_costs, can_allocate)
VALUES
  ('superadmin',          'EQUIPMENT_REQUESTS', true, true,  true, true,  true,  true,  false, false),
  ('c-level',             'EQUIPMENT_REQUESTS', true, true,  true, true,  true,  true,  false, false),
  ('administrativo',      'EQUIPMENT_REQUESTS', true, true,  true, true,  true,  true,  false, false),
  ('coordenacao_suporte', 'EQUIPMENT_REQUESTS', true, true,  true, true,  true,  true,  false, false),
  ('rh',                  'EQUIPMENT_REQUESTS', true, true,  true, false, true,  true,  false, false),
  ('lider_tribo',         'EQUIPMENT_REQUESTS', true, false, true, false, false, false, false, false),
  -- Head: acessa e cria a própria requisição. Não edita alheia, não exclui,
  -- não exporta, não vê valores.
  ('head',                'EQUIPMENT_REQUESTS', true, false, true, false, false, false, false, false)
ON CONFLICT (role, module_key) DO UPDATE
  SET can_access      = EXCLUDED.can_access,
      can_edit        = EXCLUDED.can_edit,
      can_create      = EXCLUDED.can_create,
      can_delete      = EXCLUDED.can_delete,
      can_export      = EXCLUDED.can_export,
      can_view_values = EXCLUDED.can_view_values;

-- ---------------------------------------------------------------------------
-- 3. Garantia de que o Head não herda nada além disso
-- ---------------------------------------------------------------------------
-- Fecha explicitamente qualquer outro módulo para o perfil head. Sem isto, a
-- ausência de linha é interpretada como padrão do perfil pelo front — e o
-- padrão, para perfis não mapeados, é liberar tudo.

INSERT INTO public.role_module_permissions (role, module_key, can_access)
SELECT 'head', m.module_key, false
FROM (
  SELECT DISTINCT module_key FROM public.role_module_permissions
) m
WHERE m.module_key <> 'EQUIPMENT_REQUESTS'
ON CONFLICT (role, module_key) DO NOTHING;
