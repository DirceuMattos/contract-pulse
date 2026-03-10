import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useMemo } from 'react';
import { ContractSubproject, SubprojectAllocation, SubprojectStatus } from '@/types';

const LS_HAS_SUBPROJECTS = 'bnp_has_subprojects';

interface SubprojectContextType {
  subprojects: ContractSubproject[];
  allocations: SubprojectAllocation[];

  hasSubprojects: (contractId: string) => boolean;
  setHasSubprojects: (contractId: string, value: boolean) => void;

  addSubproject: (data: Omit<ContractSubproject, 'id' | 'createdAt' | 'updatedAt'>) => ContractSubproject;
  updateSubproject: (id: string, data: Partial<ContractSubproject>) => void;
  deleteSubproject: (id: string) => void;
  getSubprojectsByContract: (contractId: string) => ContractSubproject[];

  addAllocation: (data: Omit<SubprojectAllocation, 'id' | 'createdAt' | 'updatedAt'>) => SubprojectAllocation;
  updateAllocation: (id: string, data: Partial<SubprojectAllocation>) => void;
  deleteAllocation: (id: string) => void;
  getAllocationsBySubproject: (subprojectId: string) => SubprojectAllocation[];
  getAllocationsByContract: (contractId: string) => SubprojectAllocation[];
}

const SubprojectContext = createContext<SubprojectContextType | undefined>(undefined);

const LS_SUBPROJECTS = 'bnp_subprojects';
const LS_ALLOCATIONS = 'bnp_subproject_allocations';

function generateId(): string {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function SubprojectProvider({ children }: { children: ReactNode }) {
  const [hasSubprojectsMap, setHasSubprojectsMap] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(LS_HAS_SUBPROJECTS) || '{}'); } catch { return {}; }
  });
  const [subprojects, setSubprojects] = useState<ContractSubproject[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_SUBPROJECTS) || '[]'); } catch { return []; }
  });
  const [allocations, setAllocations] = useState<SubprojectAllocation[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_ALLOCATIONS) || '[]'); } catch { return []; }
  });

  useEffect(() => { localStorage.setItem(LS_HAS_SUBPROJECTS, JSON.stringify(hasSubprojectsMap)); }, [hasSubprojectsMap]);
  useEffect(() => { localStorage.setItem(LS_SUBPROJECTS, JSON.stringify(subprojects)); }, [subprojects]);
  useEffect(() => { localStorage.setItem(LS_ALLOCATIONS, JSON.stringify(allocations)); }, [allocations]);

  const hasSubprojectsFn = useCallback((contractId: string) => !!hasSubprojectsMap[contractId], [hasSubprojectsMap]);
  const setHasSubprojectsFn = useCallback((contractId: string, value: boolean) => {
    setHasSubprojectsMap(prev => ({ ...prev, [contractId]: value }));
  }, []);

  const addSubproject = useCallback((data: Omit<ContractSubproject, 'id' | 'createdAt' | 'updatedAt'>): ContractSubproject => {
    const now = new Date().toISOString();
    const sp: ContractSubproject = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    setSubprojects(prev => [...prev, sp]);
    return sp;
  }, []);

  const updateSubproject = useCallback((id: string, data: Partial<ContractSubproject>) => {
    setSubprojects(prev => prev.map(sp => sp.id === id ? { ...sp, ...data, updatedAt: new Date().toISOString() } : sp));
  }, []);

  const deleteSubproject = useCallback((id: string) => {
    setSubprojects(prev => prev.filter(sp => sp.id !== id));
    setAllocations(prev => prev.filter(a => a.subprojectId !== id));
  }, []);

  const getSubprojectsByContract = useCallback((contractId: string) =>
    subprojects.filter(sp => sp.contractId === contractId), [subprojects]);

  const addAllocation = useCallback((data: Omit<SubprojectAllocation, 'id' | 'createdAt' | 'updatedAt'>): SubprojectAllocation => {
    const now = new Date().toISOString();
    const alloc: SubprojectAllocation = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    setAllocations(prev => [...prev, alloc]);
    return alloc;
  }, []);

  const updateAllocation = useCallback((id: string, data: Partial<SubprojectAllocation>) => {
    setAllocations(prev => prev.map(a => a.id === id ? { ...a, ...data, updatedAt: new Date().toISOString() } : a));
  }, []);

  const deleteAllocation = useCallback((id: string) => {
    setAllocations(prev => prev.filter(a => a.id !== id));
  }, []);

  const getAllocationsBySubproject = useCallback((subprojectId: string) =>
    allocations.filter(a => a.subprojectId === subprojectId), [allocations]);

  const getAllocationsByContract = useCallback((contractId: string) => {
    const spIds = new Set(subprojects.filter(sp => sp.contractId === contractId).map(sp => sp.id));
    return allocations.filter(a => spIds.has(a.subprojectId));
  }, [subprojects, allocations]);

  return (
    <SubprojectContext.Provider value={{
      subprojects, allocations,
      addSubproject, updateSubproject, deleteSubproject, getSubprojectsByContract,
      addAllocation, updateAllocation, deleteAllocation, getAllocationsBySubproject, getAllocationsByContract,
    }}>
      {children}
    </SubprojectContext.Provider>
  );
}

export function useSubprojects(): SubprojectContextType {
  const ctx = useContext(SubprojectContext);
  if (!ctx) throw new Error('useSubprojects must be used within SubprojectProvider');
  return ctx;
}
