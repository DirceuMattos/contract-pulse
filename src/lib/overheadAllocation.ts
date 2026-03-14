import { Contract, Client } from '@/types';
import { getContractRevenue } from '@/lib/calculations';

export interface OverheadAllocationItem {
  contractId: string;
  contractName: string;
  contractCode: string;
  clientName: string;
  monthlyRevenue: number;
  allocationPercent: number;
  overheadAllocated: number;
  roundingAdjustment?: number;
  contractStatus: string;
}

export interface OverheadPendingItem {
  contractId: string;
  contractName: string;
  contractCode: string;
  clientName: string;
  reason: string;
}

export interface OverheadAllocationResult {
  allocations: OverheadAllocationItem[];
  pending: OverheadPendingItem[];
  totalRevenue: number;
  totalAllocated: number;
  poolTotal: number;
}

const STATUS_LABELS: Record<string, string> = {
  operacao: 'Em operação',
  implantacao: 'Implantação',
  suspenso: 'Suspenso',
  encerrado: 'Encerrado',
};

export function calculateOverheadAllocation(
  contracts: Contract[],
  clients: Client[],
  poolTotal: number,
): OverheadAllocationResult {
  const clientMap = new Map(clients.map(c => [c.id, c]));

  const activeStatuses = new Set(['operacao', 'implantacao']);

  const eligible: { contract: Contract; revenue: number; clientName: string }[] = [];
  const pending: OverheadPendingItem[] = [];

  for (const c of contracts) {
    const client = clientMap.get(c.clientId);
    const clientName = client?.razaoSocial ?? '—';

    if (!activeStatuses.has(c.status)) {
      pending.push({
        contractId: c.id,
        contractName: c.nome,
        contractCode: c.codigo,
        clientName,
        reason: `Contrato não vigente (${STATUS_LABELS[c.status] ?? c.status})`,
      });
      continue;
    }

    const revenue = getContractRevenue(c);
    if (!revenue || revenue <= 0) {
      pending.push({
        contractId: c.id,
        contractName: c.nome,
        contractCode: c.codigo,
        clientName,
        reason: revenue === 0 ? 'Valor mensal = 0' : 'Valor mensal ausente',
      });
      continue;
    }

    eligible.push({ contract: c, revenue, clientName });
  }

  const totalRevenue = eligible.reduce((s, e) => s + e.revenue, 0);

  if (totalRevenue === 0 || poolTotal <= 0) {
    return {
      allocations: eligible.map(e => ({
        contractId: e.contract.id,
        contractName: e.contract.nome,
        contractCode: e.contract.codigo,
        clientName: e.clientName,
        monthlyRevenue: e.revenue,
        allocationPercent: 0,
        overheadAllocated: 0,
        contractStatus: STATUS_LABELS[e.contract.status] ?? e.contract.status,
      })),
      pending,
      totalRevenue,
      totalAllocated: 0,
      poolTotal,
    };
  }

  // Calculate allocations with rounding to cents
  const allocations: OverheadAllocationItem[] = eligible.map(e => {
    const pct = e.revenue / totalRevenue;
    const allocated = Math.round(pct * poolTotal * 100) / 100;
    return {
      contractId: e.contract.id,
      contractName: e.contract.nome,
      contractCode: e.contract.codigo,
      clientName: e.clientName,
      monthlyRevenue: e.revenue,
      allocationPercent: pct * 100,
      overheadAllocated: allocated,
      contractStatus: STATUS_LABELS[e.contract.status] ?? e.contract.status,
    };
  });

  // Fix rounding residual — apply to largest contract
  const sumAllocated = allocations.reduce((s, a) => s + a.overheadAllocated, 0);
  const residual = Math.round((poolTotal - sumAllocated) * 100) / 100;

  if (residual !== 0 && allocations.length > 0) {
    // Find the contract with highest overhead
    const largest = allocations.reduce((max, a) =>
      a.overheadAllocated > max.overheadAllocated ? a : max,
      allocations[0]
    );
    largest.overheadAllocated = Math.round((largest.overheadAllocated + residual) * 100) / 100;
    largest.roundingAdjustment = residual;
  }

  const totalAllocated = allocations.reduce((s, a) => s + a.overheadAllocated, 0);

  // Sort by overhead allocated desc
  allocations.sort((a, b) => b.overheadAllocated - a.overheadAllocated);

  return { allocations, pending, totalRevenue, totalAllocated: Math.round(totalAllocated * 100) / 100, poolTotal };
}
