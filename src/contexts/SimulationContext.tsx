import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { ContractSimulation, SimulationHRItem, SimulationOtherCost } from '@/types';
import {
  simulationFromDb, simulationToDb,
  simulationHRFromDb, simulationHRToDb,
  simulationOtherCostFromDb, simulationOtherCostToDb,
} from '@/lib/dbMappers';

interface SimulationContextType {
  simulations: ContractSimulation[];
  loading: boolean;
  addSimulation: (sim: ContractSimulation) => Promise<void>;
  updateSimulation: (sim: ContractSimulation) => Promise<void>;
  deleteSimulation: (id: string) => Promise<void>;
  duplicateSimulation: (id: string) => Promise<ContractSimulation>;
  getSimulation: (id: string) => ContractSimulation | undefined;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

async function persistSimulation(sim: ContractSimulation): Promise<void> {
  // Upsert main simulation row
  const { error: simError } = await supabase
    .from('simulations')
    .upsert(simulationToDb(sim))
    .eq('id', sim.id);
  if (simError) throw simError;

  // Delete existing child rows then re-insert
  await Promise.all([
    supabase.from('simulation_hr_items').delete().eq('simulation_id', sim.id),
    supabase.from('simulation_other_costs').delete().eq('simulation_id', sim.id),
  ]);

  const hrRows = [
    ...sim.suggestedHR.map(item => simulationHRToDb({ ...item, isSuggested: true, simulationId: sim.id })),
    ...sim.customHR.map(item => simulationHRToDb({ ...item, isSuggested: false, simulationId: sim.id })),
  ];
  const costRows = [
    ...sim.suggestedOtherCosts.map(item => simulationOtherCostToDb({ ...item, isSuggested: true, simulationId: sim.id })),
    ...sim.customOtherCosts.map(item => simulationOtherCostToDb({ ...item, isSuggested: false, simulationId: sim.id })),
  ];

  if (hrRows.length > 0) {
    const { error } = await supabase.from('simulation_hr_items').insert(hrRows as any);
    if (error) throw error;
  }
  if (costRows.length > 0) {
    const { error } = await supabase.from('simulation_other_costs').insert(costRows as any);
    if (error) throw error;
  }
}

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [simulations, setSimulations] = useState<ContractSimulation[]>([]);
  const [loading, setLoading] = useState(true);

  const handleError = useCallback((err: unknown, msg: string) => {
    console.error(msg, err);
    toast({ title: 'Erro', description: msg, variant: 'destructive' });
  }, [toast]);

  useEffect(() => {
    const loadSimulations = async () => {
      setLoading(true);
      try {
        const { data: simRows, error } = await supabase
          .from('simulations')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;

        if (!simRows || simRows.length === 0) {
          setSimulations([]);
          return;
        }

        const ids = simRows.map(r => (r as unknown as Record<string, unknown>).id as string);

        const [{ data: hrRows }, { data: costRows }] = await Promise.all([
          supabase.from('simulation_hr_items').select('*').in('simulation_id', ids),
          supabase.from('simulation_other_costs').select('*').in('simulation_id', ids),
        ]);

        const hrBySimId: Record<string, (SimulationHRItem & { isSuggested: boolean })[]> = {};
        (hrRows ?? []).forEach(r => {
          const mapped = simulationHRFromDb(r as unknown as Record<string, unknown>);
          const sid = (r as unknown as Record<string, unknown>).simulation_id as string;
          if (!hrBySimId[sid]) hrBySimId[sid] = [];
          hrBySimId[sid].push(mapped);
        });

        const costBySimId: Record<string, (SimulationOtherCost & { isSuggested: boolean })[]> = {};
        (costRows ?? []).forEach(r => {
          const mapped = simulationOtherCostFromDb(r as unknown as Record<string, unknown>);
          const sid = (r as unknown as Record<string, unknown>).simulation_id as string;
          if (!costBySimId[sid]) costBySimId[sid] = [];
          costBySimId[sid].push(mapped);
        });

        const sims = simRows.map(r => {
          const row = r as unknown as Record<string, unknown>;
          const id = row.id as string;
          return simulationFromDb(row, hrBySimId[id] ?? [], costBySimId[id] ?? []);
        });

        setSimulations(sims);
      } catch (err) {
        handleError(err, 'Erro ao carregar simulações.');
      } finally {
        setLoading(false);
      }
    };

    loadSimulations();
  }, []);

  const addSimulation = useCallback(async (sim: ContractSimulation): Promise<void> => {
    setSimulations(prev => [sim, ...prev]);
    try {
      await persistSimulation(sim);
    } catch (err) {
      setSimulations(prev => prev.filter(s => s.id !== sim.id));
      handleError(err, 'Erro ao salvar simulação.');
    }
  }, [handleError]);

  const updateSimulation = useCallback(async (sim: ContractSimulation): Promise<void> => {
    const updated = { ...sim, updatedAt: new Date().toISOString() };
    setSimulations(prev => prev.map(s => s.id === sim.id ? updated : s));
    try {
      await persistSimulation(updated);
    } catch (err) {
      handleError(err, 'Erro ao atualizar simulação.');
    }
  }, [handleError]);

  const deleteSimulation = useCallback(async (id: string): Promise<void> => {
    const snapshot = simulations;
    setSimulations(prev => prev.filter(s => s.id !== id));
    const { error } = await supabase.from('simulations').delete().eq('id', id);
    if (error) {
      setSimulations(snapshot);
      handleError(error, 'Erro ao excluir simulação.');
    }
  }, [simulations, handleError]);

  const duplicateSimulation = useCallback(async (id: string): Promise<ContractSimulation> => {
    const original = simulations.find(s => s.id === id);
    if (!original) throw new Error('Simulation not found');
    const now = new Date().toISOString();
    const dup: ContractSimulation = {
      ...JSON.parse(JSON.stringify(original)),
      id: `sim-${Date.now()}`,
      name: `${original.name} (cópia)`,
      createdAt: now,
      updatedAt: now,
    };
    setSimulations(prev => [dup, ...prev]);
    try {
      await persistSimulation(dup);
    } catch (err) {
      setSimulations(prev => prev.filter(s => s.id !== dup.id));
      handleError(err, 'Erro ao duplicar simulação.');
      throw err;
    }
    return dup;
  }, [simulations, handleError]);

  const getSimulation = useCallback((id: string) => simulations.find(s => s.id === id), [simulations]);

  return (
    <SimulationContext.Provider value={{ simulations, loading, addSimulation, updateSimulation, deleteSimulation, duplicateSimulation, getSimulation }}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulations() {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error('useSimulations must be used within SimulationProvider');
  return ctx;
}
