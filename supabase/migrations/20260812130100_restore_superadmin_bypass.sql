-- Restaura o bypass de superadmin em has_role / has_any_role
--
-- POR QUE ESTA MIGRATION EXISTE
-- A migration 20260727213000_force_superadmin_full_access.sql redefiniu as duas
-- funções para que 'superadmin' sempre passe em qualquer checagem de papel.
-- Nenhuma migration posterior as altera. Ainda assim, em 12/08 o Superadmin
-- recebeu "new row violates row-level security policy" ao anexar documento em
-- contrato — o que só acontece se a versão viva no banco NÃO tem o bypass.
--
-- Duas explicações possíveis, ambas resolvidas por esta migration:
--   a) a migration de 27/07 nunca foi aplicada (o checklist só registra as de
--      06/08 como aplicadas);
--   b) o Lovable sobrescreveu as funções — o risco B4 do checklist.
--
-- POR QUE ISSO IMPORTA MAIS QUE O CASO DOS DOCUMENTOS
-- Há 65 policies de escrita, em 28 tabelas, cujas listas literais de perfil não
-- mencionam 'superadmin'. Todas dependem destas duas funções para o Superadmin
-- passar. Uma única sobrescrita derruba as 65 de uma vez — é a causa comum dos
-- itens P17 a P22 do checklist, que "voltam" periodicamente.
--
-- ⚠️ EFEITO: superadmin passa a satisfazer QUALQUER checagem de papel, inclusive
-- as de visualização de valores financeiros e custos de RH. É o comportamento
-- pretendido em 27/07 ("force full access"), reafirmado aqui de forma explícita.

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

COMMENT ON FUNCTION public.has_role(uuid, public.app_role) IS
  'Checagem de papel. superadmin satisfaz qualquer papel (ver 20260727213000 e 20260812130100). Se esta linha desaparecer, o Lovable sobrescreveu a função — reaplicar.';

COMMENT ON FUNCTION public.has_any_role(uuid, public.app_role[]) IS
  'Checagem de papel em lista. superadmin satisfaz qualquer lista (ver 20260727213000 e 20260812130100). Se esta linha desaparecer, o Lovable sobrescreveu a função — reaplicar.';

-- Reafirma a matriz de módulos do superadmin, incluindo os módulos criados
-- depois de 27/07 (Equipamentos entre eles).
INSERT INTO public.role_module_permissions (
  role, module_key, can_access, can_edit, can_create, can_delete,
  can_export, can_view_values, can_view_hr_costs, can_allocate
)
SELECT 'superadmin', m.module_key, true, true, true, true, true, true, true, true
  FROM (SELECT DISTINCT module_key FROM public.role_module_permissions) m
ON CONFLICT (role, module_key) DO UPDATE SET
  can_access        = true,
  can_edit          = true,
  can_create        = true,
  can_delete        = true,
  can_export        = true,
  can_view_values   = true,
  can_view_hr_costs = true,
  can_allocate      = true;
