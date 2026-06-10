import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TransportRide {
  id: string;
  ride_id: string | null;
  collaborator_name: string | null;
  collaborator_email: string | null;
  supervisor_name: string | null;
  value: number | null;
  distance_km: number | null;
  origin_address: string | null;
  destination_address: string | null;
  origin_city: string | null;
  category: string | null;
  ride_start_at: string | null;
  ride_end_at: string | null;
  month: number | null;
  year: number | null;
}

interface Params {
  year: number | null; // null = todos os anos
  month: number | null; // null = todos
}

interface Result {
  rides: TransportRide[];
  previousRides: TransportRide[];
  last3Months: TransportRide[];
  yearlyComparison: TransportRide[];
  availableYears: number[];
  isLoading: boolean;
  refetch: () => void;
}

export function useTransportData({ year, month }: Params): Result {
  const [rides, setRides] = useState<TransportRide[]>([]);
  const [previousRides, setPreviousRides] = useState<TransportRide[]>([]);
  const [last3Months, setLast3Months] = useState<TransportRide[]>([]);
  const [yearlyComparison, setYearlyComparison] = useState<TransportRide[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      try {
        // Período atual com paginação manual
        const allRides: any[] = [];
        let from = 0;
        const pageSize = 1000;
        while (true) {
          let q = supabase.from('transport_rides').select('*').range(from, from + pageSize - 1);
          if (year !== null) q = q.eq('year', year);
          if (month) q = q.eq('month', month);
          const { data: page } = await q;
          if (!page || page.length === 0) break;
          allRides.push(...page);
          if (page.length < pageSize) break;
          from += pageSize;
        }

        // Período anterior (somente quando ano específico)
        let prev: any[] | null = [];
        if (year !== null) {
          let qp = supabase.from('transport_rides').select('*').eq('year', year - 1).range(0, 99999);
          if (month) qp = qp.eq('month', month);
          const { data } = await qp;
          prev = data;
        }

        // Últimos 3 meses corridos
        const now = new Date();
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        const { data: last3 } = await supabase
          .from('transport_rides')
          .select('*')
          .gte('ride_start_at', threeMonthsAgo.toISOString())
          .limit(100000);

        // Comparativo: via RPC para contornar limite de paginação
        const { data: yearly } = await supabase.rpc('get_transport_yearly_totals');

        // Anos disponíveis: via RPC
        const { data: years } = await supabase.rpc('get_transport_years');

        if (cancelled) return;
        setRides(allRides as TransportRide[]);
        setPreviousRides((prev || []) as TransportRide[]);
        setLast3Months((last3 || []) as TransportRide[]);
        setYearlyComparison(
          ((yearly || []) as any[]).map((r: any) => ({
            year: r.year,
            month: r.month,
            value: r.total,
          })) as TransportRide[],
        );
        const unique = ((years || []) as any[]).map((r: any) => r.year).filter(Boolean);
        setAvailableYears(unique as number[]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [year, month, tick]);

  return { rides, previousRides, last3Months, yearlyComparison, availableYears, isLoading, refetch };
}
