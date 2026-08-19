-- I10 Fase 4 — Devoluções no desligamento (passos 1, 2 e 3)
--
-- Fecha o risco central da §1 do PRD: "há risco de colabs serem desligados e o
-- equipamento não ser devolvido por falta de controle". A Fase 1 deu o
-- inventário; esta faz o sistema avisar sozinho quando alguém sai com
-- equipamento na mão.
--
-- Passos 4 (termo de cessão), 5 (termo de devolução) e 6 (conciliação
-- retroativa) NÃO entram aqui — dependem do modelo real do Termo de
-- Recebimento e Responsabilidade e, no caso da conciliação, da Fase 2.
--
-- Depende de 20260812140000_equipment_core.sql.

-- ---------------------------------------------------------------------------
-- 1. Tipo do desfecho
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE public.equipment_return_status AS ENUM (
    'pending',
    'returned',           -- devolvido em ordem            → item em_estoque
    'returned_damaged',   -- devolvido com avaria          → item em_manutencao
    'lost',               -- extraviado                    → item extraviado
    'not_applicable',     -- cadastro estava errado        → item em_estoque
    'cancelled'           -- pessoa voltou a ativa         → item não se move
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 2. A pendência
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.equipment_return_pendings (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_item_id  uuid NOT NULL REFERENCES public.equipment_items(id) ON DELETE CASCADE,
  person_id          uuid NOT NULL REFERENCES public.hr_people(id) ON DELETE CASCADE,
  termination_date   date,
  status             public.equipment_return_status NOT NULL DEFAULT 'pending',
  resolved_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at        timestamptz,
  notes              text,
  -- Liga o desfecho ao histórico do item. Nulo em 'cancelled': ali o item não move.
  movement_id        uuid REFERENCES public.equipment_movements(id) ON DELETE SET NULL,
  evidence_url       text,
  created_at         timestamptz NOT NULL DEFAULT now(),

  -- Observação obrigatória nos desfechos que afirmam algo sobre o item.
  CONSTRAINT eq_ret_notes_obrigatorio CHECK (
    status NOT IN ('returned_damaged','lost','not_applicable')
    OR (notes IS NOT NULL AND btrim(notes) <> '')
  ),

  -- Pendência aberta não tem desfecho; pendência fechada tem data de desfecho.
  CONSTRAINT eq_ret_resolucao_coerente CHECK (
    (status = 'pending'  AND resolved_at IS NULL)
 OR (status <> 'pending' AND resolved_at IS NOT NULL)
  )
);

-- Idempotência: reprocessar o mesmo desligamento não duplica.
-- Grão = item + pessoa, como em pending_replacements (uma pendência aberta por
-- alocação). Item que trocou de detentor por fora não colide com a pendência
-- antiga — ela fica visível como divergência na view, em vez de ser bloqueada.
CREATE UNIQUE INDEX IF NOT EXISTS eq_ret_one_pending_per_item_person
  ON public.equipment_return_pendings (equipment_item_id, person_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS eq_ret_status_idx  ON public.equipment_return_pendings (status);
CREATE INDEX IF NOT EXISTS eq_ret_person_idx  ON public.equipment_return_pendings (person_id);
CREATE INDEX IF NOT EXISTS eq_ret_item_idx    ON public.equipment_return_pendings (equipment_item_id);

COMMENT ON TABLE public.equipment_return_pendings IS
  'I10 Fase 4 §2. Uma linha por equipamento que precisa voltar por causa de um desligamento. Nasce por gatilho no banco, nunca pela tela.';
COMMENT ON COLUMN public.equipment_return_pendings.movement_id IS
  'Movimentação gerada pelo desfecho. É o que liga a devolução ao histórico do item.';
COMMENT ON COLUMN public.equipment_return_pendings.evidence_url IS
  'Chave no bucket equipment-evidence (privado). Não é URL pública.';

-- ---------------------------------------------------------------------------
-- 3. Gatilho de desligamento — §1
-- ---------------------------------------------------------------------------
-- POR QUE NO BANCO E NÃO NA TELA: o desligamento entra por três vias — edição
-- manual no RH, importação em massa e sync do Feedz. Quando a criação da
-- pendência vivia na tela, as outras duas passavam em silêncio. Foi exatamente
-- o que quebrou a reposição de vagas (ver 20260804180000_trigger_pending_replacements.sql).
--
-- ORDEM DE OPERAÇÕES: o gatilho lê OLD.id e consulta equipment_items ainda
-- dentro da mesma instrução do UPDATE em hr_people — antes de qualquer processo
-- posterior limpar vínculos. Em Vagas a pendência foi anulada porque outro
-- processo rodava antes de consolidar.

CREATE OR REPLACE FUNCTION public.create_equipment_return_pendings_on_termination()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Desligamento: 'ativo' → qualquer outro valor.
  IF COALESCE(OLD.situacao, '') = 'ativo' AND COALESCE(NEW.situacao, '') <> 'ativo' THEN

    INSERT INTO public.equipment_return_pendings
      (equipment_item_id, person_id, termination_date)
    SELECT
      i.id,
      OLD.id,
      COALESCE(NEW.data_desligamento, OLD.data_desligamento, CURRENT_DATE)
    FROM public.equipment_items i
    WHERE i.holder_person_id = OLD.id      -- estado de cessão anterior ao desligamento
      AND i.status = 'cedido'
      AND i.deleted_at IS NULL
      AND NOT EXISTS (                     -- idempotente sem depender do índice
        SELECT 1
          FROM public.equipment_return_pendings p
         WHERE p.equipment_item_id = i.id
           AND p.person_id = OLD.id
           AND p.status = 'pending'
      );

  -- Reativação: qualquer outro valor → 'ativo'. Recontratação e correção de
  -- cadastro errado não devem deixar pendência fantasma na lista.
  ELSIF COALESCE(OLD.situacao, '') <> 'ativo' AND COALESCE(NEW.situacao, '') = 'ativo' THEN

    UPDATE public.equipment_return_pendings
       SET status      = 'cancelled',
           resolved_at = now(),
           resolved_by = auth.uid(),
           notes       = COALESCE(NULLIF(btrim(notes), '') || ' · ', '')
                         || 'Cancelada automaticamente: colaborador voltou a ativo em '
                         || to_char(now(), 'DD/MM/YYYY HH24:MI')
     WHERE person_id = NEW.id
       AND status = 'pending';

  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_equipment_return_pendings ON public.hr_people;
CREATE TRIGGER trg_equipment_return_pendings
  AFTER UPDATE OF situacao ON public.hr_people
  FOR EACH ROW
  EXECUTE FUNCTION public.create_equipment_return_pendings_on_termination();

-- Detector anti-sobrescrita (risco B4): se o Lovable regerar hr_people e o
-- gatilho desaparecer, as pendências param de nascer em silêncio. O COMMENT é
-- o marcador que a consulta de conferência do runbook procura — ver §8.
COMMENT ON TRIGGER trg_equipment_return_pendings ON public.hr_people IS
  'I10-FASE4-GATILHO-DEVOLUCAO v1. Cria equipment_return_pendings em ativo→inativo e cancela em inativo→ativo. Se este comentário ou o gatilho desaparecerem, as devoluções pendentes param de nascer sem aviso.';

-- ---------------------------------------------------------------------------
-- 4. Prazo de alerta configurável — decisão 2 do escopo (sugestão: 15 dias)
-- ---------------------------------------------------------------------------

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS dias_alerta_devolucao integer NOT NULL DEFAULT 15;

COMMENT ON COLUMN public.settings.dias_alerta_devolucao IS
  'Dias em aberto a partir dos quais a devolução pendente é destacada em vermelho.';

-- ---------------------------------------------------------------------------
-- 5. Resolução do desfecho — §2, ligada a register_equipment_movement()
-- ---------------------------------------------------------------------------
-- O desfecho não é rótulo: move o item e registra no histórico. Toda transição
-- passa por register_equipment_movement(), então nenhuma resolução escapa.
--
-- Mapa desfecho → destino do item:
--   returned         → em_estoque    (holder estoque)     · exige conferência de SN/patrimônio
--   returned_damaged → em_manutencao (holder estoque)     · exige observação; evidência recomendada
--   lost             → extraviado    (holder SEGUE a pessoa) · exige observação
--   not_applicable   → em_estoque    (holder estoque)     · exige observação
--
-- Em 'lost' o detentor continua sendo a pessoa de propósito: é a verdade
-- (o item está com quem saiu) e mantém alerta_colaborador_inativo aceso na
-- lista de inventário, deixando o passivo visível. A baixa por perda segue
-- sendo ato separado, com alçada própria, feito na tela do item.

CREATE OR REPLACE FUNCTION public.resolve_equipment_return_pending(
  _pending_id     uuid,
  _outcome        public.equipment_return_status,
  _notes          text        DEFAULT NULL,
  _evidence_url   text        DEFAULT NULL,
  _occurred_at    timestamptz DEFAULT NULL,
  _identification text        DEFAULT NULL   -- SN ou patrimônio conferido na devolução
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p    public.equipment_return_pendings%ROWTYPE;
  it   public.equipment_items%ROWTYPE;
  ids  text[];
  dest public.equipment_status;
  dest_holder public.equipment_holder_type;
  dest_person uuid;
  mid  uuid;
BEGIN
  -- SECURITY DEFINER não passa por RLS: a permissão é checada aqui, à mão.
  IF NOT public.can_act_on_equipment('edit') THEN
    RAISE EXCEPTION 'Sem permissão para resolver devoluções de equipamento';
  END IF;

  SELECT * INTO p FROM public.equipment_return_pendings
   WHERE id = _pending_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Devolução pendente não encontrada';
  END IF;
  IF p.status <> 'pending' THEN
    RAISE EXCEPTION 'Esta devolução já foi resolvida (%)', p.status;
  END IF;

  IF _outcome NOT IN ('returned','returned_damaged','lost','not_applicable') THEN
    RAISE EXCEPTION 'Desfecho inválido: %. O cancelamento é automático, na reativação do colaborador', _outcome;
  END IF;

  IF _outcome IN ('returned_damaged','lost','not_applicable')
     AND (_notes IS NULL OR btrim(_notes) = '') THEN
    RAISE EXCEPTION 'Observação é obrigatória neste desfecho';
  END IF;

  SELECT * INTO it FROM public.equipment_items
   WHERE id = p.equipment_item_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Equipamento não encontrado ou excluído — a pendência não pode ser resolvida';
  END IF;

  -- Conferência física na devolução: o que voltou é o que estava cedido.
  IF _outcome = 'returned' THEN
    ids := ARRAY(
      SELECT upper(btrim(v))
        FROM unnest(ARRAY[it.serial_number, it.asset_tag]) AS v
       WHERE v IS NOT NULL AND btrim(v) <> ''
    );
    IF array_length(ids, 1) IS NULL THEN
      -- Item sem SN e sem patrimônio legíveis (a planilha tem casos assim).
      IF _notes IS NULL OR btrim(_notes) = '' THEN
        RAISE EXCEPTION 'Item sem série e sem patrimônio cadastrados: descreva na observação como a identificação foi conferida';
      END IF;
    ELSIF _identification IS NULL
       OR upper(btrim(_identification)) <> ALL (ids) THEN
      RAISE EXCEPTION 'Confira a identificação: o número de série ou patrimônio informado não corresponde ao cadastro deste item';
    END IF;
  END IF;

  -- Destino do item
  IF _outcome = 'returned' OR _outcome = 'not_applicable' THEN
    dest := 'em_estoque';  dest_holder := 'estoque';       dest_person := NULL;
  ELSIF _outcome = 'returned_damaged' THEN
    dest := 'em_manutencao'; dest_holder := 'estoque';     dest_person := NULL;
  ELSE -- lost
    dest := 'extraviado';  dest_holder := 'pessoa';        dest_person := p.person_id;
  END IF;

  mid := public.register_equipment_movement(
    _item_id        => p.equipment_item_id,
    _to_status      => dest,
    _to_holder_type => dest_holder,
    _to_person_id   => dest_person,
    _to_company_id  => NULL,
    _reason         => 'Devolução por desligamento — ' || _outcome::text
                       || COALESCE(': ' || NULLIF(btrim(_notes), ''), ''),
    _occurred_at    => _occurred_at,
    _authorized_by  => auth.uid(),
    _justification  => NULL,
    _evidence_url   => _evidence_url
  );

  UPDATE public.equipment_return_pendings
     SET status       = _outcome,
         notes        = NULLIF(btrim(_notes), ''),
         evidence_url = NULLIF(btrim(_evidence_url), ''),
         movement_id  = mid,
         resolved_by  = auth.uid(),
         resolved_at  = now()
   WHERE id = _pending_id;

  RETURN mid;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_equipment_return_pending(uuid, public.equipment_return_status, text, text, timestamptz, text) FROM public;
GRANT EXECUTE ON FUNCTION public.resolve_equipment_return_pending(uuid, public.equipment_return_status, text, text, timestamptz, text) TO authenticated;

COMMENT ON FUNCTION public.resolve_equipment_return_pending IS
  'I10 Fase 4 §2. Única via de resolução: valida o desfecho, move o item por register_equipment_movement() e grava movement_id. Checa can_act_on_equipment(''edit'') porque é SECURITY DEFINER.';

-- ---------------------------------------------------------------------------
-- 6. RLS — leitura pelo módulo; escrita só pelas funções
-- ---------------------------------------------------------------------------

ALTER TABLE public.equipment_return_pendings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS eq_ret_select ON public.equipment_return_pendings;
CREATE POLICY eq_ret_select ON public.equipment_return_pendings
  FOR SELECT TO authenticated USING (public.can_act_on_equipment('read'));

-- Sem policy de INSERT / UPDATE / DELETE de propósito: a pendência nasce pelo
-- gatilho e morre pela função de resolução, ambos SECURITY DEFINER. Cliente
-- nenhum grava direto — é o que garante que o desfecho sempre gere movimentação.

-- ---------------------------------------------------------------------------
-- 7. Visão da aba "Devoluções Pendentes" — §3
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.equipment_return_pendings_view
WITH (security_invoker = true) AS
SELECT
  r.id,
  r.equipment_item_id,
  r.person_id,
  r.termination_date,
  r.status,
  r.notes,
  r.evidence_url,
  r.movement_id,
  r.resolved_at,
  r.resolved_by,
  r.created_at,

  p.nome        AS person_name,
  p.situacao    AS person_situacao,
  p.team_id,
  t.name        AS team_name,

  i.equipment_type,
  i.manufacturer,
  i.model,
  i.serial_number,
  i.asset_tag,
  i.hostname,
  i.ownership,
  i.rental_monthly_value,
  i.status            AS item_status,
  i.holder_person_id  AS item_holder_person_id,

  -- Dias em aberto: conta do desligamento (ou da criação, se não houver data)
  -- até o desfecho, ou até hoje se ainda estiver aberta.
  GREATEST(
    0,
    COALESCE(r.resolved_at::date, CURRENT_DATE)
      - COALESCE(r.termination_date, r.created_at::date)
  )::integer AS dias_em_aberto,

  -- Item locado: o custo mensal segue correndo enquanto não volta.
  (i.ownership = 'locado') AS alerta_locado,

  -- Item saiu das mãos desta pessoa por fora da aba (movimentação direta).
  -- A pendência continua aberta, mas está desatualizada — precisa de olho
  -- humano em vez de ser resolvida ou cancelada em silêncio.
  (i.holder_person_id IS DISTINCT FROM r.person_id) AS alerta_item_movimentado_por_fora

FROM public.equipment_return_pendings r
JOIN public.hr_people       p ON p.id = r.person_id
LEFT JOIN public.teams      t ON t.id = p.team_id
JOIN public.equipment_items i ON i.id = r.equipment_item_id;

GRANT SELECT ON public.equipment_return_pendings_view TO authenticated;

COMMENT ON VIEW public.equipment_return_pendings_view IS
  'I10 Fase 4 §3. Base da aba de Devoluções Pendentes. security_invoker: respeita a RLS de quem consulta.';

-- ---------------------------------------------------------------------------
-- 8. Bucket de evidência (foto de avaria)
-- ---------------------------------------------------------------------------
-- Privado. O acesso é por URL assinada, como em report_external_files.

INSERT INTO storage.buckets (id, name, public)
VALUES ('equipment-evidence', 'equipment-evidence', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS eq_evidence_select ON storage.objects;
CREATE POLICY eq_evidence_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'equipment-evidence' AND public.can_act_on_equipment('read'));

DROP POLICY IF EXISTS eq_evidence_insert ON storage.objects;
CREATE POLICY eq_evidence_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'equipment-evidence' AND public.can_act_on_equipment('edit'));

DROP POLICY IF EXISTS eq_evidence_delete ON storage.objects;
CREATE POLICY eq_evidence_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'equipment-evidence' AND public.can_act_on_equipment('delete'));

-- ---------------------------------------------------------------------------
-- 9. Consulta de conferência para o runbook (risco B4)
-- ---------------------------------------------------------------------------
-- Rodar após qualquer regeração do schema pelo Lovable. Deve devolver uma linha
-- com ok = true. Se devolver zero linhas ou ok = false, o gatilho foi perdido e
-- as devoluções pendentes pararam de nascer:
--
--   SELECT tgname,
--          obj_description(t.oid, 'pg_trigger') LIKE 'I10-FASE4-GATILHO-DEVOLUCAO%' AS ok
--     FROM pg_trigger t
--     JOIN pg_class c ON c.oid = t.tgrelid
--    WHERE c.relname = 'hr_people'
--      AND t.tgname = 'trg_equipment_return_pendings';
