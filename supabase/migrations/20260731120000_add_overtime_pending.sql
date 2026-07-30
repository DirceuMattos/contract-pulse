-- I7 HEs: pendências persistentes de import (nomes que não casaram).
-- Sobrevivem a fechar/reabrir; resolvidas assincronamente na aba "Pendências".
-- 2026-07-31

CREATE TABLE IF NOT EXISTS public.overtime_pending (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_nome  text NOT NULL,          -- nome como veio na origem
  mes               smallint NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano               smallint NOT NULL,
  valor             numeric(14,2) NOT NULL DEFAULT 0,
  horas             numeric(10,2) NOT NULL DEFAULT 0,
  regime_hint       text,
  area_hint         text,
  origem            text NOT NULL DEFAULT 'import_excel',
  status            text NOT NULL DEFAULT 'pendente',  -- 'pendente' | 'resolvida' | 'ignorada'
  resolved_entry_id uuid REFERENCES public.overtime_entries(id) ON DELETE SET NULL,
  resolved_by       uuid,
  resolved_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Dedup: mesma linha de origem não gera pendência repetida em reuploads.
ALTER TABLE public.overtime_pending
  ADD COLUMN IF NOT EXISTS dedup_key text GENERATED ALWAYS AS (
    lower(colaborador_nome) || '|' || mes::text || '|' || ano::text || '|' ||
    round(valor, 2)::text || '|' || round(horas, 2)::text || '|' || coalesce(origem, 'import_excel')
  ) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS uq_overtime_pending_dedup ON public.overtime_pending(dedup_key);
CREATE INDEX IF NOT EXISTS idx_overtime_pending_status ON public.overtime_pending(status);

-- RLS: leitura para os perfis do módulo; resolução só RH/administrativo/superadmin.
ALTER TABLE public.overtime_pending ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS otp_select ON public.overtime_pending;
CREATE POLICY otp_select ON public.overtime_pending FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['c-level','administrativo','rh','superadmin']::public.app_role[]));

DROP POLICY IF EXISTS otp_insert ON public.overtime_pending;
CREATE POLICY otp_insert ON public.overtime_pending FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['c-level','administrativo','rh','superadmin']::public.app_role[]));

DROP POLICY IF EXISTS otp_update ON public.overtime_pending;
CREATE POLICY otp_update ON public.overtime_pending FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['administrativo','rh','superadmin']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['administrativo','rh','superadmin']::public.app_role[]));

DROP POLICY IF EXISTS otp_delete ON public.overtime_pending;
CREATE POLICY otp_delete ON public.overtime_pending FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['administrativo','rh','superadmin']::public.app_role[]));
