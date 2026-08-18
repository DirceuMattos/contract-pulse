-- I10 Fase 1 — Núcleo do Controle de Equipamentos
--
-- Item, movimentações, detentores e histórico. Sem solicitação (Fase 3), sem
-- importação (Fase 2) e sem cálculo financeiro (Fase 5) — mas com os campos
-- financeiros já criados e vazios, para não exigir migração depois.
--
-- Decisões de 12/08 aplicadas aqui:
--   · identificador de negócio = número de série (SN); hostname é atributo mutável
--   · patrimônio é campo, não identificador
--   · "Baixado por perda" é estado; "Descartado" é terminal
--   · item locado nunca vai a Vendido / Doado / Descartado — só devolvido ao fornecedor
--   · detentor pode ser pessoa, empresa do grupo, estoque ou fornecedor

-- ---------------------------------------------------------------------------
-- 1. Tipos
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE public.equipment_status AS ENUM (
    'em_estoque',
    'cedido',
    'cedido_grupo',
    'em_manutencao',
    'extraviado',
    'baixado_perda',          -- terminal
    'descartado',             -- terminal
    'doado',                  -- terminal
    'vendido',                -- terminal
    'transferido_grupo',      -- terminal — sai do patrimônio da BNP
    'devolvido_fornecedor'    -- terminal — exclusivo de item locado
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.equipment_type AS ENUM (
    'notebook','desktop','mini_pc','monitor','headset','teclado','mouse',
    'suporte_ergonomico','celular','tablet','impressora','projetor','outro'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.equipment_ownership AS ENUM ('proprio','locado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.equipment_holder_type AS ENUM
    ('pessoa','empresa_grupo','estoque','fornecedor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 2. Tabelas de apoio
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.group_companies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  cnpj        text,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.group_companies IS
  'Empresas do grupo BNP que recebem equipamento cedido. Pessoas delas NÃO entram no HUB — o detentor é a empresa.';

INSERT INTO public.group_companies (name) VALUES
  ('Xpanse'), ('Via Luz'), ('CityGuard'), ('Realme')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.equipment_suppliers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  cnpj        text,
  contact     text,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3. O item
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.equipment_items (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação
  serial_number         text,                       -- chave de NEGÓCIO
  asset_tag             text,                       -- patrimônio BNP (campo, não chave)
  hostname              text,                       -- atributo mutável, com histórico
  equipment_type        public.equipment_type NOT NULL DEFAULT 'outro',
  manufacturer          text,
  model                 text,

  -- Configuração técnica (base da matriz de critérios, Fase 3)
  cpu_model             text,
  ram_gb                integer CHECK (ram_gb IS NULL OR ram_gb > 0),
  storage_gb            integer CHECK (storage_gb IS NULL OR storage_gb > 0),
  storage_type          text,

  -- Propriedade e financeiro — nascem vazios (Fase 5)
  ownership             public.equipment_ownership NOT NULL DEFAULT 'proprio',
  supplier_id           uuid REFERENCES public.equipment_suppliers(id) ON DELETE SET NULL,
  purchase_date         date,
  purchase_value        numeric(14,2) CHECK (purchase_value IS NULL OR purchase_value >= 0),
  invoice_number        text,
  rental_monthly_value  numeric(14,2) CHECK (rental_monthly_value IS NULL OR rental_monthly_value >= 0),
  rental_start          date,
  rental_end            date,
  warranty_end          date,

  -- Estado e detentor — mantidos pelo gatilho a partir de equipment_movements
  status                public.equipment_status NOT NULL DEFAULT 'em_estoque',
  holder_type           public.equipment_holder_type NOT NULL DEFAULT 'estoque',
  holder_person_id      uuid REFERENCES public.hr_people(id) ON DELETE SET NULL,
  holder_company_id     uuid REFERENCES public.group_companies(id) ON DELETE SET NULL,

  location              text,
  photo_url             text,
  notes                 text,

  -- Exclusão lógica: só cadastro errado, nunca item com movimentação
  deleted_at            timestamptz,
  deleted_by            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  delete_reason         text,

  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at            timestamptz NOT NULL DEFAULT now(),
  updated_by            uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- ---- Regras estruturais ----

  -- Detentor coerente com o tipo. É o que impede o caso BNP-128 da planilha,
  -- em que o mesmo item aparecia com duas pessoas.
  CONSTRAINT equipment_holder_coerente CHECK (
    (holder_type = 'pessoa'        AND holder_person_id IS NOT NULL AND holder_company_id IS NULL)
 OR (holder_type = 'empresa_grupo' AND holder_company_id IS NOT NULL AND holder_person_id IS NULL)
 OR (holder_type IN ('estoque','fornecedor') AND holder_person_id IS NULL AND holder_company_id IS NULL)
  ),

  -- Estado coerente com o detentor.
  CONSTRAINT equipment_status_holder CHECK (
    (status = 'cedido'       AND holder_type = 'pessoa')
 OR (status = 'cedido_grupo' AND holder_type = 'empresa_grupo')
 OR (status = 'em_estoque'   AND holder_type = 'estoque')
 OR (status NOT IN ('cedido','cedido_grupo','em_estoque'))
  ),

  -- Decisão de 12/08: item locado não é nosso para vender, doar ou descartar.
  CONSTRAINT equipment_locado_saida CHECK (
    ownership <> 'locado'
    OR status NOT IN ('vendido','doado','descartado','transferido_grupo')
  ),

  -- E o inverso: só item locado volta ao fornecedor.
  CONSTRAINT equipment_devolucao_so_locado CHECK (
    status <> 'devolvido_fornecedor' OR ownership = 'locado'
  ),

  CONSTRAINT equipment_rental_periodo CHECK (
    rental_start IS NULL OR rental_end IS NULL OR rental_end >= rental_start
  )
);

-- SN é a chave de negócio: único quando existe, mas aceita vazio (3 itens da
-- planilha não têm SN legível e não podem travar o cadastro).
CREATE UNIQUE INDEX IF NOT EXISTS equipment_items_serial_unique
  ON public.equipment_items (upper(btrim(serial_number)))
  WHERE serial_number IS NOT NULL AND btrim(serial_number) <> '' AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS equipment_items_asset_tag_unique
  ON public.equipment_items (upper(btrim(asset_tag)))
  WHERE asset_tag IS NOT NULL AND btrim(asset_tag) <> '' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS equipment_items_status_idx   ON public.equipment_items (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS equipment_items_person_idx   ON public.equipment_items (holder_person_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS equipment_items_company_idx  ON public.equipment_items (holder_company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS equipment_items_hostname_idx ON public.equipment_items (upper(btrim(hostname))) WHERE deleted_at IS NULL;

COMMENT ON COLUMN public.equipment_items.serial_number IS
  'Chave de negócio. Único quando preenchido. Hostname NÃO serve: muda a cada reinstalação.';
COMMENT ON COLUMN public.equipment_items.asset_tag IS
  'Patrimônio BNP. Campo, não identificador (decisão de 12/08).';

-- ---------------------------------------------------------------------------
-- 4. Movimentações — a verdade sobre estado e detentor
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.equipment_movements (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_item_id        uuid NOT NULL REFERENCES public.equipment_items(id) ON DELETE CASCADE,

  from_status              public.equipment_status,
  to_status                public.equipment_status NOT NULL,
  from_holder_type         public.equipment_holder_type,
  from_holder_person_id    uuid,
  from_holder_company_id   uuid,
  to_holder_type           public.equipment_holder_type NOT NULL,
  to_holder_person_id      uuid REFERENCES public.hr_people(id) ON DELETE SET NULL,
  to_holder_company_id     uuid REFERENCES public.group_companies(id) ON DELETE SET NULL,

  occurred_at              timestamptz NOT NULL DEFAULT now(),
  reason                   text,
  authorized_by            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  exception_justification  text,
  evidence_url             text,

  registered_at            timestamptz NOT NULL DEFAULT now(),
  registered_by            uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS equipment_movements_item_idx
  ON public.equipment_movements (equipment_item_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS equipment_movements_person_idx
  ON public.equipment_movements (to_holder_person_id) WHERE to_holder_person_id IS NOT NULL;

COMMENT ON TABLE public.equipment_movements IS
  'Histórico imutável. É quem responde "quem estava com este notebook em março". Nunca sofre UPDATE nem DELETE.';

-- Histórico imutável, imposto no banco.
CREATE OR REPLACE FUNCTION public.equipment_movements_no_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'equipment_movements é somente inserção: o histórico de cessão não pode ser alterado nem apagado';
END $$;

DROP TRIGGER IF EXISTS trg_equipment_movements_immutable ON public.equipment_movements;
CREATE TRIGGER trg_equipment_movements_immutable
  BEFORE UPDATE OR DELETE ON public.equipment_movements
  FOR EACH ROW EXECUTE FUNCTION public.equipment_movements_no_change();

-- ---------------------------------------------------------------------------
-- 5. Histórico de hostname
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.equipment_hostname_history (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_item_id uuid NOT NULL REFERENCES public.equipment_items(id) ON DELETE CASCADE,
  hostname          text NOT NULL,
  valid_from        timestamptz NOT NULL DEFAULT now(),
  valid_to          timestamptz,
  changed_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS equipment_hostname_history_item_idx
  ON public.equipment_hostname_history (equipment_item_id, valid_from DESC);

CREATE OR REPLACE FUNCTION public.equipment_track_hostname()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.hostname IS NOT NULL AND btrim(NEW.hostname) <> '' THEN
      INSERT INTO public.equipment_hostname_history (equipment_item_id, hostname, changed_by)
      VALUES (NEW.id, NEW.hostname, NEW.created_by);
    END IF;
  ELSIF NEW.hostname IS DISTINCT FROM OLD.hostname THEN
    UPDATE public.equipment_hostname_history
       SET valid_to = now()
     WHERE equipment_item_id = NEW.id AND valid_to IS NULL;
    IF NEW.hostname IS NOT NULL AND btrim(NEW.hostname) <> '' THEN
      INSERT INTO public.equipment_hostname_history (equipment_item_id, hostname, changed_by)
      VALUES (NEW.id, NEW.hostname, NEW.updated_by);
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_equipment_track_hostname ON public.equipment_items;
CREATE TRIGGER trg_equipment_track_hostname
  AFTER INSERT OR UPDATE OF hostname ON public.equipment_items
  FOR EACH ROW EXECUTE FUNCTION public.equipment_track_hostname();

-- ---------------------------------------------------------------------------
-- 6. Transições válidas
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.equipment_transition_allowed(
  _from public.equipment_status,
  _to   public.equipment_status
) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN _from IS NULL THEN _to IN ('em_estoque','cedido','cedido_grupo','em_manutencao')
    WHEN _from = _to THEN true
    WHEN _from = 'em_estoque' THEN _to IN
      ('cedido','cedido_grupo','em_manutencao','extraviado','descartado',
       'doado','vendido','transferido_grupo','devolvido_fornecedor')
    WHEN _from = 'cedido' THEN _to IN
      ('em_estoque','em_manutencao','extraviado','cedido_grupo')
    WHEN _from = 'cedido_grupo' THEN _to IN
      ('em_estoque','em_manutencao','extraviado','transferido_grupo')
    WHEN _from = 'em_manutencao' THEN _to IN
      ('em_estoque','cedido','descartado','devolvido_fornecedor')
    -- Extraviado pode reaparecer. Se não reaparecer, vira baixa por perda.
    WHEN _from = 'extraviado' THEN _to IN ('em_estoque','baixado_perda')
    -- Terminais.
    ELSE false
  END;
$$;

COMMENT ON FUNCTION public.equipment_transition_allowed IS
  'Transições da §4 do PRD. Descartado, Baixado por perda, Doado, Vendido, Transferido ao grupo e Devolvido ao fornecedor são terminais.';

-- ---------------------------------------------------------------------------
-- 7. Registro de movimentação — a única via de mudança de estado
-- ---------------------------------------------------------------------------

-- Estado do item só muda por aqui. Edição direta na tela não desvia a regra.
CREATE OR REPLACE FUNCTION public.equipment_block_direct_status_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('app.equipment_movement', true) = 'on' THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.holder_type IS DISTINCT FROM OLD.holder_type
     OR NEW.holder_person_id IS DISTINCT FROM OLD.holder_person_id
     OR NEW.holder_company_id IS DISTINCT FROM OLD.holder_company_id THEN
    RAISE EXCEPTION 'Estado e detentor mudam apenas por register_equipment_movement(), para o histórico não se perder';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_equipment_block_direct_status ON public.equipment_items;
CREATE TRIGGER trg_equipment_block_direct_status
  BEFORE UPDATE ON public.equipment_items
  FOR EACH ROW EXECUTE FUNCTION public.equipment_block_direct_status_change();

-- A RPC sinaliza que a alteração é legítima.
CREATE OR REPLACE FUNCTION public.register_equipment_movement(
  _item_id        uuid,
  _to_status      public.equipment_status,
  _to_holder_type public.equipment_holder_type,
  _to_person_id   uuid        DEFAULT NULL,
  _to_company_id  uuid        DEFAULT NULL,
  _reason         text        DEFAULT NULL,
  _occurred_at    timestamptz DEFAULT NULL,
  _authorized_by  uuid        DEFAULT NULL,
  _justification  text        DEFAULT NULL,
  _evidence_url   text        DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE it public.equipment_items%ROWTYPE; mid uuid;
BEGIN
  SELECT * INTO it FROM public.equipment_items
   WHERE id = _item_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Equipamento não encontrado ou excluído'; END IF;

  IF NOT public.equipment_transition_allowed(it.status, _to_status) THEN
    RAISE EXCEPTION 'Transição inválida: % → %', it.status, _to_status;
  END IF;
  IF it.ownership = 'locado' AND _to_status IN ('vendido','doado','descartado','transferido_grupo') THEN
    RAISE EXCEPTION 'Equipamento locado não pode ir para %: não é patrimônio da BNP', _to_status;
  END IF;
  IF _to_status = 'devolvido_fornecedor' AND it.ownership <> 'locado' THEN
    RAISE EXCEPTION 'Somente equipamento locado pode ser devolvido ao fornecedor';
  END IF;

  INSERT INTO public.equipment_movements (
    equipment_item_id, from_status, to_status,
    from_holder_type, from_holder_person_id, from_holder_company_id,
    to_holder_type, to_holder_person_id, to_holder_company_id,
    occurred_at, reason, authorized_by, exception_justification,
    evidence_url, registered_by
  ) VALUES (
    _item_id, it.status, _to_status,
    it.holder_type, it.holder_person_id, it.holder_company_id,
    _to_holder_type, _to_person_id, _to_company_id,
    coalesce(_occurred_at, now()), _reason, _authorized_by, _justification,
    _evidence_url, auth.uid()
  ) RETURNING id INTO mid;

  PERFORM set_config('app.equipment_movement', 'on', true);
  UPDATE public.equipment_items
     SET status = _to_status, holder_type = _to_holder_type,
         holder_person_id = _to_person_id, holder_company_id = _to_company_id,
         updated_at = now(), updated_by = auth.uid()
   WHERE id = _item_id;
  PERFORM set_config('app.equipment_movement', 'off', true);

  RETURN mid;
END $$;

REVOKE ALL ON FUNCTION public.register_equipment_movement(uuid, public.equipment_status, public.equipment_holder_type, uuid, uuid, text, timestamptz, uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.register_equipment_movement(uuid, public.equipment_status, public.equipment_holder_type, uuid, uuid, text, timestamptz, uuid, text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 8. Exclusão lógica — só cadastro errado, nunca item com movimentação
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.soft_delete_equipment_item(
  _item_id uuid,
  _reason  text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _reason IS NULL OR btrim(_reason) = '' THEN
    RAISE EXCEPTION 'Informe o motivo da exclusão';
  END IF;

  IF EXISTS (SELECT 1 FROM public.equipment_movements WHERE equipment_item_id = _item_id) THEN
    RAISE EXCEPTION 'Item com movimentação registrada não pode ser excluído — use uma baixa (descarte, perda, doação ou venda)';
  END IF;

  UPDATE public.equipment_items
     SET deleted_at = now(), deleted_by = auth.uid(), delete_reason = _reason
   WHERE id = _item_id AND deleted_at IS NULL;
END $$;

REVOKE ALL ON FUNCTION public.soft_delete_equipment_item(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.soft_delete_equipment_item(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 9. updated_at
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_equipment_items_updated_at ON public.equipment_items;
CREATE TRIGGER trg_equipment_items_updated_at
  BEFORE UPDATE ON public.equipment_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 10. RLS — consulta a camada de módulos, como nas policies de documentos
-- ---------------------------------------------------------------------------

ALTER TABLE public.equipment_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_movements        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_hostname_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_companies            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_suppliers        ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_act_on_equipment(_action text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.has_role(auth.uid(), 'superadmin'::app_role)
    OR EXISTS (
      SELECT 1
        FROM public.user_roles ur
        JOIN public.role_module_permissions rmp ON rmp.role = ur.role::text
       WHERE ur.user_id = auth.uid()
         AND rmp.module_key = 'EQUIPMENT'
         AND rmp.can_access
         AND CASE _action
               WHEN 'read'   THEN true
               WHEN 'create' THEN rmp.can_create
               WHEN 'edit'   THEN rmp.can_edit
               WHEN 'delete' THEN rmp.can_delete
               ELSE false
             END
    );
$$;

REVOKE ALL ON FUNCTION public.can_act_on_equipment(text) FROM public;
GRANT EXECUTE ON FUNCTION public.can_act_on_equipment(text) TO authenticated;

DROP POLICY IF EXISTS eq_items_select ON public.equipment_items;
CREATE POLICY eq_items_select ON public.equipment_items
  FOR SELECT TO authenticated USING (public.can_act_on_equipment('read'));

DROP POLICY IF EXISTS eq_items_insert ON public.equipment_items;
CREATE POLICY eq_items_insert ON public.equipment_items
  FOR INSERT TO authenticated WITH CHECK (public.can_act_on_equipment('create'));

DROP POLICY IF EXISTS eq_items_update ON public.equipment_items;
CREATE POLICY eq_items_update ON public.equipment_items
  FOR UPDATE TO authenticated
  USING (public.can_act_on_equipment('edit'))
  WITH CHECK (public.can_act_on_equipment('edit'));

-- Sem policy de DELETE: exclusão é lógica, via soft_delete_equipment_item().

DROP POLICY IF EXISTS eq_mov_select ON public.equipment_movements;
CREATE POLICY eq_mov_select ON public.equipment_movements
  FOR SELECT TO authenticated USING (public.can_act_on_equipment('read'));

DROP POLICY IF EXISTS eq_mov_insert ON public.equipment_movements;
CREATE POLICY eq_mov_insert ON public.equipment_movements
  FOR INSERT TO authenticated WITH CHECK (public.can_act_on_equipment('edit'));

DROP POLICY IF EXISTS eq_hostname_select ON public.equipment_hostname_history;
CREATE POLICY eq_hostname_select ON public.equipment_hostname_history
  FOR SELECT TO authenticated USING (public.can_act_on_equipment('read'));

DROP POLICY IF EXISTS gc_select ON public.group_companies;
CREATE POLICY gc_select ON public.group_companies
  FOR SELECT TO authenticated USING (public.can_act_on_equipment('read'));
DROP POLICY IF EXISTS gc_modify ON public.group_companies;
CREATE POLICY gc_modify ON public.group_companies
  FOR ALL TO authenticated
  USING (public.can_act_on_equipment('edit'))
  WITH CHECK (public.can_act_on_equipment('edit'));

DROP POLICY IF EXISTS sup_select ON public.equipment_suppliers;
CREATE POLICY sup_select ON public.equipment_suppliers
  FOR SELECT TO authenticated USING (public.can_act_on_equipment('read'));
DROP POLICY IF EXISTS sup_modify ON public.equipment_suppliers;
CREATE POLICY sup_modify ON public.equipment_suppliers
  FOR ALL TO authenticated
  USING (public.can_act_on_equipment('edit'))
  WITH CHECK (public.can_act_on_equipment('edit'));

-- ---------------------------------------------------------------------------
-- 11. Visão de lista — junta pessoa, empresa e sinalizações
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.equipment_items_view
WITH (security_invoker = true) AS
SELECT
  i.*,
  p.nome                AS holder_person_name,
  p.situacao            AS holder_person_situacao,
  g.name                AS holder_company_name,
  s.name                AS supplier_name,
  -- Sinalização da §5 do PRD: equipamento com colaborador inativo
  (i.holder_type = 'pessoa' AND p.situacao IS DISTINCT FROM 'ativo') AS alerta_colaborador_inativo,
  (i.holder_type = 'empresa_grupo')                                  AS alerta_fora_da_bnp,
  (SELECT max(m.occurred_at) FROM public.equipment_movements m
    WHERE m.equipment_item_id = i.id)                                AS ultima_movimentacao
FROM public.equipment_items i
LEFT JOIN public.hr_people      p ON p.id = i.holder_person_id
LEFT JOIN public.group_companies g ON g.id = i.holder_company_id
LEFT JOIN public.equipment_suppliers s ON s.id = i.supplier_id
WHERE i.deleted_at IS NULL;

GRANT SELECT ON public.equipment_items_view TO authenticated;
