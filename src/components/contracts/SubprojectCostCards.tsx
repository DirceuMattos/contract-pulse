import React, { useMemo } from 'react';
import { Layers } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSubprojects } from '@/contexts/SubprojectContext';
import { formatCurrency } from '@/lib/calculations';
import { cn } from '@/lib/utils';
import type { Settings, HRPerson } from '@/types';

interface SubprojectCostCardsProps {
  contractId: string;
  settings: Settings;
  custoMensalTotal: number;
  canViewHRCosts: boolean;
  peopleMap: Map<string, HRPerson>;
}

const statusLabels: Record<string, string> = {
  ativo: 'Ativo',
  suspenso: 'Suspenso',
  encerrado: 'Encerrado',
};

const statusBadgeClass: Record<string, string> = {
  ativo: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  suspenso: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  encerrado: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export function SubprojectCostCards({
  contractId,
  settings,
  custoMensalTotal,
  canViewHRCosts,
  peopleMap,
}: SubprojectCostCardsProps) {
  const { getSubprojectsByContract, getAllocationsBySubproject } = useSubprojects();
  const subprojects = getSubprojectsByContract(contractId);

  const spData = useMemo(() => {
    return subprojects.map(sp => {
      const allocations = getAllocationsBySubproject(sp.id);
      let custoMensal = 0;
      let fte = 0;

      for (const alloc of allocations) {
        const person = peopleMap.get(alloc.hrPersonId);
        if (!person) continue;

        const dedicacao = alloc.dedicationPercent / 100;
        fte += dedicacao;

        const base = person.remuneracaoMensal || 0;
        let custo = base;

        if (person.tipoVinculo === 'clt') {
          const encargos = settings.percentualEncargosCLT || 0;
          custo = base * (1 + encargos / 100);
        } else if (person.tipoVinculo === 'pj') {
          const impostos = settings.percentualImpostosPJ || 0;
          custo = base * (1 + impostos / 100);
        }

        custoMensal += custo * dedicacao;
      }

      const percentual = custoMensalTotal > 0 ? (custoMensal / custoMensalTotal) * 100 : 0;

      return {
        sp,
        custoMensal,
        fte,
        count: allocations.length,
        percentual,
      };
    });
  }, [subprojects, getAllocationsBySubproject, peopleMap, settings, custoMensalTotal]);

  if (subprojects.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
        <Layers className="w-4 h-4" />
        Distribuição por Subprojeto
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {spData.map(({ sp, custoMensal, fte, count, percentual }) => (
          <Card key={sp.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-sm truncate">{sp.name}</p>
                <Badge className={cn('text-[10px]', statusBadgeClass[sp.status] || '')}>
                  {statusLabels[sp.status] || sp.status}
                </Badge>
              </div>
              {canViewHRCosts ? (
                <>
                  <p className="text-xl font-bold">{formatCurrency(custoMensal)}</p>
                  <p className="text-xs text-muted-foreground">{percentual.toFixed(1)}% do custo total</p>
                </>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-xl font-bold text-muted-foreground">---</p>
                  </TooltipTrigger>
                  <TooltipContent>Valores de RH restritos ao perfil C-Level</TooltipContent>
                </Tooltip>
              )}
              <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                <span>{count} recurso{count !== 1 ? 's' : ''}</span>
                <span>•</span>
                <span>FTE: {fte.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
