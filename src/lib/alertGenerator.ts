import { Contract, Resource, Settings, Alert, AlertType, AlertSeverity, Snapshot } from '@/types';
import { getDaysUntil, getDaysSince, calculateContractHealth } from './calculations';

interface AlertGeneratorContext {
  contracts: Contract[];
  resources: Resource[];
  settings: Settings;
  snapshots: Snapshot[];
}

/**
 * Gera alertas automáticos baseados nos contratos e configurações
 */
export function generateAlerts(context: AlertGeneratorContext): Alert[] {
  const { contracts, resources, settings, snapshots } = context;
  const alerts: Alert[] = [];
  
  // Filtra apenas contratos ativos (operação ou implantação)
  const activeContracts = contracts.filter(c => 
    c.status === 'operacao' || c.status === 'implantacao'
  );
  
  for (const contract of activeContracts) {
    const contractResources = resources.filter(r => r.contractId === contract.id);
    const contractSnapshots = snapshots.filter(s => s.contractId === contract.id);
    
    // Alerta de Reajuste Próximo
    const reajusteAlert = checkReajusteProximo(contract, settings);
    if (reajusteAlert) alerts.push(reajusteAlert);
    
    // Alerta de Vigência Próxima do Fim
    const vigenciaAlert = checkVigenciaFim(contract, settings);
    if (vigenciaAlert) alerts.push(vigenciaAlert);
    
    // Alerta de Desatualização de Recursos
    const desatualizacaoAlert = checkDesatualizacao(contract, settings);
    if (desatualizacaoAlert) alerts.push(desatualizacaoAlert);
    
    // Alerta de Tendência de Deterioração
    const tendenciaAlert = checkTendenciaDeterioracao(contract, contractSnapshots, contractResources, settings);
    if (tendenciaAlert) alerts.push(tendenciaAlert);
    
    // Alerta de Concentração de Custo
    const concentracaoAlert = checkConcentracaoCusto(contract, contractResources, settings);
    if (concentracaoAlert) alerts.push(concentracaoAlert);
  }
  
  // Ordena por severidade (crítico primeiro) e data
  return alerts.sort((a, b) => {
    if (a.severity === 'critico' && b.severity !== 'critico') return -1;
    if (a.severity !== 'critico' && b.severity === 'critico') return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
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
  let statusRenovacao = '';
  if (contract.statusRenovacao === 'renovado') {
    return null; // Já renovado, não precisa de alerta
  } else if (contract.statusRenovacao === 'negociacao') {
    statusRenovacao = ' (em negociação)';
  } else {
    statusRenovacao = ' (sem tratativa)';
  }
  
  return {
    id: `alert-vigencia-${contract.id}`,
    contractId: contract.id,
    type: 'vigencia-fim',
    severity: contract.statusRenovacao === 'sem-tratativa' ? 'critico' : severity,
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
  
  // Pega os últimos 3 snapshots ordenados por data
  const recentSnapshots = [...snapshots]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);
  
  if (recentSnapshots.length < 2) return null;
  
  // Verifica se a margem está em queda consistente
  let tendenciaQueda = true;
  for (let i = 0; i < recentSnapshots.length - 1; i++) {
    if (recentSnapshots[i].margemPercentual >= recentSnapshots[i + 1].margemPercentual) {
      tendenciaQueda = false;
      break;
    }
  }
  
  if (!tendenciaQueda) return null;
  
  // Calcula a queda total
  const margemAtual = recentSnapshots[0].margemPercentual;
  const margemAnterior = recentSnapshots[recentSnapshots.length - 1].margemPercentual;
  const quedaPercentual = margemAnterior - margemAtual;
  
  if (quedaPercentual < 3) return null; // Ignora quedas pequenas
  
  const severity: AlertSeverity = quedaPercentual >= 10 || margemAtual < 0 ? 'critico' : 'atencao';
  
  return {
    id: `alert-tendencia-${contract.id}`,
    contractId: contract.id,
    type: 'tendencia-deterioracao',
    severity,
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
  
  // Calcula custo de cada recurso (simplificado)
  const custos = resources.map(r => ({
    nome: r.nome,
    custo: r.custoBase * (r.percentualDedicacao / 100)
  }));
  
  const custoTotal = custos.reduce((sum, r) => sum + r.custo, 0);
  if (custoTotal === 0) return null;
  
  // Ordena por custo decrescente
  custos.sort((a, b) => b.custo - a.custo);
  
  // Verifica se o recurso mais caro representa mais de 40% do custo total
  const maiorCusto = custos[0];
  const percentualMaior = (maiorCusto.custo / custoTotal) * 100;
  
  if (percentualMaior < 40) return null;
  
  const severity: AlertSeverity = percentualMaior >= 60 ? 'critico' : 'atencao';
  
  return {
    id: `alert-concentracao-${contract.id}`,
    contractId: contract.id,
    type: 'concentracao-custo',
    severity,
    title: `${percentualMaior.toFixed(0)}% do custo em um recurso`,
    description: `O contrato "${contract.nome}" tem alta dependência de "${maiorCusto.nome}" (${percentualMaior.toFixed(0)}% do custo).`,
    recommendation: 'Avalie o risco de dependência e considere distribuir responsabilidades ou documentar conhecimento crítico.',
    createdAt: new Date().toISOString(),
  };
}

/**
 * Formata data para exibição BR
 */
function formatDateBR(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR');
}

/**
 * Conta alertas por severidade
 */
export function countAlertsBySeverity(alerts: Alert[]): { critico: number; atencao: number } {
  return {
    critico: alerts.filter(a => a.severity === 'critico').length,
    atencao: alerts.filter(a => a.severity === 'atencao').length,
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
