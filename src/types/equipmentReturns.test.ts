/**
 * I10 Fase 4 — regras da tela de devoluções.
 *
 * Aqui só entra o que é lógica pura da tela. A regra de verdade está no banco
 * (resolve_equipment_return_pending) e é testada em
 * supabase/tests/i10_fase4_devolucoes.sql — estes testes existem para garantir
 * que a tela não peça nem aceite coisa diferente do que o banco vai validar.
 */
import { describe, it, expect } from 'vitest';
import {
  RETURN_OUTCOMES, RETURN_OUTCOME_RULES, RETURN_STATUSES, RETURN_STATUS_LABELS,
  DIAS_BUCKETS, identificacoesAceitas, identificacaoConfere, itemLabel,
  ALLOWED_TRANSITIONS,
} from './equipment';

describe('desfechos das devoluções', () => {
  it('não oferece cancelamento como desfecho manual', () => {
    expect(RETURN_OUTCOMES as readonly string[]).not.toContain('cancelled');
    expect(RETURN_OUTCOMES as readonly string[]).not.toContain('pending');
  });

  it('todo status tem rótulo em português', () => {
    RETURN_STATUSES.forEach((s) => {
      expect(RETURN_STATUS_LABELS[s]).toBeTruthy();
    });
  });

  it('leva o item ao destino previsto no escopo', () => {
    expect(RETURN_OUTCOME_RULES.returned.destino).toBe('em_estoque');
    expect(RETURN_OUTCOME_RULES.returned_damaged.destino).toBe('em_manutencao');
    expect(RETURN_OUTCOME_RULES.lost.destino).toBe('extraviado');
    expect(RETURN_OUTCOME_RULES.not_applicable.destino).toBe('em_estoque');
  });

  it('nenhum desfecho dá baixa por perda — isso é ato separado, com alçada', () => {
    RETURN_OUTCOMES.forEach((o) => {
      expect(RETURN_OUTCOME_RULES[o].destino).not.toBe('baixado_perda');
    });
  });

  it('todo destino é transição válida a partir de "cedido"', () => {
    const saidasDeCedido = ALLOWED_TRANSITIONS.cedido;
    RETURN_OUTCOMES.forEach((o) => {
      expect(saidasDeCedido).toContain(RETURN_OUTCOME_RULES[o].destino);
    });
  });

  it('exige o que o banco exige: conferência na devolução, observação nos demais', () => {
    expect(RETURN_OUTCOME_RULES.returned.exigeIdentificacao).toBe(true);
    expect(RETURN_OUTCOME_RULES.returned.exigeObservacao).toBe(false);
    expect(RETURN_OUTCOME_RULES.returned_damaged.exigeObservacao).toBe(true);
    expect(RETURN_OUTCOME_RULES.lost.exigeObservacao).toBe(true);
    expect(RETURN_OUTCOME_RULES.not_applicable.exigeObservacao).toBe(true);
  });
});

describe('conferência da identificação', () => {
  const item = { serial_number: 'SN-ABC-123', asset_tag: 'PAT-0099' };

  it('aceita o número de série', () => {
    expect(identificacaoConfere(item, 'SN-ABC-123')).toBe(true);
  });

  it('aceita o patrimônio no lugar do série', () => {
    expect(identificacaoConfere(item, 'PAT-0099')).toBe(true);
  });

  it('ignora caixa e espaços nas pontas', () => {
    expect(identificacaoConfere(item, '  sn-abc-123 ')).toBe(true);
  });

  it('recusa valor divergente', () => {
    expect(identificacaoConfere(item, 'SN-ABC-124')).toBe(false);
    expect(identificacaoConfere(item, '')).toBe(false);
  });

  it('item sem série e sem patrimônio: a conferência sai de cena (o banco pede observação)', () => {
    const semId = { serial_number: null, asset_tag: '   ' };
    expect(identificacoesAceitas(semId)).toEqual([]);
    expect(identificacaoConfere(semId, '')).toBe(true);
  });

  it('lista apenas as identificações preenchidas', () => {
    expect(identificacoesAceitas({ serial_number: 'X1', asset_tag: null })).toEqual(['X1']);
    expect(identificacoesAceitas(item)).toEqual(['SN-ABC-123', 'PAT-0099']);
  });
});

describe('faixas de dias em aberto', () => {
  it('cobrem toda a reta sem buraco entre as faixas', () => {
    const faixas = DIAS_BUCKETS.filter((b) => b.value !== 'todos');
    for (let d = 0; d <= 200; d++) {
      const achou = faixas.filter((b) => d >= b.min && d <= b.max);
      expect(achou.length, `dias=${d} deveria cair em exatamente uma faixa`).toBe(1);
    }
  });

  it('a opção "todos" pega qualquer valor', () => {
    const todos = DIAS_BUCKETS.find((b) => b.value === 'todos')!;
    expect(0 >= todos.min && 0 <= todos.max).toBe(true);
    expect(9999 >= todos.min && 9999 <= todos.max).toBe(true);
  });
});

describe('rótulo do item', () => {
  it('mostra tipo e descrição quando existem', () => {
    expect(itemLabel({
      equipment_type: 'notebook', manufacturer: 'Lenovo', model: 'T14',
      serial_number: null, asset_tag: null, hostname: null,
    })).toBe('Notebook · Lenovo T14');
  });

  it('não deixa separador solto quando não há fabricante nem modelo', () => {
    expect(itemLabel({
      equipment_type: 'mouse', manufacturer: null, model: null,
      serial_number: null, asset_tag: null, hostname: null,
    })).toBe('Mouse');
  });
});
