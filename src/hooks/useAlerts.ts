import { useMemo, useEffect, useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { useResolvedResources } from '@/hooks/useResolvedResources';
import { useOverheadPool } from '@/hooks/useOverheadPool';
import { generateAlerts, countAlertsBySeverity, groupAlertsByContract } from '@/lib/alertGenerator';
import { Alert } from '@/types';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook que gera alertas automáticos baseados nos dados e configurações
 */
export function useAlerts() {
  const { contracts, resources: _raw, settings, snapshots, overheadItems, historyEvents } = useData();
  const { resolvedResources: resources, brokenLinkCount } = useResolvedResources();
  const { result: overheadResult } = useOverheadPool();

  const centralOverheadMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of overheadResult.allocations) {
      map.set(a.contractId, a.overheadAllocated);
    }
    return map;
  }, [overheadResult]);
  
  const alerts = useMemo(() => {
    const generated = generateAlerts({
      contracts,
      resources,
      settings,
      snapshots,
      overheadItems,
      historyEvents,
      centralOverheadMap,
    });
    
    // Add broken link alert if any
    if (brokenLinkCount > 0) {
      generated.push({
        id: 'alert-broken-hr-links',
        contractId: '',
        type: 'hr-links-quebrados',
        severity: 'atencao',
        alertCategory: 'governanca',
        title: `${brokenLinkCount} vínculo${brokenLinkCount > 1 ? 's' : ''} quebrado${brokenLinkCount > 1 ? 's' : ''} com RH Mestre`,
        description: `Existem ${brokenLinkCount} recurso${brokenLinkCount > 1 ? 's' : ''} vinculado${brokenLinkCount > 1 ? 's' : ''} a pessoas que não existem mais no cadastro de RH. Os custos desses recursos podem estar desatualizados.`,
        recommendation: 'Acesse os contratos afetados e corrija os vínculos dos recursos com o RH Mestre.',
        createdAt: new Date().toISOString(),
      });
    }
    
    return generated;
  }, [contracts, resources, settings, snapshots, overheadItems, historyEvents, brokenLinkCount, centralOverheadMap]);
  
  const counts = useMemo(() => countAlertsBySeverity(alerts), [alerts]);
  
  const groupedByContract = useMemo(() => groupAlertsByContract(alerts), [alerts]);
  
  const getAlertsForContract = (contractId: string): Alert[] => {
    return groupedByContract.get(contractId) || [];
  };
  
  return {
    alerts,
    criticalCount: counts.critico,
    warningCount: counts.atencao,
    infoCount: counts.info,
    totalCount: alerts.length,
    groupedByContract,
    getAlertsForContract,
  };
}
