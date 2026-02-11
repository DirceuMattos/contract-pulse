import type {
  SimulationQuestionnaire,
  SimulationComplexity,
  SimulationHRItem,
  SimulationOtherCost,
  SimulationOverhead,
  SimulationScenario,
  ContractSimulation,
  HealthStatus,
  DemandType,
} from '@/types';

// ── Default salaries (R$/month) ──
export const DEFAULT_SALARIES: Record<string, number> = {
  'Product Owner': 12000,
  'Tech Lead': 18000,
  'Desenvolvedor': 14000,
  'QA': 10000,
  'Suporte': 6000,
  'UX Designer': 12000,
  'DevOps': 15000,
};

const DEFAULT_CHARGES_CLT = 68; // %
const DEFAULT_CHARGES_PJ = 10; // %

// ── Base profiles ──
interface ProfileEntry { role: string; quantity: number }

const PROFILES: Record<string, ProfileEntry[]> = {
  'sustentacao-baixa': [
    { role: 'Product Owner', quantity: 0.2 },
    { role: 'Desenvolvedor', quantity: 1 },
    { role: 'QA', quantity: 0.5 },
  ],
  'sustentacao-media': [
    { role: 'Product Owner', quantity: 0.5 },
    { role: 'Desenvolvedor', quantity: 2 },
    { role: 'QA', quantity: 1 },
    { role: 'Suporte', quantity: 0.5 },
  ],
  'sustentacao-alta': [
    { role: 'Product Owner', quantity: 1 },
    { role: 'Tech Lead', quantity: 0.5 },
    { role: 'Desenvolvedor', quantity: 3 },
    { role: 'QA', quantity: 1.5 },
    { role: 'Suporte', quantity: 1 },
  ],
  'evolucao-baixa': [
    { role: 'Product Owner', quantity: 0.3 },
    { role: 'Desenvolvedor', quantity: 1.5 },
    { role: 'QA', quantity: 0.5 },
  ],
  'evolucao-media': [
    { role: 'Product Owner', quantity: 0.5 },
    { role: 'Tech Lead', quantity: 0.5 },
    { role: 'Desenvolvedor', quantity: 3 },
    { role: 'QA', quantity: 1 },
    { role: 'UX Designer', quantity: 0.5 },
  ],
  'evolucao-alta': [
    { role: 'Product Owner', quantity: 1 },
    { role: 'Tech Lead', quantity: 1 },
    { role: 'Desenvolvedor', quantity: 4 },
    { role: 'QA', quantity: 2 },
    { role: 'UX Designer', quantity: 0.5 },
    { role: 'DevOps', quantity: 0.5 },
  ],
  'novo-sistema-baixa': [
    { role: 'Product Owner', quantity: 0.5 },
    { role: 'Desenvolvedor', quantity: 2 },
    { role: 'QA', quantity: 1 },
  ],
  'novo-sistema-media': [
    { role: 'Product Owner', quantity: 1 },
    { role: 'Tech Lead', quantity: 0.5 },
    { role: 'Desenvolvedor', quantity: 3 },
    { role: 'QA', quantity: 1.5 },
    { role: 'UX Designer', quantity: 0.5 },
  ],
  'novo-sistema-alta': [
    { role: 'Product Owner', quantity: 1 },
    { role: 'Tech Lead', quantity: 1 },
    { role: 'Desenvolvedor', quantity: 4 },
    { role: 'QA', quantity: 2 },
    { role: 'UX Designer', quantity: 0.5 },
    { role: 'DevOps', quantity: 0.5 },
  ],
  'implantacao-baixa': [
    { role: 'Product Owner', quantity: 0.3 },
    { role: 'Desenvolvedor', quantity: 1 },
    { role: 'QA', quantity: 0.5 },
    { role: 'Suporte', quantity: 0.5 },
  ],
  'implantacao-media': [
    { role: 'Product Owner', quantity: 0.5 },
    { role: 'Tech Lead', quantity: 0.5 },
    { role: 'Desenvolvedor', quantity: 2 },
    { role: 'QA', quantity: 1 },
    { role: 'Suporte', quantity: 1 },
    { role: 'UX Designer', quantity: 0.5 },
  ],
  'implantacao-alta': [
    { role: 'Product Owner', quantity: 1 },
    { role: 'Tech Lead', quantity: 0.5 },
    { role: 'Desenvolvedor', quantity: 3 },
    { role: 'QA', quantity: 1.5 },
    { role: 'Suporte', quantity: 1 },
    { role: 'UX Designer', quantity: 0.5 },
    { role: 'DevOps', quantity: 0.5 },
  ],
};

function getProfileKey(demandType: DemandType, complexity: SimulationComplexity): string {
  return `${demandType}-${complexity}`;
}

let nextId = 1;
function genId() { return `sim-hr-${nextId++}`; }
function genOtherId() { return `sim-oc-${nextId++}`; }

// ── Generate suggested resources ──
export function generateSuggestedResources(
  questionnaire: SimulationQuestionnaire,
  complexity: SimulationComplexity,
): { hr: SimulationHRItem[]; otherCosts: SimulationOtherCost[]; overhead: SimulationOverhead } {
  const key = getProfileKey(questionnaire.demandType, complexity);
  const profile = PROFILES[key] || PROFILES['sustentacao-media']!;

  const hrMap = new Map<string, number>();
  for (const p of profile) hrMap.set(p.role, p.quantity);

  const otherCosts: SimulationOtherCost[] = [];

  if (questionnaire.integrations === '3-5') {
    hrMap.set('Desenvolvedor', (hrMap.get('Desenvolvedor') || 0) + 0.5);
    hrMap.set('QA', (hrMap.get('QA') || 0) + 0.5);
  }
  if (questionnaire.integrations === 'mais-5') {
    hrMap.set('Desenvolvedor', (hrMap.get('Desenvolvedor') || 0) + 1);
    hrMap.set('QA', (hrMap.get('QA') || 0) + 1);
  }
  if (questionnaire.criticality === 'alta') {
    hrMap.set('QA', (hrMap.get('QA') || 0) + 0.5);
    otherCosts.push({ id: genOtherId(), category: 'Observabilidade', description: 'Monitoramento e alertas', valueMonthly: 2000 });
  }
  if (questionnaire.slaLevel === '24x7') {
    hrMap.set('Suporte', (hrMap.get('Suporte') || 0) + 2);
    otherCosts.push({ id: genOtherId(), category: 'Plantão', description: 'Cobertura 24x7', valueMonthly: 5000 });
  }
  if (questionnaire.slaLevel === '12x5') {
    hrMap.set('Suporte', (hrMap.get('Suporte') || 0) + 1);
  }
  if (questionnaire.deliveryPace === 'agressivo') {
    hrMap.set('Desenvolvedor', (hrMap.get('Desenvolvedor') || 0) + 1);
  }
  if (questionnaire.modules === 'mais-10') {
    hrMap.set('Desenvolvedor', (hrMap.get('Desenvolvedor') || 0) + 1);
    hrMap.set('Product Owner', (hrMap.get('Product Owner') || 0) + 0.5);
  }
  if (questionnaire.modules === '6-10') {
    hrMap.set('Desenvolvedor', (hrMap.get('Desenvolvedor') || 0) + 0.5);
  }
  if (questionnaire.fieldDependency) {
    otherCosts.push({ id: genOtherId(), category: 'Viagens', description: 'Deslocamento e hospedagem', valueMonthly: 4000 });
  }
  if (questionnaire.userVolume === 'mais-20k') {
    otherCosts.push({ id: genOtherId(), category: 'Infraestrutura', description: 'Infra escalável para alto volume', valueMonthly: 3000 });
  }

  otherCosts.push({ id: genOtherId(), category: 'Cloud', description: 'Servidores e serviços cloud', valueMonthly: 2500 });

  const hr: SimulationHRItem[] = [];
  for (const [role, quantity] of hrMap) {
    if (quantity > 0) {
      hr.push({
        id: genId(),
        role,
        hiringType: 'clt',
        quantity,
        grossMonthly: DEFAULT_SALARIES[role] || 10000,
        chargesPercent: DEFAULT_CHARGES_CLT,
      });
    }
  }

  return {
    hr,
    otherCosts,
    overhead: { infraPercent: 6, adminPercent: 4, governancePercent: 3 },
  };
}

// ── Compute direct costs from resources ──
function computeCosts(simulation: ContractSimulation) {
  const resources = simulation.usingSuggested
    ? { hr: simulation.suggestedHR, oc: simulation.suggestedOtherCosts, oh: simulation.suggestedOverhead }
    : { hr: simulation.customHR, oc: simulation.customOtherCosts, oh: simulation.customOverhead };

  let custoRH = 0;
  for (const item of resources.hr) {
    const qty = item.quantity || 0;
    if (qty <= 0) continue;
    custoRH += qty * (item.grossMonthly || 0) * (1 + (item.chargesPercent || 0) / 100);
  }

  let custoOutros = simulation.consultancyCost || 0;
  for (const item of resources.oc) {
    custoOutros += item.valueMonthly || 0;
  }

  const custoDireto = custoRH + custoOutros;
  const overheadPercent = (resources.oh.infraPercent + resources.oh.adminPercent + resources.oh.governancePercent) / 100;
  const overheadMensal = custoDireto * overheadPercent;
  const custoMensal = custoDireto + overheadMensal;

  return { custoRH, custoOutros, custoDireto, overheadMensal, custoMensal };
}

// ── Suggest pricing ──
export function suggestPricing(simulation: ContractSimulation): {
  suggestedMonthlyValue: number;
  suggestedTotalValue: number;
  suggestedTermMonths: number;
  targetMarginPercent: number;
  breakEvenMonthly: number;
} {
  const { custoMensal } = computeCosts(simulation);

  // Target margin based on complexity
  const marginMap: Record<SimulationComplexity, number> = {
    baixa: 25,
    media: 20,
    alta: 15,
  };
  const targetMarginPercent = marginMap[simulation.complexityLevel];
  const breakEvenMonthly = custoMensal;
  const suggestedMonthlyValue = custoMensal / (1 - targetMarginPercent / 100);

  // Suggested term based on demand type
  const termMap: Record<DemandType, number> = {
    sustentacao: 12,
    evolucao: 18,
    'novo-sistema': 24,
    implantacao: 36,
  };
  let suggestedTermMonths = termMap[simulation.questionnaire.demandType] || 12;
  if (simulation.contractType === 'gov') suggestedTermMonths += 12;

  const suggestedTotalValue = suggestedMonthlyValue * suggestedTermMonths;

  return {
    suggestedMonthlyValue,
    suggestedTotalValue,
    suggestedTermMonths,
    targetMarginPercent,
    breakEvenMonthly,
  };
}

// ── Calculate results (now uses suggested pricing as revenue) ──
export function calculateSimulationResults(simulation: ContractSimulation): {
  receitaMensal: number;
  custoMensal: number;
  overheadMensal: number;
  resultadoMensal: number;
  margemPercent: number;
  healthStatus: HealthStatus;
} {
  const pricing = suggestPricing(simulation);
  const receitaMensal = pricing.suggestedMonthlyValue;

  const { custoMensal, overheadMensal } = computeCosts(simulation);

  const resultadoMensal = receitaMensal - custoMensal;
  const margemPercent = receitaMensal > 0 ? (resultadoMensal / receitaMensal) * 100 : 0;

  let healthStatus: HealthStatus = 'saudavel';
  if (margemPercent < 0) healthStatus = 'critico';
  else if (margemPercent < 15) healthStatus = 'atencao';

  return { receitaMensal, custoMensal, overheadMensal, resultadoMensal, margemPercent, healthStatus };
}

// ── Generate scenarios ──
export function generateScenarios(simulation: ContractSimulation): SimulationScenario[] {
  const base = calculateSimulationResults(simulation);

  const makeScenario = (label: string, custoMultiplier: number): SimulationScenario => {
    const custoAjustado = (base.custoMensal - base.overheadMensal) * custoMultiplier;
    const overheadAjustado = base.overheadMensal * custoMultiplier;
    const custoTotal = custoAjustado + overheadAjustado;
    const resultado = base.receitaMensal - custoTotal;
    const margem = base.receitaMensal > 0 ? (resultado / base.receitaMensal) * 100 : 0;
    let health: HealthStatus = 'saudavel';
    if (margem < 0) health = 'critico';
    else if (margem < 15) health = 'atencao';
    return {
      label,
      receitaMensal: base.receitaMensal,
      custoMensal: custoTotal,
      overheadMensal: overheadAjustado,
      resultadoMensal: resultado,
      margemPercent: margem,
      healthStatus: health,
    };
  };

  return [
    makeScenario('Conservador', 1.1),
    makeScenario('Base', 1.0),
    makeScenario('Otimista', 0.9),
  ];
}

// ── Explanation of applied rules ──
export function getAppliedRules(questionnaire: SimulationQuestionnaire, complexity: SimulationComplexity): string[] {
  const rules: string[] = [];
  const key = getProfileKey(questionnaire.demandType, complexity);
  rules.push(`Perfil base: ${key.replace('-', ' → ')}`);

  if (questionnaire.integrations === '3-5') rules.push('Integrações 3–5: +0,5 Dev e +0,5 QA');
  if (questionnaire.integrations === 'mais-5') rules.push('Integrações >5: +1 Dev e +1 QA');
  if (questionnaire.criticality === 'alta') rules.push('Criticidade alta: +0,5 QA e custo Observabilidade R$2k');
  if (questionnaire.slaLevel === '24x7') rules.push('SLA 24×7: +2 Suporte e custo Plantão R$5k');
  if (questionnaire.slaLevel === '12x5') rules.push('SLA 12×5: +1 Suporte');
  if (questionnaire.deliveryPace === 'agressivo') rules.push('Prazo agressivo: +1 Dev');
  if (questionnaire.modules === 'mais-10') rules.push('Módulos >10: +1 Dev e +0,5 PO');
  if (questionnaire.modules === '6-10') rules.push('Módulos 6–10: +0,5 Dev');
  if (questionnaire.fieldDependency) rules.push('Dependência de campo: custo Viagens R$4k');
  if (questionnaire.userVolume === 'mais-20k') rules.push('Volume >20k usuários: custo Infra escalável R$3k');

  return rules;
}
