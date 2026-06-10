import { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useHR } from '@/contexts/HRContext';

export interface UnderutilizedPerson {
  personId: string;
  nome: string;
  tipoVinculo: string;
  totalPercent: number;
  threshold: number;
  gap: number; // threshold - totalPercent
  availableContracts: { id: string; nome: string; clientName: string }[];
}

export function useUnderutilized() {
  const { resources, contracts, clients, settings } = useData();
  const { hrPeople } = useHR();

  const underutilized = useMemo(() => {
    const threshold = settings?.thresholdSubocupacao ?? 50;

    // Contratos ativos elegíveis
    const activeContractIds = new Set(
      contracts
        .filter(c => c.status === 'operacao' || c.status === 'implantacao')
        .map(c => c.id)
    );

    // Calcular dedicação total por pessoa
    const dedicacaoMap = new Map<string, number>();
    resources
      .filter(r => (r.tipo === 'clt' || r.tipo === 'pj') && r.hrPersonId && activeContractIds.has(r.contractId))
      .forEach(r => {
        const current = dedicacaoMap.get(r.hrPersonId!) || 0;
        dedicacaoMap.set(r.hrPersonId!, current + (r.percentualDedicacao || 0));
      });

    // Contratos onde cada pessoa ainda não está alocada (para sugestões)
    const activeContracts = contracts.filter(c => activeContractIds.has(c.id));

    return hrPeople
      .filter(p =>
        p.situacao === 'ativo' &&
        (p.tipoVinculo === 'clt' || p.tipoVinculo === 'pj')
      )
      .map(p => {
        const totalPercent = dedicacaoMap.get(p.id) || 0;
        if (totalPercent >= threshold) return null;

        // Contratos onde não está alocado
        const allocatedContractIds = new Set(
          resources
            .filter(r => r.hrPersonId === p.id)
            .map(r => r.contractId)
        );
        const availableContracts = activeContracts
          .filter(c => !allocatedContractIds.has(c.id))
          .map(c => ({
            id: c.id,
            nome: c.nome,
            clientName: clients.find(cl => cl.id === c.clientId)?.nomeFantasia || '',
          }));

        return {
          personId: p.id,
          nome: p.nome,
          tipoVinculo: p.tipoVinculo,
          totalPercent,
          threshold,
          gap: threshold - totalPercent,
          availableContracts,
        };
      })
      .filter(Boolean) as UnderutilizedPerson[];
  }, [hrPeople, resources, contracts, clients, settings]);

  return { underutilized, count: underutilized.length };
}