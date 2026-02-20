import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Download, Search, Users, FileText, List, User } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { EmptyState } from '@/components/ui/empty-state';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { calculateContractHealth } from '@/lib/calculations';
import { healthConfig } from '@/lib/uiConstants';
import { Resource, Team } from '@/types';
import Papa from 'papaparse';
import { buildXlsx, downloadCSV } from '@/lib/importExport';

// --- Types ---

interface SquadTeamData {
  team: Team | null;
  teamName: string;
  resources: Resource[];
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
    clientName: string;
    healthStatus: string;
    percentualDedicacao: number;
  }[];
}

// --- Health card styles ---

const healthCardStyles: Record<string, string> = {
  saudavel: 'border-l-4 border-l-[hsl(var(--health-healthy))]',
  atencao: 'border-l-4 border-l-[hsl(var(--health-attention))]',
  critico: 'border-l-4 border-l-[hsl(var(--health-critical))]',
};

const healthHeaderStyles: Record<string, string> = {
  saudavel: 'bg-[hsl(var(--health-healthy-bg))]',
  atencao: 'bg-[hsl(var(--health-attention-bg))]',
  critico: 'bg-[hsl(var(--health-critical-bg))]',
};

// --- Component ---

export default function SquadsPage() {
  const { clients, contracts, resources, settings, overheadItems, jobTitles, teams } = useData();
  const navigate = useNavigate();

  const [clientFilter, setClientFilter] = useState<string>('all');
  const [contractFilter, setContractFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('detailed');
  const [perspective, setPerspective] = useState<'project' | 'resource'>('project');

  const sortedTeams = useMemo(() => [...teams].sort((a, b) => a.sortOrder - b.sortOrder), [teams]);

  // --- Consolidation (logic preserved from original) ---

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

      const filteredHR = searchQuery
        ? hrResources.filter(r =>
            (r.cargo || '').toLowerCase().includes(searchLower) ||
            (r.nome || '').toLowerCase().includes(searchLower) ||
            client.razaoSocial.toLowerCase().includes(searchLower) ||
            contract.codigo.toLowerCase().includes(searchLower)
          )
        : hrResources;
      if (filteredHR.length === 0) continue;

      const health = calculateContractHealth(contract, resources, settings, overheadItems);
      const hc = healthConfig[health.status];

      const teamMap = new Map<string, { team: Team | null; resources: Resource[] }>();
      for (const hr of filteredHR) {
        const cargoLower = (hr.cargo || '').toLowerCase();
        const matchedJT = jobTitles.find(jt => jt.label.toLowerCase() === cargoLower);
        const teamId = matchedJT?.teamId;
        const team = teamId ? teams.find(t => t.id === teamId) : null;
        const key = team ? team.id : '__none__';
        if (!teamMap.has(key)) teamMap.set(key, { team: team || null, resources: [] });
        teamMap.get(key)!.resources.push(hr);
      }

      const totalFTE = filteredHR.reduce((sum, r) => sum + r.percentualDedicacao / 100, 0);

      const teamsArray: SquadTeamData[] = [];
      for (const t of sortedTeams) {
        const entry = teamMap.get(t.id);
        if (!entry) continue;
        const fte = entry.resources.reduce((s, r) => s + r.percentualDedicacao / 100, 0);
        teamsArray.push({
          team: t, teamName: t.name,
          resources: entry.resources.sort((a, b) => b.percentualDedicacao - a.percentualDedicacao),
          fte, percent: totalFTE > 0 ? (fte / totalFTE) * 100 : 0,
        });
      }

      const noTeam = teamMap.get('__none__');
      if (noTeam) {
        const fte = noTeam.resources.reduce((s, r) => s + r.percentualDedicacao / 100, 0);
        teamsArray.push({
          team: null, teamName: 'Sem equipe',
          resources: noTeam.resources.sort((a, b) => b.percentualDedicacao - a.percentualDedicacao),
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
  }, [contracts, clients, resources, settings, overheadItems, jobTitles, teams, sortedTeams, clientFilter, contractFilter, teamFilter, searchQuery]);

  // --- Resource-centric view data ---

  const resourceViewData = useMemo<ResourceViewData[]>(() => {
    if (perspective !== 'resource') return [];

    const resourceMap = new Map<string, ResourceViewData>();

    for (const cd of squadsData) {
      for (const td of cd.teams) {
        for (const r of td.resources) {
          // Group by resource name+cargo as key (since we don't have a person ID)
          const key = `${(r.nome || '').toLowerCase().trim()}||${(r.cargo || '').toLowerCase().trim()}`;

          if (!resourceMap.has(key)) {
            resourceMap.set(key, {
              resourceKey: key,
              nome: r.nome || 'Sem nome',
              cargo: r.cargo || 'Sem cargo',
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
    return clientFilter !== 'all' ? active.filter(c => c.clientId === clientFilter) : active;
  }, [contracts, clientFilter]);

  const toggleTeamFilter = (teamId: string) => {
    setTeamFilter(prev => prev.includes(teamId) ? prev.filter(t => t !== teamId) : [...prev, teamId]);
  };

  // --- Export ---

  const buildExportRows = () => {
    const rows: Record<string, string | number>[] = [];
    for (const cd of squadsData) {
      for (const td of cd.teams) {
        for (const r of td.resources) {
          rows.push({
            Cliente: cd.clientName,
            Contrato: cd.contractCodigo,
            Equipe: td.teamName,
            'Nome RH': r.nome || 'Sem nome',
            'Cargo/Função': r.cargo || 'Sem cargo',
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

  const renderTeamBar = (td: SquadTeamData) => (
    <div key={td.teamName} className="flex items-center gap-2 text-sm">
      <span className="w-32 truncate font-medium text-foreground">
        {td.teamName}
        {viewMode === 'compact' && perspective === 'project' && <span className="text-muted-foreground ml-1">({td.resources.length})</span>}
      </span>
      <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
        <div className="h-full bg-primary/70 rounded-full transition-all" style={{ width: `${Math.min(td.percent, 100)}%` }} />
      </div>
      <span className="w-20 text-right text-muted-foreground tabular-nums">{td.fte.toFixed(1)} FTE</span>
      <span className="w-14 text-right text-muted-foreground tabular-nums">{td.percent.toFixed(0)}%</span>
    </div>
  );

  const renderDetailedTeams = (cd: ContractSquadData) => {
    const allValues = cd.teams.map((_, i) => `team-${i}`);
    return (
      <Accordion type="multiple" defaultValue={allValues} className="mt-3 border-t pt-3">
        {cd.teams.map((td, i) => (
          <AccordionItem key={td.teamName} value={`team-${i}`} className="border-b-0">
            <AccordionTrigger className="py-2 text-sm hover:no-underline">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{td.teamName}</Badge>
                <span className="text-xs text-muted-foreground">{td.fte.toFixed(1)} FTE · {td.resources.length} RH</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-2">
              <div className="ml-2 space-y-0.5">
                {td.resources.map(r => (
                  <div key={r.id} className="flex items-center gap-2 text-sm py-1.5 border-b border-border/40 last:border-0">
                    <span className="font-medium">{r.nome || 'Sem nome'}</span>
                    <span className="text-muted-foreground">—</span>
                    <span className="text-muted-foreground">{r.cargo || 'Sem cargo'}</span>
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

  const renderContractCard = (cd: ContractSquadData) => {
    const hb = healthConfig[cd.healthStatus as keyof typeof healthConfig];
    const cardBorder = healthCardStyles[cd.healthStatus] || '';
    const headerBg = healthHeaderStyles[cd.healthStatus] || '';

    return (
      <Card key={cd.contractId} className={`overflow-hidden ${cardBorder}`}>
        <CardHeader className={`pb-3 ${headerBg}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base">{cd.clientName}</CardTitle>
                <span className="text-sm text-muted-foreground">· {cd.contractCodigo}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="text-[10px]">{cd.segmento === 'govtech' ? 'Gov' : 'Privado'}</Badge>
              {hb && <Badge variant="outline" className={`text-[10px] ${hb.badgeClass}`}>{hb.label}</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
            <span className="tabular-nums font-medium">Total alocado: {cd.totalFTE.toFixed(2)} FTE</span>
            <span>RH: {cd.hrCount}</span>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-2">
          {cd.teams.map(renderTeamBar)}
          {viewMode === 'detailed' && renderDetailedTeams(cd)}
          <div className="flex items-center gap-2 pt-3 border-t mt-3">
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate(`/contratos/${cd.contractId}`)}>
              <FileText className="w-3 h-3 mr-1" /> Ver contrato
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate(`/contratos/${cd.contractId}`)}>
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
                  <span className="font-medium truncate">{alloc.clientName}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground truncate">{alloc.contractCodigo}</span>
                  {hb && <Badge variant="outline" className={`text-[9px] shrink-0 ${hb.badgeClass}`}>{hb.label}</Badge>}
                  <span className="ml-auto tabular-nums font-medium shrink-0">{alloc.percentualDedicacao}%</span>
                </div>
              );
            })}
          </div>
          {/* Dedication summary bar */}
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <span>Dedicação total</span>
              <span className="ml-auto tabular-nums font-medium text-foreground">{rd.totalDedicacao}%</span>
            </div>
            <div className="bg-muted rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isOverloaded ? 'bg-[hsl(var(--health-critical))]' : 'bg-primary/70'}`}
                style={{ width: `${Math.min(rd.totalDedicacao, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // --- Main render ---

  const hasResults = perspective === 'project' ? squadsData.length > 0 : resourceViewData.length > 0;

  return (
    <div>
      <PageHeader title="Squads" description="Distribuição de equipes por cliente e contrato" breadcrumbs={[{ label: 'Squads' }]} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Perspective toggle */}
        <div className="flex items-center gap-1 border rounded-lg p-0.5">
          <Button variant={perspective === 'project' ? 'default' : 'ghost'} size="sm" onClick={() => setPerspective('project')} className="text-xs h-7">
            <FileText className="w-3 h-3 mr-1" /> Por Projeto
          </Button>
          <Button variant={perspective === 'resource' ? 'default' : 'ghost'} size="sm" onClick={() => setPerspective('resource')} className="text-xs h-7">
            <User className="w-3 h-3 mr-1" /> Por Recurso
          </Button>
        </div>

        <Select value={clientFilter} onValueChange={v => { setClientFilter(v); setContractFilter('all'); }}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Cliente" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {clientOptions.map(cl => (<SelectItem key={cl.id} value={cl.id}>{cl.nomeFantasia || cl.razaoSocial}</SelectItem>))}
          </SelectContent>
        </Select>

        <Select value={contractFilter} onValueChange={setContractFilter}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Contrato" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os contratos</SelectItem>
            {contractOptions.map(c => (<SelectItem key={c.id} value={c.id}>{c.codigo}</SelectItem>))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 flex-wrap">
          {sortedTeams.map(t => (
            <Badge key={t.id} variant={teamFilter.includes(t.id) ? 'default' : 'outline'} className="cursor-pointer text-xs" onClick={() => toggleTeamFilter(t.id)}>{t.name}</Badge>
          ))}
          <Badge variant={teamFilter.includes('__none__') ? 'default' : 'outline'} className="cursor-pointer text-xs" onClick={() => toggleTeamFilter('__none__')}>Sem equipe</Badge>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar nome, cargo, cliente..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 w-[220px]" />
        </div>

        {/* View mode toggle (only for project perspective) */}
        {perspective === 'project' && (
          <div className="flex items-center gap-1 border rounded-lg p-0.5">
            <Button variant={viewMode === 'compact' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('compact')} className="text-xs h-7">
              <LayoutGrid className="w-3 h-3 mr-1" /> Compacto
            </Button>
            <Button variant={viewMode === 'detailed' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('detailed')} className="text-xs h-7">
              <List className="w-3 h-3 mr-1" /> Detalhado
            </Button>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" /> Exportar</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={exportCSV}>CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={exportXLSX}>XLSX</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      {!hasResults ? (
        <EmptyState icon={LayoutGrid} title="Nenhum resultado encontrado" description="Ajuste os filtros para visualizar a distribuição de equipes." />
      ) : perspective === 'project' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {squadsData.map(renderContractCard)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resourceViewData.map(renderResourceCard)}
        </div>
      )}
    </div>
  );
}
