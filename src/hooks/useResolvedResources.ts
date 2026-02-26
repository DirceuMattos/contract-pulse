import { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useHR } from '@/contexts/HRContext';
import { resolveResourceForCalc } from '@/lib/resourceResolver';
import type { Resource, HRPerson } from '@/types';

/**
 * Returns resources with HR Master data resolved (custoBase, tipo).
 * Also returns a count of broken links (hrPersonId set but person missing).
 */
export function useResolvedResources() {
  const { resources } = useData();
  const { hrPeople } = useHR();

  const peopleMap = useMemo(
    () => new Map(hrPeople.map(p => [p.id, p])),
    [hrPeople]
  );

  const resolvedResources = useMemo(
    () => resources.map(r => resolveResourceForCalc(r, peopleMap)),
    [resources, peopleMap]
  );

  const brokenLinkCount = useMemo(
    () => resources.filter(r => r.hrPersonId && !peopleMap.has(r.hrPersonId)).length,
    [resources, peopleMap]
  );

  return { resolvedResources, brokenLinkCount };
}
