import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Download, Search, Users, FileText, List, User, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useData } from '@/contexts/DataContext';
import { useResolvedResources } from '@/hooks/useResolvedResources';
import { useHR } from '@/contexts/HRContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { EmptyState } from '@/components/ui/empty-state';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { calculateContractHealth } from '@/lib/calculations';
import { healthConfig } from '@/lib/uiConstants';
import { Resource, Team } from '@/types';
import Papa from 'papaparse';
import { buildXlsx, downloadCSV } from '@/lib/importExport';
import { buildLookups, resolveResource } from '@/lib/resourceResolver';

// --- Types ---

interface SquadTeamData {
  team: Team | null;
  teamName: string;
  resources: { resource: Resource; resolvedNome: string; resolvedCargo: string; isBrokenLink: boolean; isVacant: boolean }[];
  fte: number;
  percent: number;
}

interface ContractSquadData {
  contractId: string;
  contractCodigo: string;
  contractNome: string;
  clientId: string;
  clientName: string;
  segmento: 'govtech' | 'privado';
  healthStatus: string;
  healthLabel: string;
  totalFTE: number;
  hrCount: number;
  teams: SquadTeamData[];
}

interface ResourceViewData {
  resourceKey: string;
  nome: string;
  cargo: string;
  teamName: string;
  totalDedicacao: number;
  allocations: {
    contractId: string;
    contractCodigo: string;
    contractNome: string;
    clientName: string;
    healthStatus: string;
    percentualDedicacao: number;
  }[];
}

// --- Card color palette (rotational) ---

const cardColorPalette = [
  'border-l-[hsl(210,80%,55%)]',   // azul
  'border-l-[hsl(160,60%,45%)]',   // esmeralda
  'border-l-[hsl(270,60%,60%)]',   // violeta
  'border-l-[hsl(38,90%,55%)]',    // âmbar
  'border-l-[hsl(340,70%,55%)]',   // rosa
  'border-l-[hsl(185,60%,45%)]',   // ciano
  'border-l-[hsl(25,80%,55%)]',    // laranja
  'border-l-[hsl(140,50%,45%)]',   // verde
];

// --- Fixed team sort order ---

const TEAM_SORT_ORDER = ['projetos', 'desenvolvimento', 'dados', 'ia', 'qualidade', 'suporte', 'sre'];

function sortTeamsByFixedOrder(teamsArray: SquadTeamData[]): SquadTeamData[] {
  return [...teamsArray].sort((a, b) => {
    const aName = a.teamName.toLowerCase().trim();
    const bName = b.teamName.toLowerCase().trim();
    const aIdx = TEAM_SORT_ORDER.indexOf(aName);
    const bIdx = TEAM_SORT_ORDER.indexOf(bName);
    const aOrder = aIdx >= 0 ? aIdx : TEAM_SORT_ORDER.length;
    const bOrder = bIdx >= 0 ? bIdx : TEAM_SORT_ORDER.length;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return aName.localeCompare(bName);
  });
}

// --- Component ---

export default function SquadsPage() {
  const { clients, contracts, resources: _rawResources, settings, overheadItems, jobTitles, teams } = useData();
  const { resolvedResources: resources } = useResolvedResources();
  const { hrPeople } = useHR();
  const navigate = useNavigate();

  const [clientFilter, setClientFilter] = useState<string>('all');
  const [contractFilter, setContractFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('detailed');
  const [perspective, setPerspective] = useState<'project' | 'resource'>('project');

  const sortedTeams = useMemo(() => [...teams].sort((a, b) => a.sortOrder - b.sortOrder), [teams]);

  // Build lookups for resolver
  const { peopleMap, jobMap, teamMap } = useMemo(
    () => buildLookups(hrPeople, jobTitles, teams),
    [hrPeople, jobTitles, teams]
  );

  // --- Consolidation ---

  const squadsData = useMemo(() => {
    const result: ContractSquadData[] = [];
    const activeContracts = contracts.filter(c => c.status === 'operacao' || c.status === 'implantacao');
    const searchLower = searchQuery.toLowerCase();

    for (const contract of activeContracts) {
      const client = clients.find(cl => cl.id === contract.clientId);
      if (!client) continue;
      if (clientFilter !== 'all' && contract.clientId !== clientFilter) continue;
      if (contractFilter !== 'all' && contract.id !== contractFilter) continue;

      const contractResources = resources.filter(r => r.contractId === contract.id);
      const hrResources = contractResources.filter(r => r.tipo === 'clt' || r.tipo === 'pj');
      if (hrResources.length === 0) continue;

      // Resolve each HR resource
      const resolvedHR = hrResources.map(r => {
        const resolved = resolveResource(r, peopleMap, jobMap, teamMap);
        return { resource: r, resolved };
      });

      const filteredHR = searchQuery
        ? resolvedHR.filter(({ resolved }) =>
            resolved.nome.toLowerCase().includes(searchLower) ||
            (resolved.cargo || '').toLowerCase().includes(searchLower) ||
            client.razaoSocial.toLowerCase().includes(searchLower) ||
            contract.codigo.toLowerCase().includes(searchLower)
          )
        : resolvedHR;
      if (filteredHR.length === 0) continue;

      const health = calculateContractHealth(contract, resources, settings, overheadItems);
      const hc = healthConfig[health.status];

      // Group by team — using HR Master teamId when linked
      const teamGroupMap = new Map<string, { team: Team | null; items: { resource: Resource; resolvedNome: string; resolvedCargo: string; isBrokenLink: boolean; isVacant: boolean }[] }>();
      for (const { resource: hr, resolved } of filteredHR) {
        let teamId: string | undefined;
        
        if (resolved.teamId) {
          teamId = resolved.teamId;
        } else {
          const cargoLower = (resolved.cargo || '').toLowerCase();
          const matchedJT = jobTitles.find(jt => jt.label.toLowerCase() === cargoLower);
          teamId = matchedJT?.teamId ?? undefined;
        }
        
        const team = teamId ? teams.find(t => t.id === teamId) : null;
        const key = team ? team.id : '__none__';
        if (!teamGroupMap.has(key)) teamGroupMap.set(key, { team: team || null, items: [] });
        teamGroupMap.get(key)!.items.push({
          resource: hr,
          resolvedNome: resolved.nome,
          resolvedCargo: resolved.cargo || 'Sem cargo',
          isBrokenLink: resolved.isBrokenLink,
          isVacant: resolved.isVacant,
        });
      }

      const totalFTE = filteredHR.reduce((sum, { resource: r }) => sum + r.percentualDedicacao / 100, 0);

      const teamsArray: SquadTeamData[] = [];
      for (const t of sortedTeams) {
        const entry = teamGroupMap.get(t.id);
        if (!entry) continue;
        const fte = entry.items.reduce((s, { resource: r }) => s + r.percentualDedicacao / 100, 0);
        teamsArray.push({
          team: t, teamName: t.name,
          resources: entry.items.sort((a, b) => b.resource.percentualDedicacao - a.resource.percentualDedicacao),
          fte, percent: totalFTE > 0 ? (fte / totalFTE) * 100 : 0,
        });
      }

      const noTeam = teamGroupMap.get('__none__');
      if (noTeam) {
        const fte = noTeam.items.reduce((s, { resource: r }) => s + r.percentualDedicacao / 100, 0);
        teamsArray.push({
          team: null, teamName: 'Sem equipe',
          resources: noTeam.items.sort((a, b) => b.resource.percentualDedicacao - a.resource.percentualDedicacao),
          fte, percent: totalFTE > 0 ? (fte / totalFTE) * 100 : 0,
        });
      }

      const finalTeams = teamFilter.length > 0
        ? teamsArray.filter(td => teamFilter.includes(td.team?.id || '__none__'))
        : teamsArray;
      if (finalTeams.length === 0) continue;

      result.push({
        contractId: contract.id, contractCodigo: contract.codigo, contractNome: contract.nome,
        clientId: client.id, clientName: client.razaoSocial, segmento: contract.segmento,
        healthStatus: health.status, healthLabel: hc.label, totalFTE, hrCount: filteredHR.length,
        teams: finalTeams,
      });
    }
    return result;
  }, [contracts, clients, resources, settings, overheadItems, jobTitles, teams, sortedTeams, clientFilter, contractFilter, teamFilter, searchQuery, peopleMap, jobMap, teamMap]);

  // --- Resource-centric view data ---

  const resourceViewData = useMemo<ResourceViewData[]>(() => {
    if (perspective !== 'resource') return [];

    const resourceMap = new Map<string, ResourceViewData>();

    for (const cd of squadsData) {
      for (const td of cd.teams) {
        for (const { resource: r, resolvedNome, resolvedCargo } of td.resources) {
          // Group by hrPersonId (unique) or fallback to name+cargo
          const key = r.hrPersonId
            ? `hr:${r.hrPersonId}`
            : `${resolvedNome.toLowerCase().trim()}||${resolvedCargo.toLowerCase().trim()}`;

          if (!resourceMap.has(key)) {
            resourceMap.set(key, {
              resourceKey: key,
              nome: resolvedNome || 'Sem nome',
              cargo: resolvedCargo || 'Sem cargo',
              teamName: td.teamName,
              totalDedicacao: 0,
              allocations: [],
            });
          }

          const entry = resourceMap.get(key)!;
          entry.totalDedicacao += r.percentualDedicacao;
          entry.allocations.push({
            contractId: cd.contractId,
            contractCodigo: cd.contractCodigo,
            contractNome: cd.contractNome,
            clientName: cd.clientName,
            healthStatus: cd.healthStatus,
            percentualDedicacao: r.percentualDedicacao,
          });
        }
      }
    }

    return Array.from(resourceMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [squadsData, perspective]);

  // --- Filter options ---

  const clientOptions = useMemo(() => {
    const ids = new Set(contracts.filter(c => c.status === 'operacao' || c.status === 'implantacao').map(c => c.clientId));
    return clients.filter(cl => ids.has(cl.id)).sort((a, b) => a.razaoSocial.localeCompare(b.razaoSocial));
  }, [clients, contracts]);

  const contractOptions = useMemo(() => {
    const active = contracts.filter(c => c.status === 'operacao' || c.status === 'implantacao');
    const filtered = clientFilter !== 'all' ? active.filter(c => c.clientId === clientFilter) : active;
    return filtered.sort((a, b) => (a.nome || a.codigo).localeCompare(b.nome || b.codigo));
  }, [contracts, clientFilter]);

  const toggleTeamFilter = (teamId: string) => {
    setTeamFilter(prev => prev.includes(teamId) ? prev.filter(t => t !== teamId) : [...prev, teamId]);
  };

  // --- Export ---

  const buildExportRows = () => {
    const rows: Record<string, string | number>[] = [];
    for (const cd of squadsData) {
      for (const td of cd.teams) {
        for (const { resolvedNome, resolvedCargo, resource: r } of td.resources) {
          rows.push({
            Cliente: cd.clientName,
            Contrato: cd.contractCodigo,
            Equipe: td.teamName,
            'Nome RH': resolvedNome || 'Sem nome',
            'Cargo/Função': resolvedCargo || 'Sem cargo',
            'Dedicação (%)': r.percentualDedicacao,
            FTE: +(r.percentualDedicacao / 100).toFixed(2),
          });
        }
      }
    }
    return rows;
  };

  const exportCSV = () => {
    const rows = buildExportRows();
    if (rows.length === 0) return;
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'squads-export.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const exportXLSX = () => {
    const rows = buildExportRows();
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const dataRows = rows.map(row => headers.map(h => row[h] ?? ''));
    const blob = buildXlsx(headers, dataRows);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'squads-export.xlsx'; a.click();
    URL.revokeObjectURL(url);
  };

  // --- Empty state ---

  const allHR = resources.filter(r => r.tipo === 'clt' || r.tipo === 'pj');
  if (allHR.length === 0) {
    return (
      <div>
        <PageHeader title="Squads" description="Distribuição de equipes por cliente e contrato" breadcrumbs={[{ label: 'Squads' }]} />
        <EmptyState icon={Users} title="Nenhum recurso humano cadastrado" description="Cadastre recursos humanos nos contratos para visualizar a distribuição de equipes." actionLabel="Ir para Contratos" onAction={() => navigate('/contratos')} />
      </div>
    );
  }

  // --- Render helpers (Project view) ---

  const renderTeamBar = (td: SquadTeamData, cd: ContractSquadData) => {
    const totalResources = cd.teams.reduce((s, t) => s + t.resources.length, 0);
    const resourcePercent = totalResources > 0 ? (td.resources.length / totalResources) * 100 : 0;

    return (
      <div key={td.teamName} className="flex items-center gap-2 text-sm">
        <span className="w-32 truncate font-medium text-foreground">
          {td.teamName}
        </span>
        <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
          <div className="h-full bg-primary/70 rounded-full transition-all" style={{ width: `${Math.min(viewMode === 'compact' ? resourcePercent : td.percent, 100)}%` }} />
        </div>
        {viewMode === 'compact' ? (
          <>
            <span className="w-20 text-right text-muted-foreground tabular-nums">{td.resources.length} rec.</span>
            <span className="w-14 text-right text-muted-foreground tabular-nums">{resourcePercent.toFixed(0)}%</span>
          </>
        ) : (
          <>
            <span className="w-20 text-right text-muted-foreground tabular-nums">{td.resources.length} rec.</span>
            <span className="w-14 text-right text-muted-foreground tabular-nums">{td.percent.toFixed(0)}%</span>
          </>
        )}
      </div>
    );
  };

  const renderDetailedTeams = (cd: ContractSquadData) => {
    const allValues = cd.teams.map((_, i) => `team-${i}`);
    return (
      <Accordion type="multiple" defaultValue={allValues} className="mt-3 border-t pt-3">
        {cd.teams.map((td, i) => (
          <AccordionItem key={td.teamName} value={`team-${i}`} className="border-b-0">
            <AccordionTrigger className="py-2 text-sm hover:no-underline">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{td.teamName}</Badge>
                <span className="text-xs text-muted-foreground">{td.resources.length} recurso{td.resources.length !== 1 ? 's' : ''}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-2">
              <div className="ml-2 space-y-0.5">
                {td.resources.map(({ resource: r, resolvedNome, resolvedCargo, isBrokenLink, isVacant }) => (
                  <div key={r.id} className={cn("flex items-center gap-2 text-sm py-1.5 border-b border-border/40 last:border-0", isVacant && "bg-destructive/5")}>
                    <span className={cn("font-medium", isVacant && "text-destructive")}>{resolvedNome || 'Sem nome'}</span>
                    {isVacant && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="destructive" className="text-[9px] gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" /> Vago
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>Profissional desligado — designar substituto</TooltipContent>
                      </Tooltip>
                    )}
                    {isBrokenLink && !isVacant && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent>Pessoa não encontrada no RH Mestre — dados podem estar desatualizados</TooltipContent>
                      </Tooltip>
                    )}
                    <span className="text-muted-foreground">—</span>
                    <span className="text-muted-foreground">{resolvedCargo || 'Sem cargo'}</span>
                    <span className="ml-auto tabular-nums font-medium">{r.percentualDedicacao}%</span>
                    {r.percentualDedicacao > 100 && <Badge variant="destructive" className="text-[10px]">&gt;100%</Badge>}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    );
  };

  const renderContractCard = (cd: ContractSquadData, cardIndex: number) => {
    const hb = healthConfig[cd.healthStatus as keyof typeof healthConfig];
    const cardColor = cardColorPalette[cardIndex % cardColorPalette.length];
    const sortedCardTeams = sortTeamsByFixedOrder(cd.teams);
    const cardData = { ...cd, teams: sortedCardTeams };

    return (
      <Card key={cd.contractId} className={`overflow-hidden border-l-4 ${cardColor}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base">{cd.contractNome || cd.contractCodigo}</CardTitle>
                <span className="text-sm text-muted-foreground">· {cd.contractCodigo}</span>
              </div>
              <p className="text-sm text-muted-foreground">{cd.clientName}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="text-[10px]">{cd.segmento === 'govtech' ? 'Gov' : 'Privado'}</Badge>
              {hb && <Badge variant="outline" className={`text-[10px] ${hb.badgeClass}`}>{hb.label}</Badge>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {cardData.teams.map(td => renderTeamBar(td, cardData))}
          {viewMode === 'detailed' && renderDetailedTeams(cardData)}

          {/* FTE Summary at the end */}
          <div className="border-t pt-3 mt-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">FTE Total: {cd.totalFTE.toFixed(2)}</span>
              <span>RH: {cd.hrCount}</span>
              {cardData.teams.map(td => (
                <span key={td.teamName} className="tabular-nums">{td.teamName}: {td.fte.toFixed(1)}</span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate(`/contratos/${cd.contractId}`, { state: { from: '/squads' } })}>
              <FileText className="w-3 h-3 mr-1" /> Ver contrato
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate(`/contratos/${cd.contractId}/recursos`, { state: { from: '/squads' } })}>
              <Users className="w-3 h-3 mr-1" /> Ver recursos
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // --- Render helpers (Resource view) ---

  const renderResourceCard = (rd: ResourceViewData) => {
    const totalFTE = rd.totalDedicacao / 100;
    const isOverloaded = rd.totalDedicacao > 100;

    return (
      <Card key={rd.resourceKey} className={`overflow-hidden border-l-4 ${isOverloaded ? 'border-l-[hsl(var(--health-critical))]' : 'border-l-[hsl(var(--health-healthy))]'}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground shrink-0" />
                {rd.nome}
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">{rd.cargo}</span>
                <Badge variant="outline" className="text-[10px]">{rd.teamName}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="tabular-nums font-medium text-sm">{totalFTE.toFixed(2)} FTE</span>
              {isOverloaded && <Badge variant="destructive" className="text-[10px]">&gt;100%</Badge>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-1.5">
            {rd.allocations.map((alloc, i) => {
              const hb = healthConfig[alloc.healthStatus as keyof typeof healthConfig];
              return (
                <div key={i} className="flex items-center gap-2 text-sm py-1.5 border-b border-border/40 last:border-0">
                  <div className="min-w-0">
                    <span className="font-medium truncate block">{alloc.contractNome || alloc.contractCodigo}</span>
                    <span className="text-xs text-muted-foreground truncate block">{alloc.clientName}</span>
                  </div>
                  {hb && <Badge variant="outline" className={`text-[9px] shrink-0 ${hb.badgeClass}`}>{hb.label}</Badge>}
                  <span className="ml-auto tabular-nums font-medium shrink-0">{alloc.percentualDedicacao}%</span>
                </div>
              );
            })}
          </div>
          {/* Dedication summary bar */}
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <span>Dedicação total: {rd.totalDedicacao}%</span>
              {rd.totalDedicacao > 100 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="destructive" className="text-[9px]">Sobrecarregado</Badge>
                  </TooltipTrigger>
                  <TooltipContent>Dedicação total excede 100%</TooltipContent>
                </Tooltip>
              )}
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  isOverloaded ? 'bg-[hsl(var(--health-critical))]' : 'bg-primary/70',
                )}
                style={{ width: `${Math.min(rd.totalDedicacao, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Squads"
        description="Distribuição de equipes por cliente e contrato"
        breadcrumbs={[{ label: 'Squads' }]}
        actions={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Download className="w-4 h-4" /> Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportCSV}>CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={exportXLSX}>XLSX</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            {/* Perspective toggle */}
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Visão</span>
              <div className="flex border rounded-md overflow-hidden">
                <button onClick={() => setPerspective('project')} className={cn('flex-1 px-3 py-1.5 text-xs font-medium transition-colors', perspective === 'project' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted')}>
                  <LayoutGrid className="w-3 h-3 inline mr-1" /> Por Projeto
                </button>
                <button onClick={() => setPerspective('resource')} className={cn('flex-1 px-3 py-1.5 text-xs font-medium transition-colors', perspective === 'resource' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted')}>
                  <User className="w-3 h-3 inline mr-1" /> Por Recurso
                </button>
              </div>
            </div>

            {/* Client filter */}
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Cliente</span>
              <Select value={clientFilter} onValueChange={(v) => { setClientFilter(v); setContractFilter('all'); }}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {clientOptions.map(c => <SelectItem key={c.id} value={c.id}>{c.razaoSocial}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Contract filter */}
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Contrato</span>
              <Select value={contractFilter} onValueChange={setContractFilter}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {contractOptions.map(c => <SelectItem key={c.id} value={c.id}>{c.nome || c.codigo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Buscar</span>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input className="h-9 pl-7 text-xs" placeholder="Nome, cargo, cliente..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
            </div>

            {/* View mode (project only) */}
            {perspective === 'project' && (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">Modo</span>
                <div className="flex border rounded-md overflow-hidden">
                  <button onClick={() => setViewMode('compact')} className={cn('flex-1 px-3 py-1.5 text-xs font-medium transition-colors', viewMode === 'compact' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted')}>
                    <LayoutGrid className="w-3 h-3 inline mr-1" /> Compacto
                  </button>
                  <button onClick={() => setViewMode('detailed')} className={cn('flex-1 px-3 py-1.5 text-xs font-medium transition-colors', viewMode === 'detailed' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted')}>
                    <List className="w-3 h-3 inline mr-1" /> Detalhado
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Team filter chips */}
          {sortedTeams.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {sortedTeams.filter(t => t.isActive).map(t => (
                <Badge key={t.id} variant={teamFilter.includes(t.id) ? 'default' : 'outline'} className="cursor-pointer text-xs" onClick={() => toggleTeamFilter(t.id)}>
                  {t.name}
                </Badge>
              ))}
              {teamFilter.length > 0 && (
                <Badge variant="secondary" className="cursor-pointer text-xs" onClick={() => setTeamFilter([])}>✕ Limpar</Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Contratos</p><p className="text-xl font-bold">{squadsData.length}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">FTE Total</p><p className="text-xl font-bold">{squadsData.reduce((s, c) => s + c.totalFTE, 0).toFixed(1)}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">RH Alocados</p><p className="text-xl font-bold">{squadsData.reduce((s, c) => s + c.hrCount, 0)}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">{perspective === 'resource' ? 'Pessoas Únicas' : 'Equipes Envolvidas'}</p><p className="text-xl font-bold">{perspective === 'resource' ? resourceViewData.length : new Set(squadsData.flatMap(c => c.teams.map(t => t.teamName))).size}</p></CardContent></Card>
      </div>

      {/* Cards Grid */}
      {perspective === 'project' ? (
        squadsData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {squadsData.map((cd, i) => renderContractCard(cd, i))}
          </div>
        ) : (
          <EmptyState icon={Users} title="Nenhum resultado" description="Ajuste os filtros para visualizar os squads." />
        )
      ) : (
        resourceViewData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {resourceViewData.map(renderResourceCard)}
          </div>
        ) : (
          <EmptyState icon={Users} title="Nenhum resultado" description="Ajuste os filtros para visualizar os recursos." />
        )
      )}
    </div>
  );
}
