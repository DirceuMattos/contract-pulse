import { Contract, Resource, Settings, HealthStatus, ContractHealth, DashboardKPIs, Alert, OverheadItem } from '@/types';

export function calculateResourceCost(
  resource: Resource,
  settings: Settings
): number {
  const { tipo, custoBase, percentualDedicacao, encargosOverride, impostosOverride } = resource;
  
  let custoTotal = custoBase;

  // Consultoria with totalPeriodo: divide by duration
  if (resource.categoria === 'consultoria' && resource.tipoValor === 'totalPeriodo' && resource.duracaoMeses && resource.duracaoMeses > 0) {
    custoTotal = custoBase / resource.duracaoMeses;
  }
  
  if (tipo === 'clt') {
    const encargos = encargosOverride ?? settings.percentualEncargosCLT;
    custoTotal = custoBase * (1 + encargos / 100);
  } else if (tipo === 'pj') {
    const impostos = impostosOverride ?? settings.percentualImpostosPJ;
    custoTotal = custoBase * (1 + impostos / 100);
  }
  // Para 'outro', custoBase já é o custo final (or divided by duration for consultoria)
  
  // Aplicar percentual de dedicação
  return custoTotal * (percentualDedicacao / 100);
}

export function calculateContractCost(
  contractId: string,
  resources: Resource[],
  settings: Settings
): number {
  const contractResources = resources.filter(r => r.contractId === contractId);
  return contractResources.reduce((total, resource) => {
    return total + calculateResourceCost(resource, settings);
  }, 0);
}

export function getContractRevenue(contract: Contract): number {
  if (contract.modeloReceita === 'mrr' && contract.valorMensalReferencia) {
    return contract.valorMensalReferencia;
  }
  
  if (contract.modeloReceita === 'media-mensal' && contract.valorTotalContrato) {
    const inicio = new Date(contract.dataInicio);
    const fim = new Date(contract.dataFim);
    const meses = Math.max(1, Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24 * 30)));
    return contract.valorTotalContrato / meses;
  }
  
  return 0;
}

export function getHealthStatus(
  margemPercentual: number,
  settings: Settings
): HealthStatus {
  if (margemPercentual >= settings.limiarSaudavel) {
    return 'saudavel';
  }
  if (margemPercentual >= settings.limiarAtencao) {
    return 'atencao';
  }
  return 'critico';
}

export function calculateOverheadCost(
  contractId: string,
  resources: Resource[],
  overheadItems: OverheadItem[],
  settings: Settings
): { total: number; breakdown: { item: OverheadItem; cost: number }[] } {
  const contractResources = resources.filter(r => r.contractId === contractId);
  const baseCost = contractResources.reduce((total, resource) => {
    return total + calculateResourceCost(resource, settings);
  }, 0);

  const contractOverhead = overheadItems.filter(o => o.contractId === contractId);
  const breakdown = contractOverhead.map(item => {
    const cost = item.modo === 'percentual'
      ? (item.percentual || 0) / 100 * baseCost
      : (item.valorFixoMensal || 0);
    return { item, cost };
  });

  return {
    total: breakdown.reduce((sum, b) => sum + b.cost, 0),
    breakdown,
  };
}

export function calculateContractHealth(
  contract: Contract,
  resources: Resource[],
  settings: Settings,
  overheadItems: OverheadItem[] = []
): ContractHealth {
  const receitaMensal = getContractRevenue(contract);
  const custoRecursos = calculateContractCost(contract.id, resources, settings);
  const overheadCost = calculateOverheadCost(contract.id, resources, overheadItems, settings);
  const custoMensal = custoRecursos + overheadCost.total;
  const margemMensal = receitaMensal - custoMensal;
  const margemPercentual = receitaMensal > 0 ? (margemMensal / receitaMensal) * 100 : 0;
  const status = getHealthStatus(margemPercentual, settings);
  
  return {
    contractId: contract.id,
    receitaMensal,
    custoMensal,
    margemMensal,
    margemPercentual,
    status,
  };
}

export function calculateDashboardKPIs(
  contracts: Contract[],
  resources: Resource[],
  settings: Settings,
  includeValues: boolean = false,
  overheadItems: OverheadItem[] = []
): DashboardKPIs {
  const activeContracts = contracts.filter(c => c.status === 'operacao' || c.status === 'implantacao');
  
  const healthData = activeContracts.map(contract => 
    calculateContractHealth(contract, resources, settings, overheadItems)
  );
  
  const kpis: DashboardKPIs = {
    totalContratos: activeContracts.length,
    contratosGovtech: activeContracts.filter(c => c.segmento === 'govtech').length,
    contratosPrivado: activeContracts.filter(c => c.segmento === 'privado').length,
    contratosSistema: activeContracts.filter(c => c.tipo === 'sistema').length,
    contratosInfraestrutura: activeContracts.filter(c => c.tipo === 'infraestrutura').length,
    contratosHibrido: activeContracts.filter(c => c.tipo === 'hibrido').length,
    contratosSaudavel: healthData.filter(h => h.status === 'saudavel').length,
    contratosAtencao: healthData.filter(h => h.status === 'atencao').length,
    contratosCritico: healthData.filter(h => h.status === 'critico').length,
  };
  
  if (includeValues) {
    kpis.receitaTotal = healthData.reduce((sum, h) => sum + h.receitaMensal, 0);
    kpis.custoTotal = healthData.reduce((sum, h) => sum + h.custoMensal, 0);
    kpis.margemTotal = kpis.receitaTotal - kpis.custoTotal;
  }
  
  return kpis;
}

export function formatCurrency(value: number, currency: 'BRL' | 'USD' = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercentage(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatCNPJ(cnpj: string): string {
  const cleaned = cnpj.replace(/\D/g, '');
  return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  }
  return cleaned.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
}

export function getDaysUntil(dateString: string): number {
  const target = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getDaysSince(dateString: string): number {
  const target = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
}
