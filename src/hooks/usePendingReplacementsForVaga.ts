// v1 - reposições pendentes enriquecidas (ponte desligamento -> vaga)
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ReplacementForVaga {
  id: string;                 // pending_replacements.id
  hr_person_id: string;
  contract_id: string;
  resource_id: string;
  pessoaNome: string;
  cargoId: string | null;
  cargoLabel: string | null;
  nivel: string | null;
  jaTemVaga: boolean;         // já existe job_request com este pending_replacement_id
}

export function usePendingReplacementsForVaga() {
  const [items, setItems] = useState<ReplacementForVaga[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    // reposições pendentes + pessoa + cargo
    const { data: reps } = await supabase
      .from('pending_replacements')
      .select('id, hr_person_id, contract_id, resource_id, hr_people(nome, cargo_id, nivel, job_titles(label))')
      .eq('status', 'pending');

    // vagas que já apontam para uma reposição
    const { data: vagas } = await supabase
      .from('job_requests')
      .select('pending_replacement_id')
      .not('pending_replacement_id', 'is', null);
    const jaVinculadas = new Set((vagas ?? []).map((v: any) => v.pending_replacement_id));

    const mapped: ReplacementForVaga[] = (reps ?? []).map((r: any) => ({
      id: r.id,
      hr_person_id: r.hr_person_id,
      contract_id: r.contract_id,
      resource_id: r.resource_id,
      pessoaNome: r.hr_people?.nome ?? '—',
      cargoId: r.hr_people?.cargo_id ?? null,
      cargoLabel: r.hr_people?.job_titles?.label ?? null,
      nivel: r.hr_people?.nivel ?? null,
      jaTemVaga: jaVinculadas.has(r.id),
    }));
    setItems(mapped);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { items, loading, reload: load };
}
