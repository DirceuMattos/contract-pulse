import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Download, ChevronDown, ChevronUp, Search, Users, FileText } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { EmptyState } from '@/components/ui/empty-state';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { calculateContractHealth } from '@/lib/calculations';
import { healthConfig } from '@/lib/uiConstants';
import { Resource, Team } from '@/types';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

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

export default function SquadsPage() {
  const { clients, contracts, resources, settings, overheadItems, jobTitles, teams } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [clientFilter, setClientFilter] = useState<string>('all');
  const [contractFilter, setContractFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<'contract' | 'client'>('contract');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Sort teams by sortOrder
  const sortedTeams = useMemo(() => [...teams].sort((a, b) => a.sortOrder - b.sortOrder), [teams]);

  // Build consolidated data
  const squadsData = useMemo(() => {
    const result: ContractSquadData[] = [];

    const activeContracts = contracts.filter(c => c.status === 'operacao' || c.status === 'implantacao');

    for (const contract of activeContracts) {
      const client = clients.find(cl => cl.id === contract.clientId);
      if (!client) continue;

      // Filter by client
      if (clientFilter !== 'all' && contract.clientId !== clientFilter) continue;
      // Filter by contract
      if (contractFilter !== 'all' && contract.id !== contractFilter) continue;

      const contractResources = resources.filter(r => r.contractId === contract.id);
      const hrResources = contractResources.filter(r => r.tipo === 'clt' || r.tipo === 'pj');

      if (hrResources.length === 0) continue;

      // Search filter
      const filteredHR = searchQuery
        ? hrResources.filter(r =>
            (r.cargo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (r.nome || '').toLowerCase().includes(searchQuery.toLowerCase())
          )
        : hrResources;

      if (filteredHR.length === 0) continue;

      // Calculate health
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

        if (!teamMap.has(key)) {
          teamMap.set(key, { team: team || null, resources: [] });
        }
        teamMap.get(key)!.resources.push(hr);
      }

      const totalFTE = filteredHR.reduce((sum, r) => sum + r.percentualDedicacao / 100, 0);

      // Build team array ordered by sortOrder
      const teamsArray: SquadTeamData[] = [];

      for (const t of sortedTeams) {
        const entry = teamMap.get(t.id);
        if (!entry) continue;
        const fte = entry.resources.reduce((s, r) => s + r.percentualDedicacao / 100, 0);
        teamsArray.push({
          team: t,
          teamName: t.name,
          resources: entry.resources.sort((a, b) => b.percentualDedicacao - a.percentualDedicacao),
          fte,
          percent: totalFTE > 0 ? (fte / totalFTE) * 100 : 0,
        });
      }

      // "Sem equipe" at the end
      const noTeam = teamMap.get('__none__');
      if (noTeam) {
        const fte = noTeam.resources.reduce((s, r) => s + r.percentualDedicacao / 100, 0);
        teamsArray.push({
          team: null,
          teamName: 'Sem equipe',
          resources: noTeam.resources.sort((a, b) => b.percentualDedicacao - a.percentualDedicacao),
          fte,
          percent: totalFTE > 0 ? (fte / totalFTE) * 100 : 0,
        });
      }

      // Filter by team
      const finalTeams = teamFilter.length > 0
        ? teamsArray.filter(td => teamFilter.includes(td.team?.id || '__none__'))
        : teamsArray;

      if (finalTeams.length === 0) continue;

      result.push({
        contractId: contract.id,
        contractCodigo: contract.codigo,
        contractNome: contract.nome,
        clientId: client.id,
        clientName: client.razaoSocial,
        segmento: contract.segmento,
        healthStatus: health.status,
        healthLabel: hc.label,
        totalFTE,
        hrCount: filteredHR.length,
        teams: finalTeams,
      });
    }

    return result;
  }, [contracts, clients, resources, settings, overheadItems, jobTitles, teams, sortedTeams, clientFilter, contractFilter, teamFilter, searchQuery]);

  // Clients with contracts for filter
  const clientOptions = useMemo(() => {
    const ids = new Set(contracts.filter(c => c.status === 'operacao' || c.status === 'implantacao').map(c => c.clientId));
    return clients.filter(cl => ids.has(cl.id)).sort((a, b) => a.razaoSocial.localeCompare(b.razaoSocial));
  }, [clients, contracts]);

  // Contracts for filter (scoped to selected client)
  const contractOptions = useMemo(() => {
    const active = contracts.filter(c => c.status === 'operacao' || c.status === 'implantacao');
    if (clientFilter !== 'all') return active.filter(c => c.clientId === clientFilter);
    return active;
  }, [contracts, clientFilter]);

  const toggleExpand = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleTeamFilter = (teamId: string) => {
    setTeamFilter(prev =>
      prev.includes(teamId) ? prev.filter(t => t !== teamId) : [...prev, teamId]
    );
  };

  // Export functions
  const buildExportRows = () => {
    const rows: Record<string, string | number>[] = [];
    for (const cd of squadsData) {
      for (const td of cd.teams) {
        for (const r of td.resources) {
          rows.push({
            Cliente: cd.clientName,
            Contrato: cd.contractCodigo,
            Equipe: td.teamName,
            'Cargo/Função': r.cargo || r.nome,
            Tipo: r.tipo.toUpperCase(),
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
    const a = document.createElement('a');
    a.href = url;
    a.download = 'squads-export.csv';
    a.click();
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

  // Group by client view
  const groupedByClient = useMemo(() => {
    if (groupBy !== 'client') return null;
    const map = new Map<string, ContractSquadData[]>();
    for (const cd of squadsData) {
      if (!map.has(cd.clientId)) map.set(cd.clientId, []);
      map.get(cd.clientId)!.push(cd);
    }
    return Array.from(map.entries()).map(([clientId, contracts]) => ({
      clientId,
      clientName: contracts[0].clientName,
      contracts,
    }));
  }, [squadsData, groupBy]);

  const allHR = resources.filter(r => r.tipo === 'clt' || r.tipo === 'pj');

  if (allHR.length === 0) {
    return (
      <div>
        <PageHeader
          title="Squads"
          description="Distribuição de equipes por cliente e contrato"
          breadcrumbs={[{ label: 'Squads' }]}
        />
        <EmptyState
          icon={Users}
          title="Nenhum recurso humano cadastrado"
          description="Cadastre recursos humanos nos contratos para visualizar a distribuição de equipes."
          actionLabel="Ir para Contratos"
          onAction={() => navigate('/contratos')}
        />
      </div>
    );
  }

  const renderTeamBar = (td: SquadTeamData) => (
    <div key={td.teamName} className="flex items-center gap-2 text-sm">
      <span className="w-32 truncate font-medium text-foreground">{td.teamName}</span>
      <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
        <div
          className="h-full bg-primary/70 rounded-full transition-all"
          style={{ width: `${Math.min(td.percent, 100)}%` }}
        />
      </div>
      <span className="w-20 text-right text-muted-foreground tabular-nums">
        {td.fte.toFixed(1)} FTE
      </span>
      <span className="w-14 text-right text-muted-foreground tabular-nums">
        {td.percent.toFixed(0)}%
      </span>
    </div>
  );

  const renderDetailSection = (td: SquadTeamData) => (
    <div key={td.teamName} className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <Badge variant="outline" className="text-xs">{td.teamName}</Badge>
        <span className="text-xs text-muted-foreground">{td.fte.toFixed(1)} FTE · {td.percent.toFixed(0)}%</span>
      </div>
      <div className="ml-4 space-y-1">
        {td.resources.map(r => (
          <div key={r.id} className="flex items-center gap-3 text-sm py-1 border-b border-border/40 last:border-0">
            <span className="flex-1 text-foreground">{r.cargo || r.nome}</span>
            <Badge variant="secondary" className="text-[10px] uppercase">{r.tipo}</Badge>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="w-14 text-right tabular-nums font-medium">
                  {r.percentualDedicacao}%
                </span>
              </TooltipTrigger>
              <TooltipContent>Dedicação = {(r.percentualDedicacao / 100).toFixed(2)} FTE</TooltipContent>
            </Tooltip>
            {r.percentualDedicacao > 100 && (
              <Badge variant="destructive" className="text-[10px]">&gt;100%</Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderContractCard = (cd: ContractSquadData) => {
    const isExpanded = expandedCards.has(cd.contractId);
    const healthBadge = healthConfig[cd.healthStatus as keyof typeof healthConfig];

    return (
      <Card key={cd.contractId} className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base">{cd.clientName}</CardTitle>
                <span className="text-sm text-muted-foreground">· {cd.contractCodigo}</span>
              </div>
              <p className="text-sm text-muted-foreground">{cd.contractNome}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="text-[10px]">
                {cd.segmento === 'govtech' ? 'Gov' : 'Privado'}
              </Badge>
              {healthBadge && (
                <Badge variant="outline" className={`text-[10px] ${healthBadge.badgeClass}`}>
                  {healthBadge.label}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
            <span className="tabular-nums font-medium">{cd.totalFTE.toFixed(1)} FTE</span>
            <span>{cd.hrCount} recursos</span>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {cd.teams.map(renderTeamBar)}

          <Collapsible open={isExpanded} onOpenChange={() => toggleExpand(cd.contractId)}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full mt-2">
                {isExpanded ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
                {isExpanded ? 'Ocultar detalhes' : 'Ver detalhes'}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4 border-t mt-2">
              {cd.teams.map(renderDetailSection)}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    );
  };

  return (
    <div>
      <PageHeader
        title="Squads"
        description="Distribuição de equipes por cliente e contrato"
        breadcrumbs={[{ label: 'Squads' }]}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Select value={clientFilter} onValueChange={v => { setClientFilter(v); setContractFilter('all'); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {clientOptions.map(cl => (
              <SelectItem key={cl.id} value={cl.id}>{cl.nomeFantasia || cl.razaoSocial}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={contractFilter} onValueChange={setContractFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Contrato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os contratos</SelectItem>
            {contractOptions.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.codigo}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 flex-wrap">
          {sortedTeams.map(t => (
            <Badge
              key={t.id}
              variant={teamFilter.includes(t.id) ? 'default' : 'outline'}
              className="cursor-pointer text-xs"
              onClick={() => toggleTeamFilter(t.id)}
            >
              {t.name}
            </Badge>
          ))}
          <Badge
            variant={teamFilter.includes('__none__') ? 'default' : 'outline'}
            className="cursor-pointer text-xs"
            onClick={() => toggleTeamFilter('__none__')}
          >
            Sem equipe
          </Badge>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cargo..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 w-[180px]"
          />
        </div>

        <div className="flex items-center gap-1 border rounded-lg p-0.5">
          <Button
            variant={groupBy === 'contract' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setGroupBy('contract')}
            className="text-xs h-7"
          >
            <FileText className="w-3 h-3 mr-1" /> Por Contrato
          </Button>
          <Button
            variant={groupBy === 'client' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setGroupBy('client')}
            className="text-xs h-7"
          >
            <Users className="w-3 h-3 mr-1" /> Por Cliente
          </Button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" /> Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={exportCSV}>CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={exportXLSX}>XLSX</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      {squadsData.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="Nenhum resultado encontrado"
          description="Ajuste os filtros para visualizar a distribuição de equipes."
        />
      ) : groupBy === 'contract' ? (
        <div className="space-y-4">
          {squadsData.map(renderContractCard)}
        </div>
      ) : (
        <div className="space-y-6">
          {groupedByClient?.map(group => (
            <div key={group.clientId}>
              <h2 className="text-lg font-semibold mb-3 text-foreground">{group.clientName}</h2>
              <div className="ml-4 space-y-4">
                {group.contracts.map(renderContractCard)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}