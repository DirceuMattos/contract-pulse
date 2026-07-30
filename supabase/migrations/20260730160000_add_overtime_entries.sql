-- I7 Módulo Horas Extras (HEs) — tabela de lançamentos + RLS + RPCs de agregação.
-- Espelha o padrão do Adm Deslocamento (transport_rides). 2026-07-30
-- Granularidade: 1 linha por lançamento (permite vários por colaborador/mês).
-- regime e area são SNAPSHOT (congelados no lançamento).

-- ── Tabela ──
CREATE TABLE IF NOT EXISTS public.overtime_entries (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hr_person_id      uuid REFERENCES public.hr_people(id) ON DELETE SET NULL,
  colaborador_nome  text NOT NULL,              -- nome como veio na origem
  mes               smallint NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano               smallint NOT NULL,
  regime            text,                        -- snapshot: clt/pj/cooperado/socio/estagio
  area              text,                        -- snapshot: nome da área (team)
  area_team_id      uuid,                        -- snapshot do team_id
  valor             numeric(14,2) NOT NULL DEFAULT 0,
  horas             numeric(10,2) NOT NULL DEFAULT 0,   -- horas decimais (26:30 -> 26.50)
  ocorrencias       integer NOT NULL DEFAULT 1,
  historico         text,
  origem            text NOT NULL DEFAULT 'manual',     -- 'manual' | 'import_excel'
  status            text NOT NULL DEFAULT 'confirmado',  -- 'confirmado' | 'pendente_match'
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_overtime_ano_mes ON public.overtime_entries(ano, mes);
CREATE INDEX IF NOT EXISTS idx_overtime_person ON public.overtime_entries(hr_person_id);

-- trigger updated_at (usa a convenção do projeto se existir; senão cria)
CREATE OR REPLACE FUNCTION public.set_updated_at_overtime()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_overtime_updated_at ON public.overtime_entries;
CREATE TRIGGER trg_overtime_updated_at BEFORE UPDATE ON public.overtime_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_overtime();

-- ── RLS ── (leitura financeiro/RH/admin/c-level/superadmin; escrita idem sem leitor)
ALTER TABLE public.overtime_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS overtime_select ON public.overtime_entries;
CREATE POLICY overtime_select ON public.overtime_entries FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY[
    'c-level','administrativo','rh','superadmin'
  ]::public.app_role[]));

DROP POLICY IF EXISTS overtime_insert ON public.overtime_entries;
CREATE POLICY overtime_insert ON public.overtime_entries FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY[
    'c-level','administrativo','rh','superadmin'
  ]::public.app_role[]));

DROP POLICY IF EXISTS overtime_update ON public.overtime_entries;
CREATE POLICY overtime_update ON public.overtime_entries FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY[
    'c-level','administrativo','rh','superadmin'
  ]::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY[
    'c-level','administrativo','rh','superadmin'
  ]::public.app_role[]));

DROP POLICY IF EXISTS overtime_delete ON public.overtime_entries;
CREATE POLICY overtime_delete ON public.overtime_entries FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY[
    'c-level','administrativo','superadmin'
  ]::public.app_role[]));

-- ── RPCs de agregação (contornam limite de paginação, como no transporte) ──
-- Anos distintos com lançamentos.
CREATE OR REPLACE FUNCTION public.get_overtime_years()
RETURNS TABLE(ano smallint)
LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$
  SELECT DISTINCT ano FROM public.overtime_entries ORDER BY ano;
$$;

-- Totais por ano/mês (valor e horas) para o gráfico comparativo anual.
CREATE OR REPLACE FUNCTION public.get_overtime_yearly_totals()
RETURNS TABLE(ano smallint, mes smallint, total_valor numeric, total_horas numeric)
LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$
  SELECT ano, mes, SUM(valor)::numeric, SUM(horas)::numeric
  FROM public.overtime_entries
  GROUP BY ano, mes
  ORDER BY ano, mes;
$$;
