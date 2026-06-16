import type { ReportSectionKey, ReportSectionSource, ReportTemplateConfig } from '@/types';

export interface SectionMeta {
  key: ReportSectionKey;
  label: string;
  source: ReportSectionSource;
  /** Whether the section can be toggled via template config */
  configurable: boolean;
  /** Config flag name in ReportTemplateConfig (when configurable) */
  configFlag?: keyof ReportTemplateConfig;
}

export const SECTION_META: SectionMeta[] = [
  { key: 'capa', label: 'Capa', source: 'bnphub', configurable: false },
  { key: 'sumario', label: 'Sumário', source: 'manual', configurable: false },
  { key: 'objetivo', label: 'Objetivo', source: 'manual', configurable: false },
  { key: 'historico_tr', label: 'Histórico TR', source: 'bnphub', configurable: true, configFlag: 'showHistoricoTr' },
  { key: 'painel_executivo', label: 'Painel Executivo', source: 'manual', configurable: false },
  { key: 'evolucao_inovacao', label: 'Evolução e Inovação', source: 'asana', configurable: true, configFlag: 'showEvolucaoInovacao' },
  { key: 'entregas', label: 'Entregas', source: 'asana', configurable: true, configFlag: 'showEntregas' },
  { key: 'priorizadas', label: 'Priorizadas', source: 'asana', configurable: true, configFlag: 'showPriorizadas' },
  { key: 'demonstrativo_horas', label: 'Demonstrativo de Horas', source: 'manual', configurable: true, configFlag: 'showDemonstrativoHoras' },
  { key: 'eficiencia_operacional', label: 'Eficiência Operacional', source: 'manual', configurable: true, configFlag: 'showEficienciaOperacional' },
  { key: 'eficiencia_previsibilidade', label: 'Eficiência e Previsibilidade', source: 'asana', configurable: true, configFlag: 'showEficienciaPrevisibilidade' },
  { key: 'desempenho_aplicacao', label: 'Desempenho da Aplicação', source: 'manual', configurable: true, configFlag: 'showDesempenhoAplicacao' },
  { key: 'engajamento_usuario', label: 'Engajamento do Usuário', source: 'manual', configurable: true, configFlag: 'showEngajamentoUsuario' },
  { key: 'maturidade_plataforma', label: 'Maturidade da Plataforma', source: 'manual', configurable: true, configFlag: 'showMaturidadePlataforma' },
  { key: 'treinamentos_reunioes', label: 'Treinamentos e Reuniões', source: 'fireflies', configurable: true, configFlag: 'showTreinamentosReunioes' },
  { key: 'oportunidades_atencao', label: 'Oportunidades e Fatores de Atenção', source: 'manual', configurable: true, configFlag: 'showOportunidadesAtencao' },
];

export const SECTION_META_BY_KEY: Record<ReportSectionKey, SectionMeta> = Object.fromEntries(
  SECTION_META.map((m) => [m.key, m]),
) as Record<ReportSectionKey, SectionMeta>;

export const STATUS_LABELS = {
  draft: 'Rascunho',
  review: 'Em Revisão',
  approved: 'Aprovado',
  published: 'Publicado',
} as const;

export const PAINEL_STATUSES = ['Alta Performance', 'Adequado', 'Atenção', 'Crítico'] as const;
export type PainelStatus = typeof PAINEL_STATUSES[number];

export const PAINEL_STATUS_COLORS: Record<PainelStatus, string> = {
  'Alta Performance': 'bg-green-500 text-white',
  'Adequado': 'bg-yellow-500 text-black',
  'Atenção': 'bg-orange-500 text-white',
  'Crítico': 'bg-red-500 text-white',
};

export function defaultsForSection(key: ReportSectionKey): Record<string, unknown> {
  switch (key) {
    case 'objetivo':
      return { texto: 'Apresentar as principais entregas, indicadores e oportunidades identificadas no período de referência, evidenciando a evolução do contrato e o engajamento das partes envolvidas.' };
    case 'painel_executivo':
      return {
        historicoTr: 'Adequado',
        evolucaoInovacao: 'Adequado',
        eficienciaOperacional: 'Adequado',
        eficienciaPrevisibilidade: 'Adequado',
        desempenhoAplicacao: 'Adequado',
        engajamentoUsuario: 'Adequado',
      };
    case 'demonstrativo_horas':
      return { linhas: [], legenda: 'PO: Product Owner | LT/Dev: Líder Técnico / Desenvolvedor | QA: Quality Assurance' };
    case 'oportunidades_atencao':
    case 'treinamentos_reunioes':
    case 'entregas':
    case 'priorizadas':
      return { linhas: [] };
    case 'maturidade_plataforma':
      return { metricas: [], analise: '' };
    default:
      return {};
  }
}

export function isSectionEmpty(content: Record<string, unknown>): boolean {
  return !content || Object.keys(content).length === 0;
}

export function isSectionComplete(key: ReportSectionKey, content: Record<string, unknown>): boolean {
  if (isSectionEmpty(content)) return false;
  switch (key) {
    case 'objetivo':
      return !!(content.texto && String(content.texto).trim().length > 20);
    case 'painel_executivo':
      return PAINEL_STATUSES.length > 0 && [
        'historicoTr', 'evolucaoInovacao', 'eficienciaOperacional',
        'eficienciaPrevisibilidade', 'desempenhoAplicacao', 'engajamentoUsuario',
      ].every((k) => !!content[k]);
    case 'entregas':
    case 'priorizadas':
    case 'treinamentos_reunioes':
    case 'oportunidades_atencao':
    case 'demonstrativo_horas':
      return Array.isArray(content.linhas) && (content.linhas as unknown[]).length > 0;
    default:
      return Object.keys(content).length > 0;
  }
}
