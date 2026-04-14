import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useMemo } from 'react';
import { ContractSubproject, SubprojectAllocation, SubprojectStatus } from '@/types';
import { supabase } from '@/integrations/supabase/client';

interface SubprojectContextType {
  subprojects: ContractSubproject[];
  allocations: SubprojectAllocation[];
  loading: boolean;

  hasSubprojects: (contractId: string) => boolean;
  setHasSubprojects: (contractId: string, value: boolean) => void;

  addSubproject: (data: Omit<ContractSubproject, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ContractSubproject>;
  updateSubproject: (id: string, data: Partial<ContractSubproject>) => Promise<void>;
  deleteSubproject: (id: string) => Promise<void>;
  getSubprojectsByContract: (contractId: string) => ContractSubproject[];

  addAllocation: (data: Omit<SubprojectAllocation, 'id' | 'createdAt' | 'updatedAt'>) => Promise<SubprojectAllocation>;
  updateAllocation: (id: string, data: Partial<SubprojectAllocation>) => Promise<void>;
  deleteAllocation: (id: string) => Promise<void>;
  getAllocationsBySubproject: (subprojectId: string) => SubprojectAllocation[];
  getAllocationsByContract: (contractId: string) => SubprojectAllocation[];

  refreshData: () => Promise<void>;
}

const SubprojectContext = createContext<SubprojectContextType | undefined>(undefined);

function mapSubproject(row: any): ContractSubproject {
  return {
    id: row.id,
    contractId: row.contract_id,
    name: row.name,
    description: row.description || undefined,
    status: row.status as SubprojectStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAllocation(row: any): SubprojectAllocation {
  return {
    id: row.id,
    subprojectId: row.subproject_id,
    hrPersonId: row.hr_person_id || null,
    resourceId: row.resource_id || null,
    overheadItemId: row.overhead_item_id || null,
    dedicationPercent: Number(row.dedication_percent),
    costValue: row.cost_value != null ? Number(row.cost_value) : null,
    notes: row.notes || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function SubprojectProvider({ children }: { children: ReactNode }) {
  const [subprojects, setSubprojects] = useState<ContractSubproject[]>([]);
  const [allocations, setAllocations] = useState<SubprojectAllocation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [spRes, allocRes] = await Promise.all([
        supabase.from('contract_subprojects').select('*').order('created_at'),
        supabase.from('subproject_allocations').select('*').order('created_at'),
      ]);
      if (spRes.data) setSubprojects(spRes.data.map(mapSubproject));
      if (allocRes.data) setAllocations(allocRes.data.map(mapAllocation));
    } catch (e) {
      console.error('SubprojectContext fetch error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync with auth state like other contexts
  useEffect(() => {
    // Initial fetch if already signed in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) fetchData();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchData();
      } else if (event === 'SIGNED_OUT') {
        setSubprojects([]);
        setAllocations([]);
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchData]);

  // hasSubprojects checks the persisted flag on the contract OR actual subproject records
  const hasSubprojectsFn = useCallback((contractId: string) => {
    return subprojects.some(sp => sp.contractId === contractId);
  }, [subprojects]);

  const setHasSubprojectsFn = useCallback(async (contractId: string, value: boolean) => {
    try {
      await supabase.from('contracts').update({ has_subprojects: value } as any).eq('id', contractId);
    } catch (e) {
      console.error('Failed to update has_subprojects', e);
    }
  }, []);

  const addSubproject = useCallback(async (data: Omit<ContractSubproject, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContractSubproject> => {
    const { data: rows, error } = await supabase.from('contract_subprojects').insert({
      contract_id: data.contractId,
      name: data.name,
      description: data.description || null,
      status: data.status,
    }).select().single();
    if (error) throw error;
    const sp = mapSubproject(rows);
    setSubprojects(prev => [...prev, sp]);
    return sp;
  }, []);

  const updateSubproject = useCallback(async (id: string, data: Partial<ContractSubproject>) => {
    const update: any = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.description !== undefined) update.description = data.description;
    if (data.status !== undefined) update.status = data.status;
    const { error } = await supabase.from('contract_subprojects').update(update).eq('id', id);
    if (error) throw error;
    setSubprojects(prev => prev.map(sp => sp.id === id ? { ...sp, ...data, updatedAt: new Date().toISOString() } : sp));
  }, []);

  const deleteSubproject = useCallback(async (id: string) => {
    const { error } = await supabase.from('contract_subprojects').delete().eq('id', id);
    if (error) throw error;
    setSubprojects(prev => prev.filter(sp => sp.id !== id));
    setAllocations(prev => prev.filter(a => a.subprojectId !== id));
  }, []);

  const getSubprojectsByContract = useCallback((contractId: string) =>
    subprojects.filter(sp => sp.contractId === contractId), [subprojects]);

  const addAllocation = useCallback(async (data: Omit<SubprojectAllocation, 'id' | 'createdAt' | 'updatedAt'>): Promise<SubprojectAllocation> => {
    const { data: rows, error } = await supabase.from('subproject_allocations').insert({
      subproject_id: data.subprojectId,
      hr_person_id: data.hrPersonId || null,
      resource_id: data.resourceId || null,
      overhead_item_id: data.overheadItemId || null,
      dedication_percent: data.dedicationPercent,
      cost_value: data.costValue ?? null,
      notes: data.notes || null,
    }).select().single();
    if (error) throw error;
    const alloc = mapAllocation(rows);
    setAllocations(prev => [...prev, alloc]);
    return alloc;
  }, []);

  const updateAllocation = useCallback(async (id: string, data: Partial<SubprojectAllocation>) => {
    const update: any = {};
    if (data.dedicationPercent !== undefined) update.dedication_percent = data.dedicationPercent;
    if (data.costValue !== undefined) update.cost_value = data.costValue;
    if (data.notes !== undefined) update.notes = data.notes;
    if (data.hrPersonId !== undefined) update.hr_person_id = data.hrPersonId;
    if (data.resourceId !== undefined) update.resource_id = data.resourceId;
    if (data.overheadItemId !== undefined) update.overhead_item_id = data.overheadItemId;
    const { error } = await supabase.from('subproject_allocations').update(update).eq('id', id);
    if (error) throw error;
    setAllocations(prev => prev.map(a => a.id === id ? { ...a, ...data, updatedAt: new Date().toISOString() } : a));
  }, []);

  const deleteAllocation = useCallback(async (id: string) => {
    const { error } = await supabase.from('subproject_allocations').delete().eq('id', id);
    if (error) throw error;
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
      subprojects, allocations, loading,
      hasSubprojects: hasSubprojectsFn, setHasSubprojects: setHasSubprojectsFn,
      addSubproject, updateSubproject, deleteSubproject, getSubprojectsByContract,
      addAllocation, updateAllocation, deleteAllocation, getAllocationsBySubproject, getAllocationsByContract,
      refreshData: fetchData,
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
