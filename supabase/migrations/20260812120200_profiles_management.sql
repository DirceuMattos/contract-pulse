-- I11 — Gestão de Perfis: ativar/inativar e copiar direitos (caminho B)
--
-- Reaproveita role_profiles, que já é o registro de perfis do HUB e já usa
-- `role` como text. Não cria tabela nova.
--
-- O que este arquivo NÃO faz, de propósito: alterar o enum app_role em runtime.
-- A criação de perfil pela tela gera o trecho de migration para ser aplicado
-- de forma versionada — ver §"criar perfil" no plano.

-- ---------------------------------------------------------------------------
-- 1. Colunas de ciclo de vida do perfil
-- ---------------------------------------------------------------------------

ALTER TABLE public.role_profiles
  ADD COLUMN IF NOT EXISTS active      boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_system   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS description text;

-- Perfis que não podem ser inativados: sem eles ninguém administra o sistema.
UPDATE public.role_profiles
   SET is_system = true
 WHERE role IN ('superadmin', 'c-level');

COMMENT ON COLUMN public.role_profiles.active IS
  'Perfil inativo some do seletor de usuários e perde acesso aos módulos. Não apaga nada.';
COMMENT ON COLUMN public.role_profiles.is_system IS
  'Perfil estrutural: não pode ser inativado nem excluído.';

-- ---------------------------------------------------------------------------
-- 2. Pré-visualização da cópia de direitos
-- ---------------------------------------------------------------------------
-- Devolve, módulo a módulo, o que mudaria se a cópia fosse aplicada.
-- Copiar permissão às cegas é como se cria acesso indevido sem ninguém notar.

CREATE OR REPLACE FUNCTION public.preview_copy_role_permissions(
  _source_role text,
  _target_role text
)
RETURNS TABLE (
  module_key        text,
  current_access    boolean,
  new_access        boolean,
  current_flags     jsonb,
  new_flags         jsonb,
  change            text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH src AS (
    SELECT * FROM public.role_module_permissions WHERE role = _source_role
  ),
  tgt AS (
    SELECT * FROM public.role_module_permissions WHERE role = _target_role
  )
  SELECT
    COALESCE(s.module_key, t.module_key)                       AS module_key,
    COALESCE(t.can_access, false)                              AS current_access,
    COALESCE(s.can_access, false)                              AS new_access,
    jsonb_build_object(
      'can_edit',          COALESCE(t.can_edit, false),
      'can_create',        COALESCE(t.can_create, false),
      'can_delete',        COALESCE(t.can_delete, false),
      'can_export',        COALESCE(t.can_export, false),
      'can_view_values',   COALESCE(t.can_view_values, false),
      'can_view_hr_costs', COALESCE(t.can_view_hr_costs, false),
      'can_allocate',      COALESCE(t.can_allocate, false)
    )                                                          AS current_flags,
    jsonb_build_object(
      'can_edit',          COALESCE(s.can_edit, false),
      'can_create',        COALESCE(s.can_create, false),
      'can_delete',        COALESCE(s.can_delete, false),
      'can_export',        COALESCE(s.can_export, false),
      'can_view_values',   COALESCE(s.can_view_values, false),
      'can_view_hr_costs', COALESCE(s.can_view_hr_costs, false),
      'can_allocate',      COALESCE(s.can_allocate, false)
    )                                                          AS new_flags,
    CASE
      WHEN COALESCE(s.can_access, false) AND NOT COALESCE(t.can_access, false) THEN 'ganha_acesso'
      WHEN NOT COALESCE(s.can_access, false) AND COALESCE(t.can_access, false) THEN 'perde_acesso'
      -- Sem acesso nos dois lados: as flags de ação são irrelevantes.
      WHEN NOT COALESCE(s.can_access, false) AND NOT COALESCE(t.can_access, false) THEN 'sem_mudanca'
      WHEN (COALESCE(s.can_edit, false), COALESCE(s.can_create, false), COALESCE(s.can_delete, false),
            COALESCE(s.can_export, false), COALESCE(s.can_view_values, false),
            COALESCE(s.can_view_hr_costs, false), COALESCE(s.can_allocate, false))
        IS DISTINCT FROM
           (COALESCE(t.can_edit, false), COALESCE(t.can_create, false), COALESCE(t.can_delete, false),
            COALESCE(t.can_export, false), COALESCE(t.can_view_values, false),
            COALESCE(t.can_view_hr_costs, false), COALESCE(t.can_allocate, false))
        THEN 'altera_acoes'
      ELSE 'sem_mudanca'
    END                                                        AS change
  FROM src s
  FULL OUTER JOIN tgt t ON t.module_key = s.module_key
  ORDER BY 1;
$$;

REVOKE ALL ON FUNCTION public.preview_copy_role_permissions(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.preview_copy_role_permissions(text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Cópia de direitos
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.copy_role_permissions(
  _source_role text,
  _target_role text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _affected integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'superadmin'::app_role) THEN
    RAISE EXCEPTION 'Apenas Super Admin pode copiar direitos entre perfis';
  END IF;

  IF _source_role = _target_role THEN
    RAISE EXCEPTION 'Perfil de origem e destino são o mesmo';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.role_profiles WHERE role = _source_role) THEN
    RAISE EXCEPTION 'Perfil de origem % não existe', _source_role;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.role_profiles WHERE role = _target_role) THEN
    RAISE EXCEPTION 'Perfil de destino % não existe', _target_role;
  END IF;

  INSERT INTO public.role_module_permissions AS rmp (
    role, module_key, can_access, can_edit, can_create, can_delete,
    can_export, can_view_values, can_view_hr_costs, can_allocate, updated_by
  )
  SELECT
    _target_role, s.module_key, s.can_access, s.can_edit, s.can_create, s.can_delete,
    s.can_export, s.can_view_values, s.can_view_hr_costs, s.can_allocate, auth.uid()
  FROM public.role_module_permissions s
  WHERE s.role = _source_role
  ON CONFLICT (role, module_key) DO UPDATE
    SET can_access        = EXCLUDED.can_access,
        can_edit          = EXCLUDED.can_edit,
        can_create        = EXCLUDED.can_create,
        can_delete        = EXCLUDED.can_delete,
        can_export        = EXCLUDED.can_export,
        can_view_values   = EXCLUDED.can_view_values,
        can_view_hr_costs = EXCLUDED.can_view_hr_costs,
        can_allocate      = EXCLUDED.can_allocate,
        updated_by        = auth.uid(),
        updated_at        = now();

  GET DIAGNOSTICS _affected = ROW_COUNT;

  -- Mantém role_profiles.modules coerente com a camada de módulos.
  UPDATE public.role_profiles t
     SET modules = COALESCE((
           SELECT jsonb_agg(rmp.module_key ORDER BY rmp.module_key)
             FROM public.role_module_permissions rmp
            WHERE rmp.role = _target_role AND rmp.can_access
         ), '[]'::jsonb),
         updated_by = auth.uid()
   WHERE t.role = _target_role;

  RETURN _affected;
END;
$$;

REVOKE ALL ON FUNCTION public.copy_role_permissions(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.copy_role_permissions(text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Ativar / inativar perfil
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_profile_active(
  _role   text,
  _active boolean
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_system  boolean;
  _user_count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'superadmin'::app_role) THEN
    RAISE EXCEPTION 'Apenas Super Admin pode ativar ou inativar perfis';
  END IF;

  SELECT is_system INTO _is_system
    FROM public.role_profiles WHERE role = _role;

  IF _is_system IS NULL THEN
    RAISE EXCEPTION 'Perfil % não existe', _role;
  END IF;

  IF _is_system AND NOT _active THEN
    RAISE EXCEPTION 'O perfil % é estrutural e não pode ser inativado', _role;
  END IF;

  -- Trava de segurança: nunca deixar o sistema sem perfil administrativo ativo.
  IF NOT _active AND NOT EXISTS (
    SELECT 1
      FROM public.role_profiles rp
      JOIN public.role_module_permissions rmp
        ON rmp.role = rp.role AND rmp.module_key = 'PROFILES_ADMIN' AND rmp.can_access
     WHERE rp.active AND rp.role <> _role
  ) THEN
    RAISE EXCEPTION 'Não é possível inativar %: seria o último perfil com acesso administrativo', _role;
  END IF;

  UPDATE public.role_profiles
     SET active = _active, updated_by = auth.uid()
   WHERE role = _role;

  SELECT count(*) INTO _user_count
    FROM public.user_roles
   WHERE role::text = _role;

  -- Devolve quantos usuários são afetados, para a tela avisar antes/depois.
  RETURN _user_count;
END;
$$;

REVOKE ALL ON FUNCTION public.set_profile_active(text, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.set_profile_active(text, boolean) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. Perfil inativo perde acesso aos módulos
-- ---------------------------------------------------------------------------
-- Falha em modo seguro: só nega quando existe linha explícita com active=false.
-- Perfil sem linha em role_profiles continua funcionando como hoje.

CREATE OR REPLACE FUNCTION public.is_profile_active(_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.role_profiles
     WHERE role = _role AND active = false
  );
$$;

REVOKE ALL ON FUNCTION public.is_profile_active(text) FROM public;
GRANT EXECUTE ON FUNCTION public.is_profile_active(text) TO authenticated;
