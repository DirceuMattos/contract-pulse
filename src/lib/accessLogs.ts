import { differenceInSeconds, differenceInMinutes, parseISO } from 'date-fns';
import { MODULE_CATALOG, getModuleKeyForRoute } from '@/types/moduleAccess';

/** Minutos sem atividade a partir dos quais consideramos a sessão abandonada. */
export const MINUTOS_INATIVIDADE = 30;

export type SituacaoSessao = 'ativa' | 'encerrada' | 'abandonada';

export const ROTULO_SITUACAO: Record<SituacaoSessao, string> = {
  ativa: 'Em andamento',
  encerrada: 'Encerrada',
  abandonada: 'Sem atividade',
};

/**
 * Situação real da sessão.
 *
 * O encerramento no fechamento da aba é melhor esforço e muitas vezes não
 * chega ao banco. Sem esta regra, toda sessão assim ficaria "Em andamento"
 * para sempre e o filtro de sessões ativas seria inútil.
 */
export function situacaoDaSessao(
  s: { encerradaEm: string | null; ultimaAtividade: string | null; iniciadaEm: string },
  agora: Date = new Date(),
): SituacaoSessao {
  if (s.encerradaEm) return 'encerrada';
  const referencia = s.ultimaAtividade ?? s.iniciadaEm;
  return differenceInMinutes(agora, parseISO(referencia)) > MINUTOS_INATIVIDADE ? 'abandonada' : 'ativa';
}

export function formatarDuracao(inicio: string, fim: string | null): string {
  if (!fim) return '—';
  const segundos = differenceInSeconds(parseISO(fim), parseISO(inicio));
  if (segundos < 0) return '—';
  if (segundos < 60) return `${segundos}s`;
  const minutos = Math.floor(segundos / 60);
  const horas = Math.floor(minutos / 60);
  if (horas > 0) return `${horas}h ${minutos % 60}min`;
  return `${minutos}min`;
}

/** `datetime-local` devolve "2026-08-24T14:30"; o banco quer ISO com fuso. */
export function paraIso(valor: string): string | null {
  if (!valor) return null;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Nome legível do módulo a partir da rota.
 *
 * Reaproveita o mesmo mapa de rotas que governa as permissões, em vez de
 * manter uma segunda lista à parte. O contexto tinha um mapa próprio com 10
 * entradas, e todo o resto caía no fallback e era gravado como caminho cru —
 * o filtro por módulo enchia de "/relatorios/abc-123".
 */
export function resolveModule(pathname: string): string {
  const key = getModuleKeyForRoute(pathname);
  if (key) {
    const mod = MODULE_CATALOG.find((m) => m.key === key);
    if (mod) return mod.label;
  }
  if (pathname === '/usuarios/logs') return 'Logs de Acesso';
  if (pathname === '/usuarios/perfis') return 'Gestão de Perfis';
  if (pathname.startsWith('/ajuda')) return 'Ajuda';
  if (pathname.startsWith('/adm-transportes')) return 'Adm Deslocamentos';
  if (pathname.startsWith('/requisicao-vagas')) return 'Requisição de Vagas';
  if (pathname.startsWith('/skills-vagas')) return 'Skills de Vagas';
  if (pathname.startsWith('/horas-extras')) return 'Adm Horas Extras';
  return pathname;
}

/** Escapa um campo para CSV separado por ponto e vírgula. */
export function escaparCsv(valor: string): string {
  return `"${String(valor).replace(/"/g, '""')}"`;
}
