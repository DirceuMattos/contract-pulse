import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { HRPerson, HRTimelineEvent } from '@/types';
import { hrPersonFromDb, hrPersonToDb, hrTimelineFromDb, hrTimelineToDb } from '@/lib/dbMappers';
import { useAuth } from '@/contexts/AuthContext';
import { maskPersonName, maskPersonEmail } from '@/lib/demoMask';

interface HRContextType {
  hrPeople: HRPerson[];
  hrTimeline: HRTimelineEvent[];
  loading: boolean;

  addPerson: (data: Omit<HRPerson, 'id' | 'createdAt' | 'updatedAt'>) => Promise<HRPerson>;
  updatePerson: (id: string, data: Partial<HRPerson>) => Promise<void>;
  deletePerson: (id: string) => Promise<void>;
  getPerson: (id: string) => HRPerson | undefined;
  getActivePersons: () => HRPerson[];

  addTimelineEvent: (data: Omit<HRTimelineEvent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<HRTimelineEvent>;
  updateTimelineEvent: (id: string, data: Partial<HRTimelineEvent>) => Promise<void>;
  deleteTimelineEvent: (id: string) => Promise<void>;
  getTimelineByPerson: (personId: string) => HRTimelineEvent[];
}

const HRContext = createContext<HRContextType | undefined>(undefined);

export function HRProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { toast } = useToast();
  const { userRole } = useAuth();
  const [hrPeople, setHrPeople] = useState<HRPerson[]>([]);
  const [hrTimeline, setHrTimeline] = useState<HRTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  const handleError = useCallback((err: unknown, message: string) => {
    console.error(message, err);
    toast({ title: 'Erro', description: message, variant: 'destructive' });
  }, [toast]);

  useEffect(() => {
    let cancelled = false;

    const loadAll = async () => {
      setLoading(true);
      try {
        const [{ data: peopleData }, { data: timelineData }] = await Promise.all([
          supabase.from('hr_people').select('*').order('nome'),
          supabase.from('hr_timeline').select('*').order('event_date', { ascending: false }),
        ]);
        if (!cancelled) {
          setHrPeople((peopleData ?? []).map(r => hrPersonFromDb(r as unknown as Record<string, unknown>)));
          setHrTimeline((timelineData ?? []).map(r => hrTimelineFromDb(r as unknown as Record<string, unknown>)));
        }
      } catch (err) {
        if (!cancelled) handleError(err, 'Erro ao carregar dados de RH.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadAll();
      } else if (event === 'SIGNED_OUT') {
        setHrPeople([]);
        setHrTimeline([]);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) loadAll();
      else setLoading(false);
    });

    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  // ─── PEOPLE ───────────────────────────────────────────────────────────────────
  const addPerson = useCallback(async (data: Omit<HRPerson, 'id' | 'createdAt' | 'updatedAt'>): Promise<HRPerson> => {
    const { data: row, error } = await supabase.from('hr_people').insert(hrPersonToDb(data) as any).select().single();
    if (error) { handleError(error, 'Erro ao adicionar pessoa.'); throw error; }
    const person = hrPersonFromDb(row as unknown as Record<string, unknown>);
    setHrPeople(prev => [...prev, person].sort((a, b) => a.nome.localeCompare(b.nome)));
    return person;
  }, [handleError]);

  const updatePerson = useCallback(async (id: string, data: Partial<HRPerson>): Promise<void> => {
    const prev = hrPeople.find(p => p.id === id)!;
    if (!prev) return;
    const merged = { ...prev, ...data };
    setHrPeople(prevList => prevList.map(p => p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p));
    const { error } = await supabase.from('hr_people').update(hrPersonToDb(merged)).eq('id', id);
    if (error) { setHrPeople(prevList => prevList.map(p => p.id === id ? prev : p)); handleError(error, 'Erro ao atualizar pessoa.'); }
  }, [hrPeople, handleError]);

  const deletePerson = useCallback(async (id: string): Promise<void> => {
    const snapshot = hrPeople;
    setHrPeople(prev => prev.filter(p => p.id !== id));
    setHrTimeline(prev => prev.filter(t => t.personId !== id));
    const { error } = await supabase.from('hr_people').delete().eq('id', id);
    if (error) { setHrPeople(snapshot); handleError(error, 'Erro ao excluir pessoa.'); }
  }, [hrPeople, handleError]);

  const getPerson = useCallback((id: string) => hrPeople.find(p => p.id === id), [hrPeople]);
  const getActivePersons = useCallback(() => hrPeople.filter(p => p.situacao === 'ativo'), [hrPeople]);

  // ─── TIMELINE ─────────────────────────────────────────────────────────────────
  const addTimelineEvent = useCallback(async (data: Omit<HRTimelineEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<HRTimelineEvent> => {
    const { data: row, error } = await supabase.from('hr_timeline').insert(hrTimelineToDb(data) as any).select().single();
    if (error) { handleError(error, 'Erro ao adicionar evento.'); throw error; }
    const event = hrTimelineFromDb(row as unknown as Record<string, unknown>);
    setHrTimeline(prev => [event, ...prev]);

    // If atualizarRemuneracao is true, update the person's salary
    if (data.atualizarRemuneracao && data.remuneracaoApos !== undefined) {
      await updatePerson(data.personId, {
        remuneracaoMensal: data.remuneracaoApos,
        ...(data.beneficiosApos !== undefined ? { beneficios: data.beneficiosApos } : {}),
      });
    }
    return event;
  }, [handleError, updatePerson]);

  const updateTimelineEvent = useCallback(async (id: string, data: Partial<HRTimelineEvent>): Promise<void> => {
    const prev = hrTimeline.find(e => e.id === id)!;
    if (!prev) return;
    const merged = { ...prev, ...data };
    setHrTimeline(prevList => prevList.map(e => e.id === id ? { ...e, ...data, updatedAt: new Date().toISOString() } : e));
    const { error } = await supabase.from('hr_timeline').update(hrTimelineToDb(merged)).eq('id', id);
    if (error) { setHrTimeline(prevList => prevList.map(e => e.id === id ? prev : e)); handleError(error, 'Erro ao atualizar evento.'); }
  }, [hrTimeline, handleError]);

  const deleteTimelineEvent = useCallback(async (id: string): Promise<void> => {
    setHrTimeline(prev => prev.filter(e => e.id !== id));
    const { error } = await supabase.from('hr_timeline').delete().eq('id', id);
    if (error) handleError(error, 'Erro ao excluir evento.');
  }, [handleError]);

  const getTimelineByPerson = useCallback((personId: string) =>
    hrTimeline.filter(e => e.personId === personId).sort((a, b) =>
      new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
    ), [hrTimeline]);

  return (
    <HRContext.Provider value={{
      hrPeople, hrTimeline, loading,
      addPerson, updatePerson, deletePerson, getPerson, getActivePersons,
      addTimelineEvent, updateTimelineEvent, deleteTimelineEvent, getTimelineByPerson,
    }}>
      {children}
    </HRContext.Provider>
  );
}

export function useHR(): HRContextType {
  const ctx = useContext(HRContext);
  if (!ctx) throw new Error('useHR must be used within HRProvider');
  return ctx;
}
