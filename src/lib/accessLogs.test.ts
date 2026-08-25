import { describe, it, expect } from 'vitest';
import {
  situacaoDaSessao, formatarDuracao, paraIso, resolveModule, escaparCsv, MINUTOS_INATIVIDADE,
  rotuloDoModuloGravado, agruparModulosPorRotulo, rotulosDistintos,
} from './accessLogs';

const AGORA = new Date('2026-08-24T12:00:00Z');
const base = { iniciadaEm: '2026-08-24T10:00:00Z', encerradaEm: null, ultimaAtividade: null };

describe('situacaoDaSessao', () => {
  it('sessão com ended_at é encerrada, mesmo sem atividade recente', () => {
    expect(situacaoDaSessao({ ...base, encerradaEm: '2026-08-24T10:30:00Z' }, AGORA)).toBe('encerrada');
  });

  it('atividade dentro da janela conta como em andamento', () => {
    expect(situacaoDaSessao({ ...base, ultimaAtividade: '2026-08-24T11:45:00Z' }, AGORA)).toBe('ativa');
  });

  it('atividade além da janela vira "sem atividade" em vez de ficar eternamente aberta', () => {
    expect(situacaoDaSessao({ ...base, ultimaAtividade: '2026-08-24T11:00:00Z' }, AGORA)).toBe('abandonada');
  });

  it('sem nenhuma atividade registrada, cai para o início da sessão', () => {
    expect(situacaoDaSessao(base, AGORA)).toBe('abandonada');
    const recemAberta = { ...base, iniciadaEm: '2026-08-24T11:59:00Z' };
    expect(situacaoDaSessao(recemAberta, AGORA)).toBe('ativa');
  });

  it('a fronteira da janela é exclusiva', () => {
    const naFronteira = new Date(AGORA.getTime() - MINUTOS_INATIVIDADE * 60_000).toISOString();
    expect(situacaoDaSessao({ ...base, ultimaAtividade: naFronteira }, AGORA)).toBe('ativa');
  });
});

describe('formatarDuracao', () => {
  it('sem fim, não inventa duração', () => {
    expect(formatarDuracao('2026-08-24T10:00:00Z', null)).toBe('—');
  });
  it('segundos, minutos e horas', () => {
    expect(formatarDuracao('2026-08-24T10:00:00Z', '2026-08-24T10:00:45Z')).toBe('45s');
    expect(formatarDuracao('2026-08-24T10:00:00Z', '2026-08-24T10:07:00Z')).toBe('7min');
    expect(formatarDuracao('2026-08-24T10:00:00Z', '2026-08-24T12:30:00Z')).toBe('2h 30min');
  });
  it('fim anterior ao início não vira número negativo na tela', () => {
    expect(formatarDuracao('2026-08-24T12:00:00Z', '2026-08-24T10:00:00Z')).toBe('—');
  });
});

describe('paraIso', () => {
  it('vazio vira nulo, para não virar filtro inválido', () => {
    expect(paraIso('')).toBeNull();
    expect(paraIso('não é data')).toBeNull();
  });
  it('converte o formato do datetime-local', () => {
    expect(paraIso('2026-08-24T14:30')).toMatch(/^2026-08-24T\d{2}:30:00\.000Z$/);
  });
});

describe('resolveModule', () => {
  it('usa o rótulo do catálogo de módulos', () => {
    expect(resolveModule('/dashboard')).toBe('Dashboard Contratos');
    expect(resolveModule('/custos-suporte')).toBe('Custo do Suporte a Sistemas - TSI');
  });
  it('não deixa id de registro virar nome de módulo', () => {
    expect(resolveModule('/contratos/abc-123')).toBe('Detalhe do Contrato');
    expect(resolveModule('/clientes/abc-123')).toBe('Clientes');
  });
  it('cobre as telas que ficam fora do catálogo', () => {
    expect(resolveModule('/usuarios/logs')).toBe('Logs de Acesso');
    expect(resolveModule('/usuarios/perfis')).toBe('Gestão de Perfis');
    expect(resolveModule('/ajuda/contratos')).toBe('Ajuda');
  });
  it('rota desconhecida cai no caminho, sem quebrar', () => {
    expect(resolveModule('/rota-nova')).toBe('/rota-nova');
  });
});

describe('escaparCsv', () => {
  it('protege ponto e vírgula e aspas', () => {
    expect(escaparCsv('Silva; João')).toBe('"Silva; João"');
    expect(escaparCsv('diz "oi"')).toBe('"diz ""oi"""');
  });
});

describe('tradução do que já está gravado', () => {
  it('caminho cru do histórico vira nome de módulo', () => {
    expect(rotuloDoModuloGravado('/clientes')).toBe('Clientes');
    expect(rotuloDoModuloGravado('/contratos/abc-123')).toBe('Detalhe do Contrato');
    expect(rotuloDoModuloGravado('/relatorios/xyz')).toBe('Relatórios Mensais');
  });

  it('valor que já é nome de módulo passa intacto', () => {
    expect(rotuloDoModuloGravado('Clientes')).toBe('Clientes');
    expect(rotuloDoModuloGravado('Custo do Suporte a Sistemas - TSI')).toBe('Custo do Suporte a Sistemas - TSI');
  });

  it('caminho desconhecido não é inventado', () => {
    expect(rotuloDoModuloGravado('/rota-que-nao-existe')).toBe('/rota-que-nao-existe');
  });
});

describe('agruparModulosPorRotulo', () => {
  it('junta sob um rótulo o nome novo e os caminhos antigos', () => {
    const grupos = agruparModulosPorRotulo(['Clientes', '/clientes', '/clientes/abc-123', 'Alertas']);
    expect(grupos.get('Clientes')).toEqual(['Clientes', '/clientes', '/clientes/abc-123']);
    expect(grupos.get('Alertas')).toEqual(['Alertas']);
  });

  it('é isso que permite filtrar histórico e registro novo de uma vez', () => {
    const grupos = agruparModulosPorRotulo(['/contratos', 'Contratos']);
    expect(grupos.get('Contratos')).toHaveLength(2);
  });

  it('ordena os rótulos em português', () => {
    const grupos = agruparModulosPorRotulo(['Squads', 'Ajuda', 'Órgãos']);
    expect([...grupos.keys()]).toEqual(['Ajuda', 'Órgãos', 'Squads']);
  });
});

describe('rotulosDistintos', () => {
  it('remove duplicata vinda de formatos diferentes do mesmo módulo', () => {
    expect(rotulosDistintos(['/clientes', 'Clientes', '/clientes/abc'])).toEqual(['Clientes']);
  });
});

describe('rotas de sessão que faltavam', () => {
  it('telas de senha e segurança deixam de aparecer como caminho', () => {
    expect(resolveModule('/trocar-senha')).toBe('Troca de Senha');
    expect(resolveModule('/seguranca')).toBe('Segurança');
    expect(resolveModule('/trust')).toBe('Central de Confiança');
  });
});
