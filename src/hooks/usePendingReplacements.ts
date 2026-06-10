import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PendingReplacement {
  id: string;
  hr_person_id: string;
  resource_id: string;
  contract_id: string;
  status: 'pending' | 'replaced' | 'removed';
}

/**
 * Fetches all pending (status='pending') replacements and exposes
 * lookup helpers + a refresh function.
 */
export function usePendingReplacements() {
  const [items, setItems] = useState<PendingReplacement[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('pending_replacements')
      .select('id, hr_person_id, resource_id, contract_id, status')
      .eq('status', 'pending');
    setItems((data as PendingReplacement[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const isPending = useCallback(
    (resourceId: string, contractId: string) =>
      items.some(p => p.resource_id === resourceId && p.contract_id === contractId),
    [items]
  );

  const findByResource = useCallback(
    (resourceId: string, contractId: string) =>
      items.find(p => p.resource_id === resourceId && p.contract_id === contractId),
    [items]
  );

  const isPendingByPerson = useCallback(
    (hrPersonId: string) => items.some(p => p.hr_person_id === hrPersonId),
    [items]
  );

  return { items, count: items.length, loading, refresh: load, isPending, findByResource, isPendingByPerson };
}
