-- Correções de segurança apontadas pelo linter do Supabase. 2026-08-01

-- Alerta "Function Search Path Mutable": fixa o search_path da função de trigger.
CREATE OR REPLACE FUNCTION public.set_updated_at_overtime()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Alerta "Public Can Execute SECURITY DEFINER Function": a RPC notify_roles_and_users
-- roda com privilégios elevados (insere notificações para outros usuários) e não deve
-- ser executável por 'public'. Revoga de public/anon e concede só a authenticated.
REVOKE EXECUTE ON FUNCTION public.notify_roles_and_users(
  text[], uuid[], text, text, text, text, text, uuid
) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.notify_roles_and_users(
  text[], uuid[], text, text, text, text, text, uuid
) TO authenticated;
