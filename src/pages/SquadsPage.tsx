import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Download, Search, Users, FileText, Eye, List } from 'lucide-react';
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
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

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

      // Expanded search: name, cargo, client name, contract code
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

      // Map resources to teams
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
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Squads');
    XLSX.writeFile(wb, 'squads-export.xlsx');
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

  // --- Render helpers ---

  const renderTeamBar = (td: SquadTeamData) => (
    <div key={td.teamName} className="flex items-center gap-2 text-sm">
      <span className="w-32 truncate font-medium text-foreground">
        {td.teamName}
        {viewMode === 'compact' && <span className="text-muted-foreground ml-1">({td.resources.length})</span>}
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
        {/* Colored header */}
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
          {/* Team bars */}
          {cd.teams.map(renderTeamBar)}

          {/* Detailed: accordion per team */}
          {viewMode === 'detailed' && renderDetailedTeams(cd)}

          {/* Card actions */}
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

  // --- Main render ---

  return (
    <div>
      <PageHeader title="Squads" description="Distribuição de equipes por cliente e contrato" breadcrumbs={[{ label: 'Squads' }]} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
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

        {/* View mode toggle */}
        <div className="flex items-center gap-1 border rounded-lg p-0.5">
          <Button variant={viewMode === 'compact' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('compact')} className="text-xs h-7">
            <LayoutGrid className="w-3 h-3 mr-1" /> Compacto
          </Button>
          <Button variant={viewMode === 'detailed' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('detailed')} className="text-xs h-7">
            <List className="w-3 h-3 mr-1" /> Detalhado
          </Button>
        </div>

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
      {squadsData.length === 0 ? (
        <EmptyState icon={LayoutGrid} title="Nenhum resultado encontrado" description="Ajuste os filtros para visualizar a distribuição de equipes." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {squadsData.map(renderContractCard)}
        </div>
      )}
    </div>
  );
}
