import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface OvertimeEntry {
  id: string;
  hr_person_id: string | null;
  colaborador_nome: string;
  mes: number;
  ano: number;
  regime: string | null;
  area: string | null;
  area_team_id: string | null;
  valor: number;
  horas: number;
  ocorrencias: number;
  historico: string | null;
  origem: string;
  status: string;
}

interface Params {
  year: number | null;  // null = todos os anos
  month: number | null; // null = todos
}

interface Result {
  entries: OvertimeEntry[];
  previousEntries: OvertimeEntry[];
  yearlyComparison: { ano: number; mes: number; total_valor: number; total_horas: number }[];
  availableYears: number[];
  isLoading: boolean;
  refetch: () => void;
}

// A tabela é nova; até o types.ts regenerar, acessamos via client destipado.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

async function fetchPaged(year: number | null, month: number | null): Promise<OvertimeEntry[]> {
  const all: OvertimeEntry[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    let q = db.from('overtime_entries').select('*').range(from, from + pageSize - 1);
    if (year !== null) q = q.eq('ano', year);
    if (month) q = q.eq('mes', month);
    const { data, error } = await q;
    if (error || !data) break;
    all.push(...(data as OvertimeEntry[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

export function useOvertimeData({ year, month }: Params): Result {
  const [entries, setEntries] = useState<OvertimeEntry[]>([]);
  const [previousEntries, setPreviousEntries] = useState<OvertimeEntry[]>([]);
  const [yearlyComparison, setYearlyComparison] = useState<Result['yearlyComparison']>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      try {
        const current = await fetchPaged(year, month);

        // Período anterior (ano-1, mesmo mês) para deltas comparativos.
        const previous = year !== null ? await fetchPaged(year - 1, month) : [];

        // Comparativo anual via RPC (contorna limite de paginação).
        const { data: yearly } = await db.rpc('get_overtime_yearly_totals');
        const { data: years } = await db.rpc('get_overtime_years');

        if (cancelled) return;
        setEntries(current);
        setPreviousEntries(previous);
        setYearlyComparison((yearly ?? []) as Result['yearlyComparison']);
        setAvailableYears(((years ?? []) as { ano: number }[]).map((r) => r.ano));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [year, month, tick]);

  return { entries, previousEntries, yearlyComparison, availableYears, isLoading, refetch };
}
