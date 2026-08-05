-- Fix I1: a RPC recebia app_role[] e o PostgREST falhava ao castar text[]->app_role[]
-- na chamada do frontend (erro silencioso, nada era gravado). Agora recebe text[]
-- e converte internamente para app_role[]. Idempotente (CREATE OR REPLACE).
-- 2026-07-29

CREATE OR REPLACE FUNCTION public.notify_roles_and_users(
  _roles       text[],
  _extra_users uuid[],
  _tipo        text,
  _titulo      text,
  _mensagem    text,
  _link        text,
  _entidade    text,
  _entidade_id uuid
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer;
  _role_enums public.app_role[];
BEGIN
  -- converte os nomes de role (text) para o enum app_role
  SELECT array_agg(r::public.app_role) INTO _role_enums
  FROM unnest(_roles) AS r;

  WITH alvo AS (
    SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = ANY(_role_enums)
    UNION
    SELECT unnest(_extra_users) AS user_id
  ), validos AS (
    SELECT DISTINCT user_id FROM alvo WHERE user_id IS NOT NULL
  )
  INSERT INTO public.notifications (user_id, tipo, titulo, mensagem, link, entidade, entidade_id)
  SELECT user_id, _tipo, _titulo, _mensagem, _link, _entidade, _entidade_id FROM validos;

  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;

-- Remove a versão antiga (app_role[]) para evitar ambiguidade de sobrecarga.
DROP FUNCTION IF EXISTS public.notify_roles_and_users(
  public.app_role[], uuid[], text, text, text, text, text, uuid
);

-- Segurança: função SECURITY DEFINER não deve ser executável por public/anon.
REVOKE EXECUTE ON FUNCTION public.notify_roles_and_users(
  text[], uuid[], text, text, text, text, text, uuid
) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.notify_roles_and_users(
  text[], uuid[], text, text, text, text, text, uuid
) TO authenticated;
