import { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { generateAlerts, countAlertsBySeverity, groupAlertsByContract } from '@/lib/alertGenerator';
import { Alert } from '@/types';

/**
 * Hook que gera alertas automáticos baseados nos dados e configurações
 */
export function useAlerts() {
  const { contracts, resources, settings, snapshots } = useData();
  
  const alerts = useMemo(() => {
    return generateAlerts({
      contracts,
      resources,
      settings,
      snapshots,
    });
  }, [contracts, resources, settings, snapshots]);
  
  const counts = useMemo(() => countAlertsBySeverity(alerts), [alerts]);
  
  const groupedByContract = useMemo(() => groupAlertsByContract(alerts), [alerts]);
  
  const getAlertsForContract = (contractId: string): Alert[] => {
    return groupedByContract.get(contractId) || [];
  };
  
  return {
    alerts,
    criticalCount: counts.critico,
    warningCount: counts.atencao,
    totalCount: alerts.length,
    groupedByContract,
    getAlertsForContract,
  };
}
