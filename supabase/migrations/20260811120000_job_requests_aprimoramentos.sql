-- Aprimoramentos do módulo de Requisição de Vagas (08/2026)
-- 1) Campos novos da requisição
-- 2) Reposição automática passa a considerar alocações de subprojeto
-- 3) Leitura de reposições liberada para Administrativo e Líder de Tribo

-- ============================================================
-- 1) CAMPOS NOVOS EM job_requests
-- ============================================================

ALTER TABLE public.job_requests
  ADD COLUMN IF NOT EXISTS prazo_contratacao   text,
  ADD COLUMN IF NOT EXISTS motivo_abertura     text,
  ADD COLUMN IF NOT EXISTS valor_previsto      numeric(12,2),
  ADD COLUMN IF NOT EXISTS formacao_requerida  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS formacao_detalhe    text,
  ADD COLUMN IF NOT EXISTS area_atuacao        text,
  ADD COLUMN IF NOT EXISTS regime_contratacao  text,
  ADD COLUMN IF NOT EXISTS diferenciais        text,
  ADD COLUMN IF NOT EXISTS equipamento_bnp     boolean;

COMMENT ON COLUMN public.job_requests.prazo_contratacao  IS 'planejado | urgente';
COMMENT ON COLUMN public.job_requests.motivo_abertura    IS 'reposicao | nova_funcao | aumento_quadro';
COMMENT ON COLUMN public.job_requests.valor_previsto     IS 'Budget previsto. Visivel apenas a c-level, administrativo, rh e superadmin.';
COMMENT ON COLUMN public.job_requests.regime_contratacao IS 'clt | pj | cooperado | socio | estagio — mesmos valores de hr_people.tipo_vinculo';
COMMENT ON COLUMN public.job_requests.equipamento_bnp    IS 'true = equipamento fornecido pela BNP';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_requests_prazo_contratacao_check') THEN
    ALTER TABLE public.job_requests ADD CONSTRAINT job_requests_prazo_contratacao_check
      CHECK (prazo_contratacao IS NULL OR prazo_contratacao IN ('planejado', 'urgente'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_requests_motivo_abertura_check') THEN
    ALTER TABLE public.job_requests ADD CONSTRAINT job_requests_motivo_abertura_check
      CHECK (motivo_abertura IS NULL OR motivo_abertura IN ('reposicao', 'nova_funcao', 'aumento_quadro'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_requests_regime_contratacao_check') THEN
    ALTER TABLE public.job_requests ADD CONSTRAINT job_requests_regime_contratacao_check
      CHECK (regime_contratacao IS NULL OR regime_contratacao IN ('clt', 'pj', 'cooperado', 'socio', 'estagio'));
  END IF;
END $$;

-- ============================================================
-- 2) REPOSIÇÃO: passa a cobrir alocações de subprojeto
-- ------------------------------------------------------------
-- O gatilho anterior montava as pendências lendo apenas `resources`.
-- Quem estava alocado somente via `subproject_allocations` era desligado
-- sem gerar nenhuma reposição, silenciosamente — causa raiz do relato
-- "desliguei e a vaga não apareceu".
-- ============================================================

-- resource_id deixa de ser obrigatório: a pendência pode vir de um subprojeto.
ALTER TABLE public.pending_replacements
  ALTER COLUMN resource_id DROP NOT NULL;

ALTER TABLE public.pending_replacements
  ADD COLUMN IF NOT EXISTS subproject_allocation_id uuid
    REFERENCES public.subproject_allocations(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.pending_replacements.subproject_allocation_id
  IS 'Preenchido quando a pendencia vem de uma alocacao de subprojeto em vez de um resource direto.';

-- Garante que a pendência sempre aponte para uma das duas origens.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pending_replacements_origem_check') THEN
    ALTER TABLE public.pending_replacements ADD CONSTRAINT pending_replacements_origem_check
      CHECK (resource_id IS NOT NULL OR subproject_allocation_id IS NOT NULL);
  END IF;
END $$;

-- O índice antigo não protege linhas de subprojeto (resource_id NULL nunca
-- colide com NULL). Um índice próprio cobre esse caso.
CREATE UNIQUE INDEX IF NOT EXISTS pending_replacements_one_pending_per_suballoc
  ON public.pending_replacements (hr_person_id, subproject_allocation_id)
  WHERE status = 'pending' AND subproject_allocation_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_pending_replacements_on_termination()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (COALESCE(OLD.situacao, '') = 'ativo' AND NEW.situacao = 'inativo') THEN

    -- (a) Alocações diretas no contrato
    INSERT INTO public.pending_replacements (hr_person_id, resource_id, contract_id, status)
    SELECT NEW.id, r.id, r.contract_id, 'pending'
    FROM public.resources r
    WHERE r.hr_person_id = NEW.id
      AND NOT EXISTS (
        SELECT 1 FROM public.pending_replacements pr
        WHERE pr.hr_person_id = NEW.id
          AND pr.resource_id = r.id
          AND pr.status = 'pending'
      );

    -- (b) Alocações em subprojetos — o contrato vem do subprojeto.
    --     Subprojeto encerrado é ignorado: aquela frente não existe mais.
    INSERT INTO public.pending_replacements
      (hr_person_id, subproject_allocation_id, contract_id, status)
    SELECT NEW.id, sa.id, cs.contract_id, 'pending'
    FROM public.subproject_allocations sa
    JOIN public.contract_subprojects cs ON cs.id = sa.subproject_id
    WHERE sa.hr_person_id = NEW.id
      AND cs.status <> 'encerrado'
      AND NOT EXISTS (
        SELECT 1 FROM public.pending_replacements pr
        WHERE pr.hr_person_id = NEW.id
          AND pr.subproject_allocation_id = sa.id
          AND pr.status = 'pending'
      );

  END IF;

  RETURN NEW;
END $$;

-- ============================================================
-- 3) RLS: Administrativo e Líder de Tribo passam a LER as reposições
-- ------------------------------------------------------------
-- Ambos podem desligar/acompanhar pessoas, mas não enxergavam as pendências
-- geradas — a tela de Vagas mostrava lista vazia sem qualquer aviso.
-- A escrita (resolver/remover) continua restrita.
-- ============================================================

DROP POLICY IF EXISTS "pending_replacements_select" ON public.pending_replacements;
CREATE POLICY "pending_replacements_select" ON public.pending_replacements
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY[
    'c-level', 'rh', 'intermediario', 'superadmin', 'administrativo', 'lider_tribo'
  ]::app_role[]));
