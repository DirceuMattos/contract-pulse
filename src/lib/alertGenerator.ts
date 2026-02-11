import { Contract, Resource, Settings, Alert, AlertSeverity, Snapshot, OverheadItem, HistoryEvent } from '@/types';
import { getDaysUntil, getDaysSince, calculateContractHealth } from './calculations';

interface AlertGeneratorContext {
  contracts: Contract[];
  resources: Resource[];
  settings: Settings;
  snapshots: Snapshot[];
  overheadItems?: OverheadItem[];
  historyEvents?: HistoryEvent[];
}

/**
 * Gera alertas automáticos baseados nos contratos e configurações
 */
export function generateAlerts(context: AlertGeneratorContext): Alert[] {
  const { contracts, resources, settings, snapshots, overheadItems = [], historyEvents = [] } = context;
  const alerts: Alert[] = [];
  
  // Filtra apenas contratos ativos (operação ou implantação)
  const activeContracts = contracts.filter(c => 
    c.status === 'operacao' || c.status === 'implantacao'
  );
  
  for (const contract of activeContracts) {
    const contractResources = resources.filter(r => r.contractId === contract.id);
    const contractSnapshots = snapshots.filter(s => s.contractId === contract.id);
    
    // Alertas financeiros (deficit e margem baixa)
    const financialAlerts = checkFinancialAlerts(contract, resources, settings, overheadItems);
    alerts.push(...financialAlerts);
    
    // Alerta de Reajuste Próximo
    const reajusteAlert = checkReajusteProximo(contract, settings);
    if (reajusteAlert) alerts.push(reajusteAlert);
    
    // Alerta de Vigência Próxima do Fim
    const vigenciaAlert = checkVigenciaFim(contract, settings);
    if (vigenciaAlert) alerts.push(vigenciaAlert);
    
    // Alerta de Contrato Vencido
    const vencidoAlert = checkContratoVencido(contract);
    if (vencidoAlert) alerts.push(vencidoAlert);
    
    // Alerta de Desatualização de Recursos
    const desatualizacaoAlert = checkDesatualizacao(contract, settings);
    if (desatualizacaoAlert) alerts.push(desatualizacaoAlert);
    
    // Alerta de Tendência de Deterioração
    const tendenciaAlert = checkTendenciaDeterioracao(contract, contractSnapshots, contractResources, settings);
    if (tendenciaAlert) alerts.push(tendenciaAlert);
    
    // Alerta de Concentração de Custo
    const concentracaoAlert = checkConcentracaoCusto(contract, contractResources, settings);
    if (concentracaoAlert) alerts.push(concentracaoAlert);
    
    // Alerta de Governança - contatos incompletos
    const governancaAlert = checkGovernancaContatos(contract);
    if (governancaAlert) alerts.push(governancaAlert);

    // Alertas de histórico (governança)
    const contractHistory = historyEvents.filter(e => e.contractId === contract.id);
    const historyAlerts = checkHistoryAlerts(contract, contractHistory);
    alerts.push(...historyAlerts);
  }
  
  // Ordena por severidade (crítico primeiro, depois atenção, depois info) e data
  const severityOrder: Record<string, number> = { critico: 0, atencao: 1, info: 2 };
  return alerts.sort((a, b) => {
    const sevDiff = (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2);
    if (sevDiff !== 0) return sevDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * Verifica alertas financeiros: deficit e margem baixa
 */
function checkFinancialAlerts(
  contract: Contract,
  resources: Resource[],
  settings: Settings,
  overheadItems: OverheadItem[]
): Alert[] {
  const alerts: Alert[] = [];
  const health = calculateContractHealth(contract, resources, settings, overheadItems);
  
  if (health.margemMensal < 0) {
    alerts.push({
      id: `alert-financeiro-deficit-${contract.id}`,
      contractId: contract.id,
      type: 'financeiro-deficit',
      severity: 'critico',
      alertCategory: 'financeiro',
      title: `Déficit de ${formatCurrencySimple(Math.abs(health.margemMensal))}/mês`,
      description: `O contrato "${contract.nome}" está operando com déficit. Resultado mensal: ${formatCurrencySimple(health.margemMensal)}.`,
      recommendation: 'Ação urgente: revise custos, renegocie escopo ou ajuste o valor do contrato.',
      createdAt: new Date().toISOString(),
    });
  } else if (health.margemPercentual >= 0 && health.margemPercentual < 5) {
    alerts.push({
      id: `alert-financeiro-margem-${contract.id}`,
      contractId: contract.id,
      type: 'financeiro-margem-baixa',
      severity: 'atencao',
      alertCategory: 'financeiro',
      title: `Margem de apenas ${health.margemPercentual.toFixed(1)}%`,
      description: `O contrato "${contract.nome}" opera com margem muito baixa (${health.margemPercentual.toFixed(1)}%).`,
      recommendation: 'Monitore de perto e avalie otimizações de custo ou reajuste de preço.',
      createdAt: new Date().toISOString(),
    });
  }
  
  return alerts;
}

/**
 * Verifica se o contrato está vencido (dataFim < hoje e status ativo)
 */
function checkContratoVencido(contract: Contract): Alert | null {
  if (!contract.dataFim) return null;
  
  const diasAteFim = getDaysUntil(contract.dataFim);
  if (diasAteFim >= 0) return null; // Não vencido
  
  return {
    id: `alert-vencido-${contract.id}`,
    contractId: contract.id,
    type: 'vigencia-vencido',
    severity: 'critico',
    alertCategory: 'prazo',
    title: `Contrato vencido há ${Math.abs(diasAteFim)} dias`,
    description: `O contrato "${contract.nome}" venceu em ${formatDateBR(contract.dataFim)} e continua com status ativo.`,
    recommendation: 'URGENTE: Regularize a situação contratual — formalize renovação ou encerramento.',
    createdAt: new Date().toISOString(),
  };
}

/**
 * Verifica governança - contatos incompletos
 */
function checkGovernancaContatos(contract: Contract): Alert | null {
  if (!contract.responsavelCS && !contract.responsavelComercial) {
    return {
      id: `alert-governanca-${contract.id}`,
      contractId: contract.id,
      type: 'governanca-contatos',
      severity: 'info',
      alertCategory: 'governanca',
      title: 'Contatos de governança incompletos',
      description: `O contrato "${contract.nome}" não possui responsável CS nem responsável comercial cadastrados.`,
      recommendation: 'Cadastre os responsáveis de CS e comercial para garantir governança adequada.',
      createdAt: new Date().toISOString(),
    };
  }
  return null;
}

/**
 * Verifica se o reajuste do contrato está próximo
 */
function checkReajusteProximo(contract: Contract, settings: Settings): Alert | null {
  if (!contract.dataBaseReajuste) return null;
  
  const diasAteReajuste = getDaysUntil(contract.dataBaseReajuste);
  const limite = contract.alertaReajusteDias || settings.diasAlertaReajuste;
  
  if (diasAteReajuste <= 0 || diasAteReajuste > limite) return null;
  
  const severity: AlertSeverity = diasAteReajuste <= 30 ? 'critico' : 'atencao';
  
  return {
    id: `alert-reajuste-${contract.id}`,
    contractId: contract.id,
    type: 'reajuste-proximo',
    severity,
    alertCategory: 'reajuste',
    title: `Reajuste em ${diasAteReajuste} dias`,
    description: `O contrato "${contract.nome}" tem reajuste previsto para ${formatDateBR(contract.dataBaseReajuste)} (índice: ${contract.indiceReajuste}).`,
    recommendation: 'Inicie as negociações de reajuste com o cliente e prepare a documentação necessária.',
    createdAt: new Date().toISOString(),
  };
}

/**
 * Verifica se a vigência do contrato está próxima do fim
 */
function checkVigenciaFim(contract: Contract, settings: Settings): Alert | null {
  if (!contract.dataFim) return null;
  
  const diasAteFim = getDaysUntil(contract.dataFim);
  const limite = settings.diasAlertaVigencia;
  
  if (diasAteFim <= 0 || diasAteFim > limite) return null;
  
  const severity: AlertSeverity = diasAteFim <= 30 ? 'critico' : 'atencao';
  
  // Considera status de renovação
  if (contract.statusRenovacao === 'renovado') {
    return null; // Já renovado, não precisa de alerta
  }
  
  let statusRenovacao = '';
  if (contract.statusRenovacao === 'negociacao') {
    statusRenovacao = ' (em negociação)';
  } else {
    statusRenovacao = ' (sem tratativa)';
  }
  
  return {
    id: `alert-vigencia-${contract.id}`,
    contractId: contract.id,
    type: 'vigencia-fim',
    severity: contract.statusRenovacao === 'sem-tratativa' ? 'critico' : severity,
    alertCategory: 'prazo',
    title: `Vigência encerra em ${diasAteFim} dias${statusRenovacao}`,
    description: `O contrato "${contract.nome}" encerra em ${formatDateBR(contract.dataFim)}${contract.renovacaoAutomatica ? ' com renovação automática prevista' : ''}.`,
    recommendation: contract.statusRenovacao === 'sem-tratativa' 
      ? 'URGENTE: Inicie contato com o cliente para definir renovação ou encerramento.'
      : 'Acompanhe a negociação e formalize a renovação antes do vencimento.',
    createdAt: new Date().toISOString(),
  };
}

/**
 * Verifica se os recursos do contrato estão desatualizados
 */
function checkDesatualizacao(contract: Contract, settings: Settings): Alert | null {
  const ultimaAtualizacao = contract.ultimaAtualizacaoRecursos;
  
  if (!ultimaAtualizacao) {
    return {
      id: `alert-desatualizacao-${contract.id}`,
      contractId: contract.id,
      type: 'desatualizacao',
      severity: 'atencao',
      title: 'Recursos nunca cadastrados',
      description: `O contrato "${contract.nome}" não possui recursos cadastrados. A análise de saúde financeira está comprometida.`,
      recommendation: 'Cadastre os recursos alocados (CLT, PJ, outros custos) para obter análises precisas.',
      createdAt: new Date().toISOString(),
    };
  }
  
  const diasDesdeAtualizacao = getDaysSince(ultimaAtualizacao);
  const limite = settings.diasAlertaDesatualizacao;
  
  if (diasDesdeAtualizacao <= limite) return null;
  
  const severity: AlertSeverity = diasDesdeAtualizacao >= limite * 2 ? 'critico' : 'atencao';
  
  return {
    id: `alert-desatualizacao-${contract.id}`,
    contractId: contract.id,
    type: 'desatualizacao',
    severity,
    title: `Recursos desatualizados há ${diasDesdeAtualizacao} dias`,
    description: `O contrato "${contract.nome}" não tem atualização de recursos desde ${formatDateBR(ultimaAtualizacao)}.`,
    recommendation: 'Revise a alocação atual de recursos para garantir que os custos estão refletindo a realidade.',
    createdAt: new Date().toISOString(),
  };
}

/**
 * Verifica se há tendência de deterioração da margem
 */
function checkTendenciaDeterioracao(
  contract: Contract, 
  snapshots: Snapshot[], 
  resources: Resource[],
  settings: Settings
): Alert | null {
  if (snapshots.length < 2) return null;
  
  const recentSnapshots = [...snapshots]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);
  
  if (recentSnapshots.length < 2) return null;
  
  let tendenciaQueda = true;
  for (let i = 0; i < recentSnapshots.length - 1; i++) {
    if (recentSnapshots[i].margemPercentual >= recentSnapshots[i + 1].margemPercentual) {
      tendenciaQueda = false;
      break;
    }
  }
  
  if (!tendenciaQueda) return null;
  
  const margemAtual = recentSnapshots[0].margemPercentual;
  const margemAnterior = recentSnapshots[recentSnapshots.length - 1].margemPercentual;
  const quedaPercentual = margemAnterior - margemAtual;
  
  if (quedaPercentual < 3) return null;
  
  const severity: AlertSeverity = quedaPercentual >= 10 || margemAtual < 0 ? 'critico' : 'atencao';
  
  return {
    id: `alert-tendencia-${contract.id}`,
    contractId: contract.id,
    type: 'tendencia-deterioracao',
    severity,
    alertCategory: 'financeiro',
    title: `Margem caiu ${quedaPercentual.toFixed(1)}% nos últimos meses`,
    description: `O contrato "${contract.nome}" apresenta tendência de deterioração. Margem atual: ${margemAtual.toFixed(1)}%.`,
    recommendation: 'Analise os custos e negocie reajuste ou otimize a alocação de recursos.',
    createdAt: new Date().toISOString(),
  };
}

/**
 * Verifica se há concentração excessiva de custo em poucos recursos
 */
function checkConcentracaoCusto(
  contract: Contract, 
  resources: Resource[],
  settings: Settings
): Alert | null {
  if (resources.length < 3) return null;
  
  const custos = resources.map(r => ({
    nome: r.nome,
    custo: r.custoBase * (r.percentualDedicacao / 100)
  }));
  
  const custoTotal = custos.reduce((sum, r) => sum + r.custo, 0);
  if (custoTotal === 0) return null;
  
  custos.sort((a, b) => b.custo - a.custo);
  
  const maiorCusto = custos[0];
  const percentualMaior = (maiorCusto.custo / custoTotal) * 100;
  
  if (percentualMaior < 40) return null;
  
  const severity: AlertSeverity = percentualMaior >= 60 ? 'critico' : 'atencao';
  
  return {
    id: `alert-concentracao-${contract.id}`,
    contractId: contract.id,
    type: 'concentracao-custo',
    severity,
    alertCategory: 'governanca',
    title: `${percentualMaior.toFixed(0)}% do custo em um recurso`,
    description: `O contrato "${contract.nome}" tem alta dependência de "${maiorCusto.nome}" (${percentualMaior.toFixed(0)}% do custo).`,
    recommendation: 'Avalie o risco de dependência e considere distribuir responsabilidades ou documentar conhecimento crítico.',
    createdAt: new Date().toISOString(),
  };
}

/**
 * Verifica alertas de governança baseados no histórico de eventos
 */
function checkHistoryAlerts(contract: Contract, events: HistoryEvent[]): Alert[] {
  const alerts: Alert[] = [];
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Ocorrência crítica recente
  const hasCriticalRecent = events.some(e =>
    e.severity === 'critico' && new Date(e.eventDate) >= ninetyDaysAgo
  );
  if (hasCriticalRecent) {
    alerts.push({
      id: `alert-hist-critico-${contract.id}`,
      contractId: contract.id,
      type: 'governanca-contatos',
      severity: 'atencao',
      alertCategory: 'governanca',
      title: 'Ocorrência crítica recente',
      description: `O contrato "${contract.nome}" possui evento crítico registrado nos últimos 90 dias.`,
      recommendation: 'Revise o histórico e acompanhe as ações corretivas.',
      createdAt: new Date().toISOString(),
    });
  }

  // Risco contratual recente
  const hasRiskEvent = events.some(e =>
    (e.eventType === 'notificacao-recebida' || e.eventType === 'multa-penalidade') &&
    new Date(e.eventDate) >= ninetyDaysAgo
  );
  if (hasRiskEvent) {
    alerts.push({
      id: `alert-hist-risco-${contract.id}`,
      contractId: contract.id,
      type: 'governanca-contatos',
      severity: 'atencao',
      alertCategory: 'governanca',
      title: 'Risco contratual recente',
      description: `O contrato "${contract.nome}" recebeu notificação ou penalidade nos últimos 90 dias.`,
      recommendation: 'Analise o histórico e defina plano de mitigação de riscos.',
      createdAt: new Date().toISOString(),
    });
  }

  return alerts;
}

/**
 * Formata data para exibição BR
 */
function formatDateBR(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR');
}

/**
 * Formata moeda de forma simples
 */
function formatCurrencySimple(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Conta alertas por severidade
 */
export function countAlertsBySeverity(alerts: Alert[]): { critico: number; atencao: number; info: number } {
  return {
    critico: alerts.filter(a => a.severity === 'critico').length,
    atencao: alerts.filter(a => a.severity === 'atencao').length,
    info: alerts.filter(a => a.severity === 'info').length,
  };
}

/**
 * Agrupa alertas por contrato
 */
export function groupAlertsByContract(alerts: Alert[]): Map<string, Alert[]> {
  const grouped = new Map<string, Alert[]>();
  
  for (const alert of alerts) {
    const existing = grouped.get(alert.contractId) || [];
    existing.push(alert);
    grouped.set(alert.contractId, existing);
  }
  
  return grouped;
}
