import { Contract, Resource, Settings, Client, HRPerson, Team, HealthStatus } from '@/types';
import { calculateContractHealth, getContractRevenue } from '@/lib/calculations';

// ─── Contract Analysis Types ─────────────────────────────────────
export interface PortfolioKPIs {
  critical: number;
  attention: number;
  healthy: number;
  upcomingAdjustments: number;
  upcomingExpirations: number;
}

export interface PortfolioRecommendation {
  contractId: string;
  contractName: string;
  reason: string;
  action: string;
  severity: 'critico' | 'atencao' | 'info';
  priority: number;
}

export interface ContractInsight {
  contractId: string;
  contractName: string;
  clientId: string;
  clientName: string;
  segmento: string;
  healthStatus: HealthStatus;
  diagnostics: string[];
  actions: string[];
}

export interface ContractPortfolioAnalysis {
  kpis: PortfolioKPIs;
  recommendations: PortfolioRecommendation[];
  contractInsights: ContractInsight[];
}

// ─── Resource Analysis Types ─────────────────────────────────────
export interface TeamLoadItem {
  teamId: string | undefined;
  teamName: string;
  memberCount: number;
  totalFTE: number;
  criticalContracts: number;
}

export interface PersonLoadItem {
  personId: string;
  personName: string;
  role: string;
  totalDedication: number;
}

export interface CommitteeItem {
  personName: string;
  comiteGestor: string;
}

export interface AnniversaryItem {
  personName: string;
  admissionDate: string;
  years: number;
}

export interface ResourceAnalysis {
  loadMap: TeamLoadItem[];
  overloaded: PersonLoadItem[];
  idle: PersonLoadItem[];
  committeeAgenda: CommitteeItem[];
  anniversaries: AnniversaryItem[];
}

// ─── Helpers ─────────────────────────────────────────────────────
function daysUntil(dateStr: string | undefined): number {
  if (!dateStr) return Infinity;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function fmt(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ─── Contract Portfolio Analysis ─────────────────────────────────
export function analyzeContractPortfolio(
  contracts: Contract[],
  resources: Resource[],
  settings: Settings,
  overheadMap: Record<string, number>,
  clients: Client[]
): ContractPortfolioAnalysis {
  const active = contracts.filter(c => c.status === 'operacao' || c.status === 'implantacao');
  const clientMap = new Map(clients.map(c => [c.id, c]));

  const kpis: PortfolioKPIs = { critical: 0, attention: 0, healthy: 0, upcomingAdjustments: 0, upcomingExpirations: 0 };
  const recommendations: PortfolioRecommendation[] = [];
  const contractInsights: ContractInsight[] = [];

  for (const contract of active) {
    const health = calculateContractHealth(contract, resources, settings, [], overheadMap[contract.id] || 0);
    const client = clientMap.get(contract.clientId);
    const clientName = client?.razaoSocial || 'Cliente desconhecido';
    const revenue = getContractRevenue(contract);
    const overhead = overheadMap[contract.id] || 0;
    const daysToEnd = daysUntil(contract.dataFim);

    // KPIs
    if (health.status === 'critico') kpis.critical++;
    else if (health.status === 'atencao') kpis.attention++;
    else kpis.healthy++;

    if (daysToEnd <= 60 && daysToEnd > 0) kpis.upcomingExpirations++;

    // Check adjustment date
    if (contract.dataBaseReajuste) {
      const now = new Date();
      const adjDate = new Date(contract.dataBaseReajuste);
      // Next anniversary of adjustment
      adjDate.setFullYear(now.getFullYear());
      if (adjDate < now) adjDate.setFullYear(now.getFullYear() + 1);
      const daysToAdj = Math.ceil((adjDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysToAdj <= 60) kpis.upcomingAdjustments++;
    }

    // Diagnostics & Actions
    const diagnostics: string[] = [];
    const actions: string[] = [];

    if (health.margemMensal < 0) {
      diagnostics.push(`Déficit mensal de ${fmt(Math.abs(health.margemMensal))}`);
      actions.push('Revisar escopo, custos e/ou negociar reajuste');
    } else if (health.margemPercentual < 5 && health.margemPercentual >= 0) {
      diagnostics.push(`Margem muito baixa: ${health.margemPercentual.toFixed(1)}%`);
      actions.push('Otimizar alocação de recursos e overhead');
    }

    if (overhead > 0 && revenue > 0 && (overhead / revenue) > 0.3) {
      diagnostics.push(`Overhead alto: ${((overhead / revenue) * 100).toFixed(1)}% da receita`);
      actions.push('Avaliar redistribuição do overhead central');
    }

    if (daysToEnd <= 60 && daysToEnd > 0) {
      diagnostics.push(`Vencimento em ${daysToEnd} dias`);
      if (contract.statusRenovacao === 'sem-tratativa') {
        diagnostics.push('Sem tratativa de renovação definida');
        actions.push('Iniciar negociação de renovação');
      } else {
        actions.push('Planejar renovação / transição');
      }
    }

    if (contract.dataBaseReajuste) {
      const now = new Date();
      const adjDate = new Date(contract.dataBaseReajuste);
      adjDate.setFullYear(now.getFullYear());
      if (adjDate < now) adjDate.setFullYear(now.getFullYear() + 1);
      const daysToAdj = Math.ceil((adjDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysToAdj <= 60) {
        diagnostics.push(`Reajuste previsto em ${daysToAdj} dias (${contract.indiceReajuste})`);
        actions.push('Preparar cálculo e comunicação do reajuste');
      }
    }

    // Recommendations (priority: lower = more urgent)
    if (health.margemMensal < 0) {
      recommendations.push({
        contractId: contract.id, contractName: contract.nome, severity: 'critico',
        reason: `Déficit mensal de ${fmt(Math.abs(health.margemMensal))}`,
        action: 'Revisar escopo e custos imediatamente', priority: 1,
      });
    } else if (health.margemPercentual < 5) {
      recommendations.push({
        contractId: contract.id, contractName: contract.nome, severity: 'atencao',
        reason: `Margem de apenas ${health.margemPercentual.toFixed(1)}%`,
        action: 'Otimizar alocação e overhead', priority: 3,
      });
    }
    if (daysToEnd <= 30 && daysToEnd > 0 && contract.statusRenovacao === 'sem-tratativa') {
      recommendations.push({
        contractId: contract.id, contractName: contract.nome, severity: 'critico',
        reason: `Vence em ${daysToEnd} dias sem renovação`,
        action: 'Iniciar renovação urgentemente', priority: 2,
      });
    }

    contractInsights.push({
      contractId: contract.id,
      contractName: contract.nome,
      clientId: contract.clientId,
      clientName,
      segmento: contract.segmento,
      healthStatus: health.status,
      diagnostics,
      actions,
    });
  }

  // Sort recommendations by priority, limit to 10
  recommendations.sort((a, b) => a.priority - b.priority);
  const topRecs = recommendations.slice(0, 10);

  return { kpis, recommendations: topRecs, contractInsights };
}

// ─── Resource Analysis ───────────────────────────────────────────
export function analyzeResources(
  resources: Resource[],
  hrPeople: HRPerson[],
  contracts: Contract[],
  settings: Settings,
  teams: Team[],
  clients: Client[]
): ResourceAnalysis {
  const teamMap = new Map(teams.map(t => [t.id, t.name]));
  const activeHR = hrPeople.filter(p => p.situacao === 'ativo');

  // Build dedication map per person
  const personDedication = new Map<string, { total: number; contracts: string[] }>();
  for (const r of resources) {
    if (!r.hrPersonId) continue;
    const existing = personDedication.get(r.hrPersonId) || { total: 0, contracts: [] };
    existing.total += r.percentualDedicacao;
    if (!existing.contracts.includes(r.contractId)) existing.contracts.push(r.contractId);
    personDedication.set(r.hrPersonId, existing);
  }

  // Health per contract
  const contractHealthMap = new Map<string, HealthStatus>();
  for (const c of contracts) {
    const h = calculateContractHealth(c, resources, settings, []);
    contractHealthMap.set(c.id, h.status);
  }

  // Team load map
  const teamAgg = new Map<string, { memberCount: number; totalFTE: number; criticalContracts: Set<string> }>();
  for (const person of activeHR) {
    const tid = person.teamId || '__none__';
    const agg = teamAgg.get(tid) || { memberCount: 0, totalFTE: 0, criticalContracts: new Set() };
    agg.memberCount++;
    const ded = personDedication.get(person.id);
    if (ded) {
      agg.totalFTE += ded.total / 100;
      for (const cid of ded.contracts) {
        if (contractHealthMap.get(cid) === 'critico') agg.criticalContracts.add(cid);
      }
    }
    teamAgg.set(tid, agg);
  }
  const loadMap: TeamLoadItem[] = Array.from(teamAgg.entries()).map(([tid, agg]) => ({
    teamId: tid === '__none__' ? undefined : tid,
    teamName: tid === '__none__' ? 'Sem equipe' : (teamMap.get(tid) || 'Equipe desconhecida'),
    memberCount: agg.memberCount,
    totalFTE: agg.totalFTE,
    criticalContracts: agg.criticalContracts.size,
  }));

  // Overloaded & Idle
  const overloaded: PersonLoadItem[] = [];
  const idle: PersonLoadItem[] = [];
  for (const person of activeHR) {
    const ded = personDedication.get(person.id);
    const total = ded?.total || 0;
    const role = person.cargoId || person.tipoVinculo;
    if (total > 100) {
      overloaded.push({ personId: person.id, personName: person.nome, role, totalDedication: total });
    } else if (total < 30 && total > 0) {
      idle.push({ personId: person.id, personName: person.nome, role, totalDedication: total });
    }
  }

  // Committee Agenda (current month)
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const committeeAgenda: CommitteeItem[] = activeHR
    .filter(p => p.comiteGestor && p.comiteGestor.startsWith(currentMonth))
    .map(p => ({ personName: p.nome, comiteGestor: p.comiteGestor! }));

  // Anniversaries (CLT, admission month matches current month)
  const anniversaries: AnniversaryItem[] = activeHR
    .filter(p => {
      if (p.tipoVinculo !== 'clt') return false;
      const admDate = new Date(p.dataAdmissao);
      return admDate.getMonth() === now.getMonth() && admDate.getFullYear() < now.getFullYear();
    })
    .map(p => {
      const admDate = new Date(p.dataAdmissao);
      return {
        personName: p.nome,
        admissionDate: p.dataAdmissao,
        years: now.getFullYear() - admDate.getFullYear(),
      };
    })
    .sort((a, b) => a.years - b.years);

  return { loadMap, overloaded, idle, committeeAgenda, anniversaries };
}
