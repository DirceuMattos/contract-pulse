-- I7 HEs: trava anti-duplicação de lançamentos (versão corrigida).
-- to_char não é imutável (depende de locale) -> não pode em coluna gerada.
-- Usa conversão numérica direta (::text via round), que é imutável.
-- Permite vários lançamentos por colaborador/mês (valores/horas diferentes),
-- mas impede reimportar a MESMA linha. 2026-07-30

-- Se a coluna foi criada parcialmente numa tentativa anterior, remove antes.
ALTER TABLE public.overtime_entries DROP COLUMN IF EXISTS dedup_key;

ALTER TABLE public.overtime_entries
  ADD COLUMN dedup_key text GENERATED ALWAYS AS (
    coalesce(hr_person_id::text, lower(colaborador_nome)) || '|' ||
    mes::text || '|' || ano::text || '|' ||
    round(valor, 2)::text || '|' ||
    round(horas, 2)::text || '|' ||
    coalesce(origem, 'manual')
  ) STORED;

-- Remove eventuais duplicatas já existentes antes do índice único (mantém a mais antiga).
DELETE FROM public.overtime_entries a
 USING public.overtime_entries b
 WHERE a.dedup_key = b.dedup_key
   AND a.created_at > b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS uq_overtime_dedup
  ON public.overtime_entries(dedup_key);
