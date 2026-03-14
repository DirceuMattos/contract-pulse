import { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { calculateOverheadAllocation, OverheadAllocationResult } from '@/lib/overheadAllocation';

interface OverheadCentralPool {
  administrativo: number;
  infraestrutura: number;
  governanca: number;
  indiretos: number;
  consultoria: number;
}

interface ContractAllocation {
  percent: number;
  value: number;
  isPending: boolean;
  pendingReason?: string;
}

function readPool(): number {
  try {
    const raw = localStorage.getItem('overhead-central');
    if (!raw) return 0;
    const pool: OverheadCentralPool = JSON.parse(raw);
    return (pool.administrativo || 0) + (pool.infraestrutura || 0) + (pool.governanca || 0) + (pool.indiretos || 0) + (pool.consultoria || 0);
  } catch {
    return 0;
  }
}

export function useOverheadPool() {
  const { contracts, clients } = useData();

  const poolTotal = useMemo(() => readPool(), []);

  const result: OverheadAllocationResult = useMemo(
    () => calculateOverheadAllocation(contracts, clients, poolTotal),
    [contracts, clients, poolTotal],
  );

  const allocationMap = useMemo(() => {
    const map = new Map<string, ContractAllocation>();
    for (const a of result.allocations) {
      map.set(a.contractId, { percent: a.allocationPercent, value: a.overheadAllocated, isPending: false });
    }
    for (const p of result.pending) {
      map.set(p.contractId, { percent: 0, value: 0, isPending: true, pendingReason: p.reason });
    }
    return map;
  }, [result]);

  const getAllocation = (contractId: string): ContractAllocation => {
    return allocationMap.get(contractId) || { percent: 0, value: 0, isPending: false };
  };

  return { poolTotal, getAllocation, result };
}
