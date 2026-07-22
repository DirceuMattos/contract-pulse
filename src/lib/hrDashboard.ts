import { HRPerson, Resource, Settings, SubprojectAllocation, ContractSubproject } from '@/types';
import { calculateHRPersonCost } from '@/lib/calculations';

export interface HRAllocationMetric {
  person: HRPerson;
  totalCost: number;
  allocatedPercent: number;
  allocatedCost: number;
  bnpPercent: number;
  bnpCost: number;
}

export interface HRDashboardSummary {
  activePeople: number;
  totalCost: number;
  allocatedPeople: number;
  partiallyAllocatedPeople: number;
  unallocatedPeople: number;
  allocatedCost: number;
  bnpCost: number;
  allocatedPercent: number;
  bnpPercent: number;
  metrics: HRAllocationMetric[];
}

export function buildHRDashboardSummary(
  people: HRPerson[],
  resources: Resource[],
  subprojects: ContractSubproject[],
  allocations: SubprojectAllocation[],
  settings: Settings,
): HRDashboardSummary {
  const activePeople = people.filter((person) => person.situacao === 'ativo');
  const subprojectById = new Map(subprojects.map((subproject) => [subproject.id, subproject]));
  const subprojectAllocationKeys = new Set<string>();
  const allocationPercentByPerson = new Map<string, number>();

  for (const allocation of allocations) {
    if (!allocation.hrPersonId) continue;
    const subproject = subprojectById.get(allocation.subprojectId);
    if (!subproject) continue;

    const percent = allocation.dedicationPercent || 0;
    subprojectAllocationKeys.add(`${allocation.hrPersonId}:${subproject.contractId}`);
    allocationPercentByPerson.set(
      allocation.hrPersonId,
      (allocationPercentByPerson.get(allocation.hrPersonId) || 0) + percent,
    );
  }

  for (const resource of resources) {
    if (!resource.hrPersonId) continue;
    const personContractKey = `${resource.hrPersonId}:${resource.contractId}`;
    if (subprojectAllocationKeys.has(personContractKey)) continue;

    allocationPercentByPerson.set(
      resource.hrPersonId,
      (allocationPercentByPerson.get(resource.hrPersonId) || 0) + (resource.percentualDedicacao || 0),
    );
  }

  const metrics = activePeople.map((person) => {
    const totalCost = calculateHRPersonCost(person, settings);
    const rawAllocatedPercent = allocationPercentByPerson.get(person.id) || 0;
    const allocatedPercent = Math.max(0, Math.min(rawAllocatedPercent, 100));
    const allocatedCost = totalCost * (allocatedPercent / 100);
    const bnpPercent = Math.max(0, 100 - allocatedPercent);
    const bnpCost = totalCost - allocatedCost;

    return {
      person,
      totalCost,
      allocatedPercent,
      allocatedCost,
      bnpPercent,
      bnpCost,
    };
  });

  const totalCost = metrics.reduce((sum, metric) => sum + metric.totalCost, 0);
  const allocatedCost = metrics.reduce((sum, metric) => sum + metric.allocatedCost, 0);
  const bnpCost = metrics.reduce((sum, metric) => sum + metric.bnpCost, 0);
  const allocatedPeople = metrics.filter((metric) => metric.allocatedPercent >= 100).length;
  const partiallyAllocatedPeople = metrics.filter((metric) => metric.allocatedPercent > 0 && metric.allocatedPercent < 100).length;
  const unallocatedPeople = metrics.filter((metric) => metric.allocatedPercent === 0).length;

  return {
    activePeople: activePeople.length,
    totalCost,
    allocatedPeople,
    partiallyAllocatedPeople,
    unallocatedPeople,
    allocatedCost,
    bnpCost,
    allocatedPercent: totalCost > 0 ? (allocatedCost / totalCost) * 100 : 0,
    bnpPercent: totalCost > 0 ? (bnpCost / totalCost) * 100 : 0,
    metrics,
  };
}
