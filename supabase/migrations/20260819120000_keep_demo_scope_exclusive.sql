-- Mantem a visao demo exclusiva do perfil Demo.
--
-- Contexto: o bypass global de Superadmin em has_role/has_any_role fazia o
-- Superadmin satisfazer tambem has_role(..., 'demo'). Como varias policies RLS
-- usam esse teste para entregar apenas registros is_demo = true, o Superadmin
-- acabava preso na base de demonstracao.
--
-- Regra corrigida:
-- - Demo continua vendo apenas dados demo nas policies que usam has_role('demo').
-- - Superadmin continua passando por qualquer papel operacional.
-- - Superadmin nao passa por checagem exclusiva de Demo.

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
       AND (
         role = _role
         OR (
           role = 'superadmin'::public.app_role
           AND _role <> 'demo'::public.app_role
         )
       )
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
       AND (
         role = ANY(_roles)
         OR (
           role = 'superadmin'::public.app_role
           AND EXISTS (
             SELECT 1
               FROM unnest(_roles) AS roles(allowed_role)
              WHERE allowed_role <> 'demo'::public.app_role
           )
         )
       )
  )
$$;

COMMENT ON FUNCTION public.has_role(uuid, public.app_role) IS
  'Checagem de papel. Superadmin satisfaz qualquer papel operacional, exceto demo, que permanece exclusivo do perfil Demo.';

COMMENT ON FUNCTION public.has_any_role(uuid, public.app_role[]) IS
  'Checagem de papeis. Superadmin satisfaz listas com qualquer papel operacional, mas nao listas exclusivamente demo.';
