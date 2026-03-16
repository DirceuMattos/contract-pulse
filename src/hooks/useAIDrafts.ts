import { useState, useEffect, useCallback } from 'react';
import { Draft } from '@/types/aiDrafts';

const STORAGE_KEY = 'ai-drafts';

function readDrafts(): Draft[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeDrafts(drafts: Draft[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
}

export function useAIDrafts() {
  const [drafts, setDrafts] = useState<Draft[]>(() => readDrafts());

  useEffect(() => {
    writeDrafts(drafts);
  }, [drafts]);

  const addDraft = useCallback((draft: Draft) => {
    setDrafts(prev => [draft, ...prev]);
  }, []);

  const updateDraft = useCallback((id: string, updates: Partial<Draft>) => {
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d));
  }, []);

  const deleteDraft = useCallback((id: string) => {
    setDrafts(prev => prev.filter(d => d.id !== id));
  }, []);

  const duplicateDraft = useCallback((id: string) => {
    const original = drafts.find(d => d.id === id);
    if (!original) return;
    const copy: Draft = {
      ...original,
      id: crypto.randomUUID(),
      status: 'rascunho',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setDrafts(prev => [copy, ...prev]);
  }, [drafts]);

  return { drafts, addDraft, updateDraft, deleteDraft, duplicateDraft };
}
