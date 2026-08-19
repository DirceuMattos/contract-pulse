-- Cria perfil pelo Gerenciador de Perfis.
--
-- Esta funcao cria o cadastro do perfil e sua matriz de permissoes. O campo
-- role permanece text nas tabelas role_profiles/role_module_permissions, por
-- isso a criacao pode acontecer de forma segura pela tela.

CREATE OR REPLACE FUNCTION public.create_role_profile(
  _role text,
  _label text,
  _description text DEFAULT NULL,
  _copy_from text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _clean_role text;
  _affected integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'superadmin'::public.app_role) THEN
    RAISE EXCEPTION 'Apenas Super Admin pode criar perfis';
  END IF;

  _clean_role := lower(trim(_role));

  IF _clean_role IS NULL OR _clean_role = '' OR _clean_role !~ '^[a-z0-9_]{3,40}$' THEN
    RAISE EXCEPTION 'Chave tecnica do perfil invalida';
  END IF;

  IF _label IS NULL OR length(trim(_label)) < 3 THEN
    RAISE EXCEPTION 'Nome do perfil deve ter pelo menos 3 caracteres';
  END IF;

  IF EXISTS (SELECT 1 FROM public.role_profiles WHERE role = _clean_role) THEN
    RAISE EXCEPTION 'Ja existe um perfil com a chave %', _clean_role;
  END IF;

  IF _copy_from IS NOT NULL AND _copy_from <> '' AND NOT EXISTS (
    SELECT 1 FROM public.role_profiles WHERE role = _copy_from
  ) THEN
    RAISE EXCEPTION 'Perfil de origem % nao existe', _copy_from;
  END IF;

  INSERT INTO public.role_profiles (
    role,
    label,
    description,
    modules,
    active,
    is_system,
    updated_by
  )
  VALUES (
    _clean_role,
    trim(_label),
    NULLIF(trim(COALESCE(_description, '')), ''),
    '[]'::jsonb,
    true,
    false,
    auth.uid()
  );

  IF _copy_from IS NOT NULL AND _copy_from <> '' THEN
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
      can_allocate,
      updated_by
    )
    SELECT
      _clean_role,
      module_key,
      can_access,
      can_edit,
      can_create,
      can_delete,
      can_export,
      can_view_values,
      can_view_hr_costs,
      can_allocate,
      auth.uid()
    FROM public.role_module_permissions
    WHERE role = _copy_from;

    GET DIAGNOSTICS _affected = ROW_COUNT;

    UPDATE public.role_profiles
       SET modules = COALESCE((
             SELECT jsonb_agg(module_key ORDER BY module_key)
               FROM public.role_module_permissions
              WHERE role = _clean_role AND can_access
           ), '[]'::jsonb),
           updated_by = auth.uid()
     WHERE role = _clean_role;
  END IF;

  RETURN _affected;
END;
$$;

REVOKE ALL ON FUNCTION public.create_role_profile(text, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.create_role_profile(text, text, text, text) TO authenticated;
