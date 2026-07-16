// v2 - reposicoes enriquecidas + dedup por pessoa
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ReplacementForVaga {
  id: string;
  allIds: string[];          // todas as reposições da mesma pessoa+status
  hr_person_id: string;
  contract_id: string;
  resource_id: string;
  pessoaNome: string;
  cargoId: string | null;
  cargoLabel: string | null;
  nivel: string | null;
  status: string;
  jaTemVaga: boolean;
}

export function usePendingReplacementsForVaga() {
  const [items, setItems] = useState<ReplacementForVaga[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    // pending (a decidir) + removed (marcadas como "não repor", reversíveis)
    const { data: reps } = await supabase
      .from('pending_replacements')
      .select('id, hr_person_id, contract_id, resource_id, status, hr_people(nome, cargo_id, nivel, job_titles(label))')
      .in('status', ['pending', 'removed']);

    const { data: vagas } = await supabase
      .from('job_requests')
      .select('pending_replacement_id')
      .not('pending_replacement_id', 'is', null);
    const jaVinculadas = new Set((vagas ?? []).map((v: any) => v.pending_replacement_id));

    const raw: ReplacementForVaga[] = (reps ?? []).map((r: any) => ({
      id: r.id,
      allIds: [r.id],
      hr_person_id: r.hr_person_id,
      contract_id: r.contract_id,
      resource_id: r.resource_id,
      pessoaNome: r.hr_people?.nome ?? '—',
      cargoId: r.hr_people?.cargo_id ?? null,
      cargoLabel: r.hr_people?.job_titles?.label ?? null,
      nivel: r.hr_people?.nivel ?? null,
      status: r.status,
      jaTemVaga: jaVinculadas.has(r.id),
    }));

    // Deduplica por pessoa+status: o Feedz cria 1 reposição por resource/alocação,
    // gerando várias linhas para quem tinha múltiplas alocações. Mostra 1 por
    // pessoa (mantém a primeira; prioriza a que já tem vaga para não sumir o vínculo).
    const byKey = new Map<string, ReplacementForVaga>();
    for (const r of raw) {
      const key = `${r.hr_person_id}|${r.status}`;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, r);
      } else {
        existing.allIds.push(r.id);
        // prioriza manter como "representante" a que já tem vaga
        if (r.jaTemVaga && !existing.jaTemVaga) {
          existing.id = r.id;
          existing.jaTemVaga = true;
        }
      }
    }
    const mapped = Array.from(byKey.values());
    setItems(mapped);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { items, loading, reload: load };
}
