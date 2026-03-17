/**
 * Resolve resource data from HR Master when linked, fallback to legacy fields.
 */
import type { Resource, HRPerson, JobTitle, Team, HRTipoVinculo } from '@/types';

export interface ResolvedResource {
  nome: string;
  cargo?: string;
  teamName?: string;
  teamId?: string;
  tipoVinculo: HRTipoVinculo | string;
  custoBase: number;
  isLinked: boolean;
  isBrokenLink: boolean;
  isVacant: boolean;
}

/** Build lookup maps for O(1) resolution */
export function buildLookups(hrPeople: HRPerson[], jobTitles: JobTitle[], teams: Team[]) {
  const peopleMap = new Map(hrPeople.map(p => [p.id, p]));
  const jobMap = new Map(jobTitles.map(j => [j.id, j]));
  const teamMap = new Map(teams.map(t => [t.id, t]));
  return { peopleMap, jobMap, teamMap };
}

/**
 * Calculate custoBase from HR Master including benefits.
 * Uses beneficiosLista (sum of all item values) when available,
 * otherwise falls back to the legacy beneficios total.
 */
function calcHRCustoBase(person: HRPerson): number {
  const beneficiosLista = (person as any).beneficiosLista;
  const beneficiosValor = Array.isArray(beneficiosLista) && beneficiosLista.length
    ? beneficiosLista.reduce((s: number, b: any) => s + (b.valor || 0), 0)
    : (person.beneficios || 0);
  return (person.remuneracaoMensal || 0) + beneficiosValor;
}

/** Map HR tipoVinculo to Resource tipo for calculations.
 * All types are treated as HR resources (clt or pj) so they
 * appear in the HR section, not "Outros". */
function mapTipoVinculo(tipoVinculo: string): 'clt' | 'pj' | 'outro' {
  if (tipoVinculo === 'clt') return 'clt';
  return 'pj';
}

export function resolveResource(
  resource: Resource,
  peopleMap: Map<string, HRPerson>,
  jobMap: Map<string, JobTitle>,
  teamMap: Map<string, Team>,
): ResolvedResource {
  if (resource.hrPersonId) {
    const person = peopleMap.get(resource.hrPersonId);
    if (person) {
      const job = person.cargoId ? jobMap.get(person.cargoId) : undefined;
      const team = person.teamId ? teamMap.get(person.teamId) : undefined;
      const isVacant = person.situacao === 'inativo';
      return {
        nome: person.nome,
        cargo: job?.label ?? resource.cargo,
        teamName: team?.name,
        teamId: person.teamId,
        tipoVinculo: person.tipoVinculo,
        custoBase: calcHRCustoBase(person),
        isLinked: true,
        isBrokenLink: false,
        isVacant,
      };
    }
    // hrPersonId exists but person not found — broken link
    return {
      nome: resource.nome,
      cargo: resource.cargo,
      teamName: undefined,
      teamId: undefined,
      tipoVinculo: resource.tipo === 'clt' ? 'clt' : 'pj',
      custoBase: resource.custoBase,
      isLinked: false,
      isBrokenLink: true,
      isVacant: false,
    };
  }
  return {
    nome: resource.nome,
    cargo: resource.cargo,
    teamName: undefined,
    teamId: undefined,
    tipoVinculo: resource.tipo === 'clt' ? 'clt' : 'pj',
    custoBase: resource.custoBase,
    isLinked: false,
    isBrokenLink: false,
    isVacant: false,
  };
}

/**
 * Resolve a resource and return a copy with custoBase overridden from HR Master.
 * Includes benefits in custoBase and maps tipoVinculo correctly.
 */
export function resolveResourceForCalc(
  resource: Resource,
  peopleMap: Map<string, HRPerson>,
): Resource {
  if (resource.hrPersonId) {
    const person = peopleMap.get(resource.hrPersonId);
    if (person) {
      return {
        ...resource,
        custoBase: calcHRCustoBase(person),
        tipo: mapTipoVinculo(person.tipoVinculo),
      };
    }
    console.warn(`[resourceResolver] Link quebrado: recurso "${resource.nome}" (id=${resource.id}) aponta para hrPersonId="${resource.hrPersonId}" que não existe no RH Mestre.`);
  }
  return resource;
}
