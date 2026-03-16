import React, { useMemo } from 'react';
import { Layers, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSubprojects } from '@/contexts/SubprojectContext';
import { formatCurrency } from '@/lib/calculations';
import { cn } from '@/lib/utils';
import type { Settings, HRPerson, Resource } from '@/types';

interface SubprojectCostCardsProps {
  contractId: string;
  settings: Settings;
  custoMensalTotal: number;
  canViewHRCosts: boolean;
  peopleMap: Map<string, HRPerson>;
  resourcesMap?: Map<string, Resource>;
  receitaMensal?: number;
  overheadAllocated?: number;
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
  resourcesMap,
  receitaMensal,
  overheadAllocated = 0,
}: SubprojectCostCardsProps) {
  const { getSubprojectsByContract, getAllocationsBySubproject } = useSubprojects();
  const subprojects = getSubprojectsByContract(contractId);

  const spData = useMemo(() => {
    // First pass: calculate direct costs per subproject
    const raw = subprojects.map(sp => {
      const allocations = getAllocationsBySubproject(sp.id);
      let custoDireto = 0;
      let fte = 0;
      let hrCount = 0;
      let resCount = 0;

      for (const alloc of allocations) {
        if (alloc.hrPersonId) {
          hrCount++;
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

          custoDireto += custo * dedicacao;
        }

        if (alloc.resourceId && resourcesMap) {
          resCount++;
          const resource = resourcesMap.get(alloc.resourceId);
          if (!resource) continue;

          const dedicacao = alloc.dedicationPercent / 100;
          custoDireto += (resource.custoBase || 0) * dedicacao;
        }
      }

      return { sp, custoDireto, fte, hrCount, resCount };
    });

    // Second pass: prorate central overhead proportionally to direct cost
    const totalDireto = raw.reduce((s, r) => s + r.custoDireto, 0);

    return raw.map(r => {
      const overheadRateado = totalDireto > 0
        ? overheadAllocated * (r.custoDireto / totalDireto)
        : subprojects.length > 0
          ? overheadAllocated / subprojects.length
          : 0;
      const custoTotal = r.custoDireto + overheadRateado;
      const percentual = custoMensalTotal > 0 ? (custoTotal / custoMensalTotal) * 100 : 0;

      return { ...r, overheadRateado, custoTotal, percentual };
    });
  }, [subprojects, getAllocationsBySubproject, peopleMap, resourcesMap, settings, custoMensalTotal, overheadAllocated]);

  if (subprojects.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
        <Layers className="w-4 h-4" />
        Distribuição por Subprojeto
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {spData.map(({ sp, custoDireto, overheadRateado, custoTotal, fte, hrCount, resCount, percentual }) => (
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
                  <p className="text-xl font-bold">{formatCurrency(custoTotal)}</p>
                  <p className="text-xs text-muted-foreground">{percentual.toFixed(1)}% do custo total</p>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    <span>Direto: {formatCurrency(custoDireto)}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center gap-0.5 cursor-help">
                          <Info className="w-3 h-3" />
                          Overhead: {formatCurrency(overheadRateado)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>Rateio automático do overhead central proporcional ao custo direto</TooltipContent>
                    </Tooltip>
                  </div>
                </>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-xl font-bold text-muted-foreground">---</p>
                  </TooltipTrigger>
                  <TooltipContent>Valores de RH restritos ao perfil C-Level</TooltipContent>
                </Tooltip>
              )}
              <div className="flex gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                <span>{hrCount} pessoa{hrCount !== 1 ? 's' : ''}</span>
                <span>•</span>
                <span>FTE: {fte.toFixed(2)}</span>
                {resCount > 0 && <><span>•</span><span>{resCount} recurso{resCount !== 1 ? 's' : ''}</span></>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
