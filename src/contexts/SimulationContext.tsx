import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ContractSimulation } from '@/types';
import { mockSimulations } from '@/data/mockSimulations';

const STORAGE_KEY = 'bnp_simulations';

interface SimulationContextType {
  simulations: ContractSimulation[];
  addSimulation: (sim: ContractSimulation) => void;
  updateSimulation: (sim: ContractSimulation) => void;
  deleteSimulation: (id: string) => void;
  duplicateSimulation: (id: string) => ContractSimulation;
  getSimulation: (id: string) => ContractSimulation | undefined;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

function loadFromStorage(): ContractSimulation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return mockSimulations;
}

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const [simulations, setSimulations] = useState<ContractSimulation[]>(loadFromStorage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(simulations));
  }, [simulations]);

  const addSimulation = useCallback((sim: ContractSimulation) => {
    setSimulations(prev => [sim, ...prev]);
  }, []);

  const updateSimulation = useCallback((sim: ContractSimulation) => {
    setSimulations(prev => prev.map(s => s.id === sim.id ? { ...sim, updatedAt: new Date().toISOString() } : s));
  }, []);

  const deleteSimulation = useCallback((id: string) => {
    setSimulations(prev => prev.filter(s => s.id !== id));
  }, []);

  const duplicateSimulation = useCallback((id: string): ContractSimulation => {
    const original = simulations.find(s => s.id === id);
    if (!original) throw new Error('Simulation not found');
    const dup: ContractSimulation = {
      ...JSON.parse(JSON.stringify(original)),
      id: `sim-${Date.now()}`,
      name: `${original.name} (cópia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSimulations(prev => [dup, ...prev]);
    return dup;
  }, [simulations]);

  const getSimulation = useCallback((id: string) => simulations.find(s => s.id === id), [simulations]);

  return (
    <SimulationContext.Provider value={{ simulations, addSimulation, updateSimulation, deleteSimulation, duplicateSimulation, getSimulation }}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulations() {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error('useSimulations must be used within SimulationProvider');
  return ctx;
}
