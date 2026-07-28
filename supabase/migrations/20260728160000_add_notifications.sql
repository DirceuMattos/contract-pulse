-- I1: Notificações in-app persistidas (canal de comunicação — vagas e futuros).
-- Tabela + RLS (cada um lê as suas) + realtime + helper de fan-out por roles/usuários.
-- 2026-07-28

-- ── Tabela ──
CREATE TABLE IF NOT EXISTS public.notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,              -- destinatário (auth.uid)
  tipo         text NOT NULL,              -- ex.: 'vaga_aberta', 'vaga_status'
  titulo       text NOT NULL,
  mensagem     text,
  link         text,                       -- rota in-app (ex.: '/requisicao-vagas')
  entidade     text,                       -- ex.: 'job_request'
  entidade_id  uuid,                       -- id da vaga
  lida         boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, lida, created_at DESC);

-- ── RLS: cada usuário só enxerga e atualiza (marcar lida) as próprias ──
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY notifications_select ON public.notifications
    FOR SELECT TO authenticated USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY notifications_update_own ON public.notifications
    FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Sem policy de INSERT para usuários: notificações são criadas via helper
-- SECURITY DEFINER (abaixo), nunca escritas diretamente pelo cliente.

-- ── Helper: cria a MESMA notificação para todos os usuários com os roles dados
-- (deduplicando) + uma lista extra de user_ids (ex.: o próprio solicitante). ──
CREATE OR REPLACE FUNCTION public.notify_roles_and_users(
  _roles      public.app_role[],
  _extra_users uuid[],
  _tipo       text,
  _titulo     text,
  _mensagem   text,
  _link       text,
  _entidade   text,
  _entidade_id uuid
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer;
BEGIN
  WITH alvo AS (
    SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = ANY(_roles)
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

-- ── Realtime ──
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
