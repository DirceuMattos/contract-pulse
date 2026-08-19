-- I10 Fase 4 — Testes das devoluções por desligamento
--
-- Roda em transação e faz ROLLBACK: não deixa resíduo. Pode ser executado em
-- ambiente de desenvolvimento com:
--   psql "$DEV_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/i10_fase4_devolucoes.sql
--
-- Cobre, na ordem, o que o escopo listou como risco:
--   T1  via 1 — edição manual no RH
--   T2  via 2 — importação em massa (UPDATE multi-linha)
--   T3  via 3 — sync do Feedz (sem usuário autenticado)
--   T4  escopo do gatilho: só item 'cedido' da pessoa desligada
--   T5  idempotência (índice único parcial)
--   T6  ordem de operações — pendência nasce antes de outro processo limpar o vínculo
--   T7  reativação cancela a pendência
--   T8  desfecho 'returned' exige conferência de SN/patrimônio
--   T9  desfecho 'returned' move o item e liga movement_id ao histórico
--   T10 desfecho 'returned_damaged' exige observação e manda para manutenção
--   T11 desfecho 'lost' mantém o detentor — o passivo continua visível
--   T12 desfecho 'not_applicable'
--   T13 'cancelled' e 'pending' recusados como desfecho manual
--   T14 pendência já resolvida não é resolvida de novo
--   T15 sem permissão de edição no módulo, não resolve
--   T16 view: dias_em_aberto, alerta_locado e alerta_item_movimentado_por_fora

BEGIN;

\set ON_ERROR_STOP on
SET client_min_messages TO NOTICE;

-- ---------------------------------------------------------------------------
-- Cenário
-- ---------------------------------------------------------------------------

CREATE TEMP TABLE t_ids (k text PRIMARY KEY, v uuid);

-- Usuário com permissão total no módulo
INSERT INTO auth.users (id) VALUES (gen_random_uuid()) RETURNING id \gset admin_
INSERT INTO t_ids VALUES ('admin', :'admin_id');
INSERT INTO public.user_roles (user_id, role) VALUES (:'admin_id', 'superadmin')
  ON CONFLICT DO NOTHING;

-- Usuário sem nenhuma permissão
INSERT INTO auth.users (id) VALUES (gen_random_uuid()) RETURNING id \gset nobody_

-- Equipe
INSERT INTO public.teams (name) VALUES ('Equipe Teste I10') RETURNING id \gset team_

-- Pessoas
INSERT INTO public.hr_people (nome, situacao, team_id) VALUES ('Teste Ana', 'ativo', :'team_id')  RETURNING id \gset ana_
INSERT INTO public.hr_people (nome, situacao, team_id) VALUES ('Teste Bruno', 'ativo', :'team_id') RETURNING id \gset bruno_
INSERT INTO public.hr_people (nome, situacao, team_id) VALUES ('Teste Carla', 'ativo', :'team_id') RETURNING id \gset carla_
INSERT INTO public.hr_people (nome, situacao, team_id) VALUES ('Teste Davi', 'ativo', :'team_id')  RETURNING id \gset davi_
INSERT INTO public.hr_people (nome, situacao, team_id) VALUES ('Teste Elis', 'ativo', :'team_id')  RETURNING id \gset elis_

SET LOCAL test.uid TO :'admin_id';

-- Itens. Nascem em_estoque; a cessão é feita pela RPC, como na tela.
INSERT INTO public.equipment_items (serial_number, asset_tag, equipment_type, model)
VALUES ('SN-ANA-1', 'PAT-100', 'notebook', 'ThinkPad T14') RETURNING id \gset iAna1_
INSERT INTO public.equipment_items (serial_number, equipment_type, model)
VALUES ('SN-ANA-2', 'monitor', 'Dell P2422H') RETURNING id \gset iAna2_
INSERT INTO public.equipment_items (serial_number, equipment_type, ownership, rental_monthly_value)
VALUES ('SN-BRU-1', 'notebook', 'locado', 320.00) RETURNING id \gset iBru_
INSERT INTO public.equipment_items (serial_number, equipment_type)
VALUES ('SN-ESTOQUE', 'headset') RETURNING id \gset iEstoque_
INSERT INTO public.equipment_items (equipment_type, model)
VALUES ('mouse', 'Sem identificação legível') RETURNING id \gset iSemSN_
INSERT INTO public.equipment_items (serial_number, equipment_type)
VALUES ('SN-CAR-1', 'notebook') RETURNING id \gset iCar_
INSERT INTO public.equipment_items (serial_number, equipment_type)
VALUES ('SN-DAV-1', 'notebook') RETURNING id \gset iDav_
INSERT INTO public.equipment_items (serial_number, equipment_type)
VALUES ('SN-ELI-1', 'notebook') RETURNING id \gset iEli_

SELECT public.register_equipment_movement(:'iAna1_id',    'cedido', 'pessoa', :'ana_id')   \gset mv1_
SELECT public.register_equipment_movement(:'iAna2_id',    'cedido', 'pessoa', :'ana_id')   \gset mv2_
SELECT public.register_equipment_movement(:'iSemSN_id',   'cedido', 'pessoa', :'ana_id')   \gset mv3_
SELECT public.register_equipment_movement(:'iBru_id',     'cedido', 'pessoa', :'bruno_id') \gset mv4_
SELECT public.register_equipment_movement(:'iCar_id',     'cedido', 'pessoa', :'carla_id') \gset mv5_
SELECT public.register_equipment_movement(:'iDav_id',     'cedido', 'pessoa', :'davi_id')  \gset mv6_
SELECT public.register_equipment_movement(:'iEli_id',     'cedido', 'pessoa', :'elis_id')  \gset mv7_

-- ---------------------------------------------------------------------------
-- T1 · Via 1 — edição manual no RH
-- ---------------------------------------------------------------------------
UPDATE public.hr_people
   SET situacao = 'inativo', data_desligamento = CURRENT_DATE - 20
 WHERE id = :'ana_id';

DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM public.equipment_return_pendings
   WHERE person_id = (SELECT id FROM public.hr_people WHERE nome = 'Teste Ana')
     AND status = 'pending';
  ASSERT n = 3, format('T1 via manual: esperava 3 pendências, veio %s', n);
  RAISE NOTICE 'T1 OK — via edição manual gerou 3 pendências';
END $$;

-- ---------------------------------------------------------------------------
-- T2 · Via 2 — importação em massa: um UPDATE atingindo várias linhas
-- ---------------------------------------------------------------------------
UPDATE public.hr_people
   SET situacao = 'inativo', data_desligamento = CURRENT_DATE - 3
 WHERE nome IN ('Teste Bruno', 'Teste Carla');

DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n
    FROM public.equipment_return_pendings r
    JOIN public.hr_people p ON p.id = r.person_id
   WHERE p.nome IN ('Teste Bruno', 'Teste Carla') AND r.status = 'pending';
  ASSERT n = 2, format('T2 importação em massa: esperava 2 pendências, veio %s', n);
  RAISE NOTICE 'T2 OK — UPDATE multi-linha gerou pendência para cada pessoa';
END $$;

-- ---------------------------------------------------------------------------
-- T3 · Via 3 — sync do Feedz: sem usuário autenticado no contexto
-- ---------------------------------------------------------------------------
SET LOCAL test.uid TO '';

UPDATE public.hr_people
   SET situacao = 'inativo', data_desligamento = CURRENT_DATE
 WHERE nome = 'Teste Davi';

DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n
    FROM public.equipment_return_pendings r
    JOIN public.hr_people p ON p.id = r.person_id
   WHERE p.nome = 'Teste Davi' AND r.status = 'pending';
  ASSERT n = 1, format('T3 sync sem auth.uid(): esperava 1 pendência, veio %s', n);
  RAISE NOTICE 'T3 OK — via automatizada, sem usuário logado, também gera pendência';
END $$;

-- ---------------------------------------------------------------------------
-- T4 · Escopo: item em estoque e item de outra pessoa não entram
-- ---------------------------------------------------------------------------
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM public.equipment_return_pendings r
    JOIN public.equipment_items i ON i.id = r.equipment_item_id
   WHERE i.serial_number = 'SN-ESTOQUE';
  ASSERT n = 0, 'T4: item em estoque não deveria gerar pendência';

  SELECT count(*) INTO n FROM public.equipment_return_pendings r
    JOIN public.hr_people p ON p.id = r.person_id
   WHERE p.nome = 'Teste Elis';
  ASSERT n = 0, 'T4: pessoa ainda ativa não deveria ter pendência';
  RAISE NOTICE 'T4 OK — gatilho só pega item cedido da pessoa desligada';
END $$;

-- ---------------------------------------------------------------------------
-- T5 · Idempotência: o índice único parcial recusa segunda pendência aberta
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  _item uuid; _person uuid; _falhou boolean := false;
BEGIN
  SELECT equipment_item_id, person_id INTO _item, _person
    FROM public.equipment_return_pendings WHERE status = 'pending' LIMIT 1;
  BEGIN
    INSERT INTO public.equipment_return_pendings (equipment_item_id, person_id, termination_date)
    VALUES (_item, _person, CURRENT_DATE);
  EXCEPTION WHEN unique_violation THEN _falhou := true;
  END;
  ASSERT _falhou, 'T5: segunda pendência aberta para o mesmo item+pessoa deveria ser recusada';
  RAISE NOTICE 'T5 OK — reprocessar o mesmo desligamento não duplica';
END $$;

-- ---------------------------------------------------------------------------
-- T6 · Ordem de operações: a pendência nasce antes de outro processo limpar
--      o vínculo do item. Simula o bug de Vagas com um gatilho concorrente.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.zz_teste_limpa_vinculo() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(OLD.situacao,'') = 'ativo' AND COALESCE(NEW.situacao,'') <> 'ativo' THEN
    PERFORM set_config('app.equipment_movement', 'on', true);
    UPDATE public.equipment_items
       SET status = 'em_estoque', holder_type = 'estoque', holder_person_id = NULL
     WHERE holder_person_id = OLD.id;
    PERFORM set_config('app.equipment_movement', 'off', true);
  END IF;
  RETURN NEW;
END $$;

-- Nome com 'zz' de propósito: gatilhos AFTER disparam em ordem alfabética, então
-- este roda depois do nosso. É a garantia que o teste precisa registrar.
CREATE TRIGGER zz_teste_limpa_vinculo
  AFTER UPDATE OF situacao ON public.hr_people
  FOR EACH ROW EXECUTE FUNCTION public.zz_teste_limpa_vinculo();

SET LOCAL test.uid TO :'admin_id';
UPDATE public.hr_people SET situacao = 'inativo', data_desligamento = CURRENT_DATE
 WHERE nome = 'Teste Elis';

DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM public.equipment_return_pendings r
    JOIN public.hr_people p ON p.id = r.person_id
   WHERE p.nome = 'Teste Elis' AND r.status = 'pending';
  ASSERT n = 1, format('T6 ordem de operações: pendência foi perdida (veio %s)', n);
  RAISE NOTICE 'T6 OK — pendência nasce antes de processo posterior limpar o vínculo';
END $$;

DROP TRIGGER zz_teste_limpa_vinculo ON public.hr_people;

-- ---------------------------------------------------------------------------
-- T7 · Reativação cancela a pendência
-- ---------------------------------------------------------------------------
UPDATE public.hr_people SET situacao = 'ativo', data_desligamento = NULL
 WHERE nome = 'Teste Davi';

DO $$
DECLARE r record;
BEGIN
  SELECT rp.status, rp.notes, rp.resolved_at INTO r
    FROM public.equipment_return_pendings rp
    JOIN public.hr_people p ON p.id = rp.person_id
   WHERE p.nome = 'Teste Davi';
  ASSERT r.status = 'cancelled', format('T7: esperava cancelled, veio %s', r.status);
  ASSERT r.resolved_at IS NOT NULL, 'T7: cancelamento deve registrar resolved_at';
  ASSERT r.notes ILIKE '%voltou a ativo%', 'T7: cancelamento deve registrar o motivo';
  RAISE NOTICE 'T7 OK — reativação cancela e registra o motivo';
END $$;

-- ---------------------------------------------------------------------------
-- T8 · 'returned' exige conferência de SN ou patrimônio
-- ---------------------------------------------------------------------------
DO $$
DECLARE _p uuid; _falhou boolean := false;
BEGIN
  SELECT r.id INTO _p FROM public.equipment_return_pendings r
    JOIN public.equipment_items i ON i.id = r.equipment_item_id
   WHERE i.serial_number = 'SN-ANA-1' AND r.status = 'pending';

  -- identificação errada
  BEGIN
    PERFORM public.resolve_equipment_return_pending(_p, 'returned', NULL, NULL, NULL, 'SN-ERRADO');
  EXCEPTION WHEN others THEN _falhou := true;
  END;
  ASSERT _falhou, 'T8: identificação divergente deveria ser recusada';

  -- identificação ausente
  _falhou := false;
  BEGIN
    PERFORM public.resolve_equipment_return_pending(_p, 'returned');
  EXCEPTION WHEN others THEN _falhou := true;
  END;
  ASSERT _falhou, 'T8: devolução sem conferência deveria ser recusada';
  RAISE NOTICE 'T8 OK — devolução sem conferência de identificação é recusada';
END $$;

-- Item sem SN e sem patrimônio: aceita, mas exige observação descrevendo a conferência.
DO $$
DECLARE _p uuid; _falhou boolean := false; _mid uuid;
BEGIN
  SELECT r.id INTO _p FROM public.equipment_return_pendings r
    JOIN public.equipment_items i ON i.id = r.equipment_item_id
   WHERE i.model = 'Sem identificação legível' AND r.status = 'pending';

  BEGIN
    PERFORM public.resolve_equipment_return_pending(_p, 'returned');
  EXCEPTION WHEN others THEN _falhou := true;
  END;
  ASSERT _falhou, 'T8b: item sem SN sem observação deveria ser recusado';

  _mid := public.resolve_equipment_return_pending(
    _p, 'returned', 'Conferido pelo modelo e pela etiqueta interna, sem SN legível');
  ASSERT _mid IS NOT NULL, 'T8b: com observação deveria passar';
  RAISE NOTICE 'T8b OK — item sem identificação legível passa com observação';
END $$;

-- ---------------------------------------------------------------------------
-- T9 · 'returned' move o item e liga movement_id ao histórico
-- ---------------------------------------------------------------------------
DO $$
DECLARE _p uuid; _mid uuid; _r record;
BEGIN
  SELECT r.id INTO _p FROM public.equipment_return_pendings r
    JOIN public.equipment_items i ON i.id = r.equipment_item_id
   WHERE i.serial_number = 'SN-ANA-1' AND r.status = 'pending';

  -- aceita o patrimônio no lugar do SN, em caixa e espaços diferentes
  _mid := public.resolve_equipment_return_pending(_p, 'returned', NULL, NULL, NULL, '  pat-100 ');

  SELECT rp.status, rp.movement_id, i.status AS item_status, i.holder_type, i.holder_person_id
    INTO _r
    FROM public.equipment_return_pendings rp
    JOIN public.equipment_items i ON i.id = rp.equipment_item_id
   WHERE rp.id = _p;

  ASSERT _r.status = 'returned',            format('T9: status %s', _r.status);
  ASSERT _r.movement_id = _mid,             'T9: movement_id deve apontar para a movimentação gerada';
  ASSERT _r.item_status = 'em_estoque',     format('T9: item deveria estar em_estoque, está %s', _r.item_status);
  ASSERT _r.holder_type = 'estoque',        'T9: detentor deveria ser o estoque';
  ASSERT _r.holder_person_id IS NULL,       'T9: vínculo com a pessoa deveria ter sido encerrado';
  ASSERT EXISTS (SELECT 1 FROM public.equipment_movements WHERE id = _mid),
         'T9: a movimentação deveria estar no histórico';
  RAISE NOTICE 'T9 OK — devolução move o item e fica ligada ao histórico';
END $$;

-- ---------------------------------------------------------------------------
-- T10 · 'returned_damaged' exige observação e manda para manutenção
-- ---------------------------------------------------------------------------
DO $$
DECLARE _p uuid; _falhou boolean := false; _st public.equipment_status;
BEGIN
  SELECT r.id INTO _p FROM public.equipment_return_pendings r
    JOIN public.equipment_items i ON i.id = r.equipment_item_id
   WHERE i.serial_number = 'SN-ANA-2' AND r.status = 'pending';

  BEGIN
    PERFORM public.resolve_equipment_return_pending(_p, 'returned_damaged');
  EXCEPTION WHEN others THEN _falhou := true;
  END;
  ASSERT _falhou, 'T10: avaria sem observação deveria ser recusada';

  PERFORM public.resolve_equipment_return_pending(
    _p, 'returned_damaged', 'Tela trincada no canto inferior direito', 'evidencias/tela.jpg');

  SELECT i.status INTO _st FROM public.equipment_items i
    JOIN public.equipment_return_pendings r ON r.equipment_item_id = i.id
   WHERE r.id = _p;
  ASSERT _st = 'em_manutencao', format('T10: esperava em_manutencao, veio %s', _st);
  ASSERT (SELECT evidence_url FROM public.equipment_return_pendings WHERE id = _p) = 'evidencias/tela.jpg',
         'T10: evidência deveria ter sido gravada';
  RAISE NOTICE 'T10 OK — avaria exige observação e vai para manutenção com evidência';
END $$;

-- ---------------------------------------------------------------------------
-- T11 · 'lost' mantém o detentor: o passivo continua visível no inventário
-- ---------------------------------------------------------------------------
DO $$
DECLARE _p uuid; _r record;
BEGIN
  SELECT r.id INTO _p FROM public.equipment_return_pendings r
    JOIN public.equipment_items i ON i.id = r.equipment_item_id
   WHERE i.serial_number = 'SN-BRU-1' AND r.status = 'pending';

  PERFORM public.resolve_equipment_return_pending(
    _p, 'lost', 'Colaborador não devolveu e não responde aos contatos do RH');

  SELECT i.status, i.holder_type, i.holder_person_id, v.alerta_colaborador_inativo
    INTO _r
    FROM public.equipment_items i
    JOIN public.equipment_items_view v ON v.id = i.id
   WHERE i.serial_number = 'SN-BRU-1';

  ASSERT _r.status = 'extraviado',        format('T11: esperava extraviado, veio %s', _r.status);
  ASSERT _r.holder_type = 'pessoa',       'T11: detentor deveria continuar sendo a pessoa';
  ASSERT _r.holder_person_id IS NOT NULL, 'T11: vínculo deveria ser mantido';
  ASSERT _r.alerta_colaborador_inativo,   'T11: o item deveria seguir sinalizado no inventário';
  ASSERT (SELECT i.status FROM public.equipment_items i WHERE i.serial_number = 'SN-BRU-1') <> 'baixado_perda',
         'T11: baixa por perda é ato separado, não automático';
  RAISE NOTICE 'T11 OK — extravio mantém o passivo visível e não dá baixa automática';
END $$;

-- ---------------------------------------------------------------------------
-- T12 · 'not_applicable' — cadastro estava errado
-- ---------------------------------------------------------------------------
DO $$
DECLARE _p uuid; _st public.equipment_status;
BEGIN
  SELECT r.id INTO _p FROM public.equipment_return_pendings r
    JOIN public.equipment_items i ON i.id = r.equipment_item_id
   WHERE i.serial_number = 'SN-CAR-1' AND r.status = 'pending';

  PERFORM public.resolve_equipment_return_pending(
    _p, 'not_applicable', 'Cadastro apontava a pessoa errada; item nunca saiu do estoque');

  SELECT status INTO _st FROM public.equipment_items WHERE serial_number = 'SN-CAR-1';
  ASSERT _st = 'em_estoque', format('T12: esperava em_estoque, veio %s', _st);
  RAISE NOTICE 'T12 OK — "não se aplica" devolve ao estoque com observação';
END $$;

-- ---------------------------------------------------------------------------
-- T13 · 'cancelled' e 'pending' não são desfechos manuais
-- ---------------------------------------------------------------------------
DO $$
DECLARE _p uuid; _falhou boolean;
BEGIN
  SELECT r.id INTO _p FROM public.equipment_return_pendings r
    JOIN public.equipment_items i ON i.id = r.equipment_item_id
   WHERE i.serial_number = 'SN-ELI-1' AND r.status = 'pending';

  _falhou := false;
  BEGIN PERFORM public.resolve_equipment_return_pending(_p, 'cancelled', 'x');
  EXCEPTION WHEN others THEN _falhou := true; END;
  ASSERT _falhou, 'T13: cancelamento manual deveria ser recusado';

  _falhou := false;
  BEGIN PERFORM public.resolve_equipment_return_pending(_p, 'pending', 'x');
  EXCEPTION WHEN others THEN _falhou := true; END;
  ASSERT _falhou, 'T13: "pending" não é desfecho';
  RAISE NOTICE 'T13 OK — cancelamento é automático, não manual';
END $$;

-- ---------------------------------------------------------------------------
-- T14 · Pendência já resolvida não é resolvida de novo
-- ---------------------------------------------------------------------------
DO $$
DECLARE _p uuid; _falhou boolean := false;
BEGIN
  SELECT r.id INTO _p FROM public.equipment_return_pendings r
   WHERE r.status = 'returned' LIMIT 1;
  BEGIN
    PERFORM public.resolve_equipment_return_pending(_p, 'lost', 'tentativa indevida');
  EXCEPTION WHEN others THEN _falhou := true;
  END;
  ASSERT _falhou, 'T14: pendência resolvida não deveria aceitar novo desfecho';
  RAISE NOTICE 'T14 OK — desfecho não é reescrito';
END $$;

-- ---------------------------------------------------------------------------
-- T15 · Sem permissão de edição no módulo, não resolve
-- ---------------------------------------------------------------------------
SET LOCAL test.uid TO :'nobody_id';
DO $$
DECLARE _p uuid; _falhou boolean := false;
BEGIN
  SELECT r.id INTO _p FROM public.equipment_return_pendings r
    JOIN public.equipment_items i ON i.id = r.equipment_item_id
   WHERE i.serial_number = 'SN-ELI-1' AND r.status = 'pending';
  BEGIN
    PERFORM public.resolve_equipment_return_pending(_p, 'returned', NULL, NULL, NULL, 'SN-ELI-1');
  EXCEPTION WHEN others THEN _falhou := true;
  END;
  ASSERT _falhou, 'T15: usuário sem permissão no módulo não deveria resolver';
  RAISE NOTICE 'T15 OK — SECURITY DEFINER não vira porta aberta';
END $$;
SET LOCAL test.uid TO :'admin_id';

-- ---------------------------------------------------------------------------
-- T16 · View: dias em aberto, item locado e divergência de detentor
-- ---------------------------------------------------------------------------
DO $$
DECLARE _r record;
BEGIN
  SELECT dias_em_aberto, alerta_locado, alerta_item_movimentado_por_fora, team_name, person_name
    INTO _r
    FROM public.equipment_return_pendings_view
   WHERE serial_number = 'SN-BRU-1';
  ASSERT _r.dias_em_aberto = 3, format('T16: esperava 3 dias em aberto, veio %s', _r.dias_em_aberto);
  ASSERT _r.alerta_locado,      'T16: item locado deveria ser sinalizado';
  ASSERT _r.team_name = 'Equipe Teste I10', 'T16: equipe deveria vir na view';

  -- pendência da Elis segue aberta e o item foi levado a estoque por fora da aba
  PERFORM public.register_equipment_movement(
    (SELECT id FROM public.equipment_items WHERE serial_number = 'SN-ELI-1'),
    'em_estoque', 'estoque', NULL, NULL, 'movimentação direta, fora da aba');

  SELECT alerta_item_movimentado_por_fora, dias_em_aberto INTO _r
    FROM public.equipment_return_pendings_view
   WHERE serial_number = 'SN-ELI-1' AND status = 'pending';
  ASSERT _r.alerta_item_movimentado_por_fora,
         'T16: divergência entre detentor do item e pessoa da pendência deveria ser sinalizada';
  RAISE NOTICE 'T16 OK — view entrega dias em aberto, locado e divergência de detentor';
END $$;

DO $$ BEGIN RAISE NOTICE '=== I10 Fase 4: todos os testes passaram ==='; END $$;

ROLLBACK;
