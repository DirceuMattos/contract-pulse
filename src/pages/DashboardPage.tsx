import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Building2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Target,
  ArrowRight,
  Layers,
  Plus,
  ChevronsUpDown,
  Check,
  Info,
  ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useResolvedResources } from '@/hooks/useResolvedResources';
import { useAlerts } from '@/hooks/useAlerts';
import { useOverheadPool } from '@/hooks/useOverheadPool';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  calculateDashboardKPIs,
  calculateContractHealth,
  formatCurrency,
  formatPercentage,
  formatDate,
  getDaysUntil,
} from '@/lib/calculations';
import { cn } from '@/lib/utils';
import { HealthStatus, AlertCategory } from '@/types';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const healthColors: Record<HealthStatus, string> = {
  saudavel: 'hsl(142, 71%, 45%)',
  atencao: 'hsl(38, 92%, 50%)',
  critico: 'hsl(0, 72%, 51%)',
};

const healthLabels: Record<HealthStatus, string> = {
  saudavel: 'Saudável',
  atencao: 'Atenção',
  critico: 'Crítico',
};

const alertCategoryLabels: Record<string, string> = {
  financeiro: 'Financeiro',
  prazo: 'Prazo',
  reajuste: 'Reajuste',
  governanca: 'Governança',
};

const alertCategoryColors: Record<string, string> = {
  financeiro: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  prazo: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  reajuste: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  governanca: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
};

const FILTERS_STORAGE_KEY = 'bnp_dashboard_filters';

function loadFilters(): { selectedClientId: string; selectedContractId: string } {
  try {
    const stored = localStorage.getItem(FILTERS_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { selectedClientId: 'all', selectedContractId: 'all' };
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { canViewValues: _canViewValues, userRole } = useAuth();
  const canViewValues = _canViewValues && userRole !== 'administrativo';
  const { contracts, clients, resources: _rawResources, settings } = useData();
  const { resolvedResources: resources } = useResolvedResources();
  const { alerts, criticalCount, warningCount, infoCount } = useAlerts();
  const { result: overheadPoolResult } = useOverheadPool();
  const savedFilters = loadFilters();
  const [selectedClientId, setSelectedClientId] = useState(savedFilters.selectedClientId);
  const [selectedContractId, setSelectedContractId] = useState(savedFilters.selectedContractId);
  const [clientOpen, setClientOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);

  // Persist filters
  useEffect(() => {
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify({ selectedClientId, selectedContractId }));
  }, [selectedClientId, selectedContractId]);

  // Active contracts
  const activeContracts = useMemo(() =>
    contracts.filter(c => c.status === 'operacao' || c.status === 'implantacao'),
    [contracts]
  );

  // Unique clients from active contracts
  const clientOptions = useMemo(() => {
    const clientIds = [...new Set(activeContracts.map(c => c.clientId))];
    return clientIds
      .map(id => clients.find(c => c.id === id))
      .filter(Boolean)
      .sort((a, b) => a!.razaoSocial.localeCompare(b!.razaoSocial));
  }, [activeContracts, clients]);

  // Contracts filtered by client
  const contractOptions = useMemo(() => {
    let filtered = activeContracts;
    if (selectedClientId !== 'all') {
      filtered = filtered.filter(c => c.clientId === selectedClientId);
    }
    return filtered.sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [activeContracts, selectedClientId]);

  // Filtered contracts for dashboard
  const filteredContracts = useMemo(() => {
    let result = activeContracts;
    if (selectedClientId !== 'all') {
      result = result.filter(c => c.clientId === selectedClientId);
    }
    if (selectedContractId !== 'all') {
      result = result.filter(c => c.id === selectedContractId);
    }
    return result;
  }, [activeContracts, selectedClientId, selectedContractId]);

  const centralOverheadMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of overheadPoolResult.allocations) {
      map.set(a.contractId, a.overheadAllocated);
    }
    return map;
  }, [overheadPoolResult]);

  // KPIs from filtered contracts
  const kpis = useMemo(() =>
    calculateDashboardKPIs(filteredContracts, resources, settings, canViewValues, [], centralOverheadMap),
    [filteredContracts, resources, settings, canViewValues, centralOverheadMap]
  );

  // Charts data
  const healthChartData = [
    { name: 'Saudável', value: kpis.contratosSaudavel, color: healthColors.saudavel },
    { name: 'Atenção', value: kpis.contratosAtencao, color: healthColors.atencao },
    { name: 'Crítico', value: kpis.contratosCritico, color: healthColors.critico },
  ].filter(d => d.value > 0);

  const segmentChartData = [
    { name: 'Govtech', value: kpis.contratosGovtech, color: 'hsl(222, 47%, 35%)' },
    { name: 'Privado', value: kpis.contratosPrivado, color: 'hsl(262, 52%, 47%)' },
  ];

  const typeChartData = [
    { name: 'Sistema', value: kpis.contratosSistema, color: 'hsl(199, 89%, 48%)' },
    { name: 'Infraestrutura', value: kpis.contratosInfraestrutura, color: 'hsl(25, 95%, 53%)' },
    { name: 'Híbrido', value: kpis.contratosHibrido, color: 'hsl(280, 67%, 55%)' },
  ].filter(d => d.value > 0);

  // Financial aggregation by health, segment, type
  const financialBreakdown = useMemo(() => {
    const byHealth: Record<string, { receita: number; custo: number; margem: number }> = {
      saudavel: { receita: 0, custo: 0, margem: 0 },
      atencao: { receita: 0, custo: 0, margem: 0 },
      critico: { receita: 0, custo: 0, margem: 0 },
    };
    const bySegment: Record<string, { receita: number; custo: number; margem: number }> = {
      govtech: { receita: 0, custo: 0, margem: 0 },
      privado: { receita: 0, custo: 0, margem: 0 },
    };
    const byType: Record<string, { receita: number; custo: number; margem: number }> = {
      sistema: { receita: 0, custo: 0, margem: 0 },
      infraestrutura: { receita: 0, custo: 0, margem: 0 },
      hibrido: { receita: 0, custo: 0, margem: 0 },
    };

    for (const contract of filteredContracts) {
      const health = calculateContractHealth(contract, resources, settings, [], centralOverheadMap.get(contract.id) ?? 0);
      const entry = { receita: health.receitaLiquida, custo: health.custoMensal, margem: health.margemMensal };

      if (byHealth[health.status]) {
        byHealth[health.status].receita += entry.receita;
        byHealth[health.status].custo += entry.custo;
        byHealth[health.status].margem += entry.margem;
      }
      if (bySegment[contract.segmento]) {
        bySegment[contract.segmento].receita += entry.receita;
        bySegment[contract.segmento].custo += entry.custo;
        bySegment[contract.segmento].margem += entry.margem;
      }
      if (byType[contract.tipo]) {
        byType[contract.tipo].receita += entry.receita;
        byType[contract.tipo].custo += entry.custo;
        byType[contract.tipo].margem += entry.margem;
      }
    }

    return { byHealth, bySegment, byType };
  }, [filteredContracts, resources, settings, centralOverheadMap]);

  // Filtered contract IDs
  const filteredContractIds = useMemo(() => new Set(filteredContracts.map(c => c.id)), [filteredContracts]);

  // Alerts filtered by selected contracts
  const filteredAlerts = useMemo(() =>
    alerts.filter(a => filteredContractIds.has(a.contractId)),
    [alerts, filteredContractIds]
  );

  const filteredCriticalCount = filteredAlerts.filter(a => a.severity === 'critico').length;
  const filteredWarningCount = filteredAlerts.filter(a => a.severity === 'atencao').length;
  const filteredInfoCount = filteredAlerts.filter(a => a.severity === 'info').length;

  // Alerts table: group by contract, pick highest severity alert per contract, then flatten for display
  const alertsTableData = useMemo(() => {
    // Get unique contracts that have alerts
    const contractAlertMap = new Map<string, typeof filteredAlerts>();
    for (const alert of filteredAlerts) {
      const existing = contractAlertMap.get(alert.contractId) || [];
      existing.push(alert);
      contractAlertMap.set(alert.contractId, existing);
    }

    // Build rows: one row per alert
    const rows = filteredAlerts.map(alert => {
      const contract = contracts.find(c => c.id === alert.contractId);
      const client = contract ? clients.find(cl => cl.id === contract.clientId) : undefined;
      const health = contract ? calculateContractHealth(contract, resources, settings, [], centralOverheadMap.get(contract.id) ?? 0) : null;
      return { alert, contract, client, health };
    });

    // Sort by severity, then resultado mensal, then days until end
    const severityOrder: Record<string, number> = { critico: 0, atencao: 1, info: 2 };
    return rows.sort((a, b) => {
      const sevDiff = (severityOrder[a.alert.severity] ?? 2) - (severityOrder[b.alert.severity] ?? 2);
      if (sevDiff !== 0) return sevDiff;
      const margemA = a.health?.margemMensal ?? 0;
      const margemB = b.health?.margemMensal ?? 0;
      if (margemA !== margemB) return margemA - margemB;
      const daysA = a.contract?.dataFim ? getDaysUntil(a.contract.dataFim) : 9999;
      const daysB = b.contract?.dataFim ? getDaysUntil(b.contract.dataFim) : 9999;
      return daysA - daysB;
    });
  }, [filteredAlerts, contracts, clients, resources, settings, centralOverheadMap]);

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedContractId('all');
    setClientOpen(false);
  };

  const handleContractSelect = (contractId: string) => {
    setSelectedContractId(contractId);
    setContractOpen(false);
  };

  const selectedClientLabel = selectedClientId === 'all'
    ? 'Todos os clientes'
    : (() => {
        const c = clients.find(cl => cl.id === selectedClientId);
        return c ? `${c.razaoSocial}` : 'Todos os clientes';
      })();

  const selectedContractLabel = selectedContractId === 'all'
    ? 'Todos os contratos'
    : (() => {
        const c = contracts.find(ct => ct.id === selectedContractId);
        return c ? `${c.codigo} — ${c.nome}` : 'Todos os contratos';
      })();

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Page Header */}
      <PageHeader
        title="Dashboard"
        description="Visão consolidada do portfólio de contratos"
        actions={
          <Button onClick={() => navigate('/contratos/novo')} className="gap-2 w-full sm:w-auto">
            <Plus className="w-4 h-4" />
            Novo Contrato
          </Button>
        }
      />

      {/* Filters Row */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3">
        {/* Client Filter */}
        <Popover open={clientOpen} onOpenChange={setClientOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={clientOpen}
              className="justify-between w-full sm:min-w-[250px] text-left font-normal"
            >
              <span className="truncate">{selectedClientLabel}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[350px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar cliente..." />
              <CommandList>
                <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                <CommandGroup>
                  <CommandItem value="all" onSelect={() => handleClientSelect('all')}>
                    <Check className={cn("mr-2 h-4 w-4", selectedClientId === 'all' ? "opacity-100" : "opacity-0")} />
                    Todos os clientes
                  </CommandItem>
                  {clientOptions.map(client => client && (
                    <CommandItem
                      key={client.id}
                      value={`${client.razaoSocial} ${client.cnpj}`}
                      onSelect={() => handleClientSelect(client.id)}
                    >
                      <Check className={cn("mr-2 h-4 w-4", selectedClientId === client.id ? "opacity-100" : "opacity-0")} />
                      <span className="truncate">{client.razaoSocial} — {client.cnpj}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Contract Filter */}
        <Popover open={contractOpen} onOpenChange={setContractOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={contractOpen}
              className="justify-between w-full sm:min-w-[300px] text-left font-normal"
            >
              <span className="truncate">{selectedContractLabel}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar contrato..." />
              <CommandList>
                <CommandEmpty>Nenhum contrato encontrado.</CommandEmpty>
                <CommandGroup>
                  <CommandItem value="all" onSelect={() => handleContractSelect('all')}>
                    <Check className={cn("mr-2 h-4 w-4", selectedContractId === 'all' ? "opacity-100" : "opacity-0")} />
                    Todos os contratos
                  </CommandItem>
                  {contractOptions.map(contract => (
                    <CommandItem
                      key={contract.id}
                      value={`${contract.codigo} ${contract.nome}`}
                      onSelect={() => handleContractSelect(contract.id)}
                    >
                      <Check className={cn("mr-2 h-4 w-4", selectedContractId === contract.id ? "opacity-100" : "opacity-0")} />
                      <span className="truncate">{contract.codigo} — {contract.nome} ({formatDate(contract.dataInicio)} a {contract.dataFim ? formatDate(contract.dataFim) : 'Indeterminado'})</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {(selectedClientId !== 'all' || selectedContractId !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSelectedClientId('all'); setSelectedContractId('all'); }}
            className="text-muted-foreground"
          >
            Limpar filtros
          </Button>
        )}
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Contracts */}
        <Card className="card-kpi">
          <CardContent className="p-0">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Contratos</p>
                <p className="text-3xl font-bold text-foreground mt-1">{kpis.totalContratos}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="flex gap-3 mt-3 pt-3 border-t border-border">
              <span className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{kpis.contratosGovtech}</span> Govtech
              </span>
              <span className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{kpis.contratosPrivado}</span> Privado
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Health Status */}
        <Card className="card-kpi">
          <CardContent className="p-0">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saúde do Portfólio</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-3xl font-bold text-health-healthy">{kpis.contratosSaudavel}</p>
                  <p className="text-sm text-muted-foreground">saudáveis</p>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-health-healthy/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-health-healthy" />
              </div>
            </div>
            <div className="flex gap-3 mt-3 pt-3 border-t border-border">
              <span className="text-xs">
                <span className="font-medium text-health-attention">{kpis.contratosAtencao}</span>
                <span className="text-muted-foreground"> atenção</span>
              </span>
              <span className="text-xs">
                <span className="font-medium text-health-critical">{kpis.contratosCritico}</span>
                <span className="text-muted-foreground"> crítico</span>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Revenue (C-Level only) or Clients count */}
        {canViewValues ? (
          <Card className="card-kpi">
            <CardContent className="p-0">
              <div className="flex items-start justify-between">
              <div>
                  <p className="text-sm text-muted-foreground">Receita Mensal Líquida</p>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    {formatCurrency(kpis.receitaLiquidaTotal || 0)}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-accent" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Bruta: {formatCurrency(kpis.receitaTotal || 0)} | Custo: {formatCurrency(kpis.custoTotal || 0)}
                </span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="card-kpi">
            <CardContent className="p-0">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Clientes Ativos</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{clientOptions.length}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-chart-4/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-chart-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Margin (C-Level only) or Types */}
        {canViewValues ? (
          <Card className="card-kpi">
            <CardContent className="p-0">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Margem Total</p>
                  <p className={cn(
                    'text-3xl font-bold mt-1',
                    (kpis.margemTotal || 0) >= 0 ? 'text-health-healthy' : 'text-health-critical'
                  )}>
                    {formatCurrency(kpis.margemTotal || 0)}
                  </p>
                </div>
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  (kpis.margemTotal || 0) >= 0 ? 'bg-health-healthy/10' : 'bg-health-critical/10'
                )}>
                  {(kpis.margemTotal || 0) >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-health-healthy" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-health-critical" />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                <Target className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {kpis.receitaLiquidaTotal ? formatPercentage(((kpis.margemTotal || 0) / kpis.receitaLiquidaTotal) * 100) : '0%'} da receita líquida
                </span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="card-kpi">
            <CardContent className="p-0">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tipos de Contrato</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{kpis.contratosSistema}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="flex gap-3 mt-3 pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{kpis.contratosInfraestrutura}</span> Infra
                </span>
                <span className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{kpis.contratosHibrido}</span> Híbrido
                </span>
            </div>
            {canViewValues && (
              <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                {([{ key: 'govtech', label: 'Govtech', color: 'hsl(222, 47%, 35%)' }, { key: 'privado', label: 'Privado', color: 'hsl(262, 52%, 47%)' }]).map(({ key, label, color }) => {
                  const d = financialBreakdown.bySegment[key];
                  if (!d || (d.receita === 0 && d.custo === 0)) return null;
                  return (
                    <div key={key} className="flex items-start gap-1.5 text-xs">
                      <div className="w-2 h-2 rounded-sm mt-1 shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-muted-foreground">
                        {label} — Receita: <span className="font-medium text-foreground">{formatCurrency(d.receita)}</span> | Custo: <span className="font-medium text-foreground">{formatCurrency(d.custo)}</span> | Resultado: <span className={cn("font-medium", d.margem >= 0 ? "text-health-healthy" : "text-health-critical")}>{formatCurrency(d.margem)}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}
      </motion.div>

      {/* Charts Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Health Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Saúde dos Contratos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-40 sm:h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={healthChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {healthChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value} contratos`, '']}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border))',
                      backgroundColor: 'hsl(var(--popover))',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {healthChartData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-xs text-muted-foreground">{entry.name}</span>
                </div>
              ))}
            </div>
            {canViewValues && (
              <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                {(['saudavel', 'atencao', 'critico'] as const).map((key) => {
                  const d = financialBreakdown.byHealth[key];
                  if (!d || (d.receita === 0 && d.custo === 0)) return null;
                  return (
                    <div key={key} className="flex items-start gap-1.5 text-xs">
                      <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ backgroundColor: healthColors[key] }} />
                      <span className="text-muted-foreground">
                        {healthLabels[key]} — Receita: <span className="font-medium text-foreground">{formatCurrency(d.receita)}</span> | Custo: <span className="font-medium text-foreground">{formatCurrency(d.custo)}</span> | Resultado: <span className={cn("font-medium", d.margem >= 0 ? "text-health-healthy" : "text-health-critical")}>{formatCurrency(d.margem)}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Segment Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Por Segmento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-40 sm:h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={segmentChartData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => [`${value} contratos`, '']}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border))',
                      backgroundColor: 'hsl(var(--popover))',
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {segmentChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Type Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-40 sm:h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeChartData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => [`${value} contratos`, '']}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border))',
                      backgroundColor: 'hsl(var(--popover))',
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {typeChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Contracts with Alerts Table */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold">Contratos com alertas</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Lista automática de contratos que exigem atenção: déficit, margem baixa, vencimento ou reajuste próximos.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {filteredCriticalCount > 0 && (
                  <Badge className="bg-health-critical/10 text-health-critical border-health-critical/20 hover:bg-health-critical/20">
                    {filteredCriticalCount} crítico{filteredCriticalCount > 1 ? 's' : ''}
                  </Badge>
                )}
                {filteredWarningCount > 0 && (
                  <Badge className="bg-health-attention/10 text-health-attention border-health-attention/20 hover:bg-health-attention/20">
                    {filteredWarningCount} atenção
                  </Badge>
                )}
                {filteredInfoCount > 0 && (
                  <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20">
                    {filteredInfoCount} informativo{filteredInfoCount > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {alertsTableData.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Severidade</TableHead>
                      <TableHead className="w-[120px]">Tipo</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Contrato</TableHead>
                      <TableHead className="w-[100px]">Saúde</TableHead>
                      {canViewValues && <TableHead className="text-right w-[130px]">Resultado</TableHead>}
                      <TableHead className="w-[100px]">Data Fim</TableHead>
                      <TableHead className="w-[120px]">Próx. Reajuste</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alertsTableData.map(({ alert, contract, client, health }) => (
                      <TableRow
                        key={alert.id}
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => contract && navigate(`/contratos/${contract.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              'w-2 h-2 rounded-full',
                              alert.severity === 'critico' && 'bg-health-critical',
                              alert.severity === 'atencao' && 'bg-health-attention',
                              alert.severity === 'info' && 'bg-blue-500',
                            )} />
                            <span className={cn(
                              'text-xs font-medium',
                              alert.severity === 'critico' && 'text-health-critical',
                              alert.severity === 'atencao' && 'text-health-attention',
                              alert.severity === 'info' && 'text-blue-500',
                            )}>
                              {alert.severity === 'critico' ? 'Crítico' : alert.severity === 'atencao' ? 'Atenção' : 'Info'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {alert.alertCategory && (
                            <span className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                              alertCategoryColors[alert.alertCategory] || 'bg-muted text-muted-foreground'
                            )}>
                              {alertCategoryLabels[alert.alertCategory] || alert.alertCategory}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {client?.nomeFantasia || client?.razaoSocial || '—'}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{contract?.codigo}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{alert.title}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {health && (
                            <Badge className={cn(
                              'text-xs',
                              health.status === 'saudavel' && 'health-badge-healthy',
                              health.status === 'atencao' && 'health-badge-attention',
                              health.status === 'critico' && 'health-badge-critical',
                            )}>
                              {healthLabels[health.status]}
                            </Badge>
                          )}
                        </TableCell>
                        {canViewValues && (
                          <TableCell className={cn(
                            'text-right text-sm font-medium',
                            (health?.margemMensal ?? 0) >= 0 ? 'text-health-healthy' : 'text-health-critical'
                          )}>
                            {health ? formatCurrency(health.margemMensal) : '—'}
                          </TableCell>
                        )}
                        <TableCell className="text-sm text-muted-foreground">
                          {contract?.dataFim ? formatDate(contract.dataFim) : 'Indeterminado'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {contract?.dataBaseReajuste ? formatDate(contract.dataBaseReajuste) : '—'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              contract && navigate(`/contratos/${contract.id}`);
                            }}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-health-healthy/30 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-foreground mb-1">Nenhum alerta neste período</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                  Não há contratos com déficit, margem baixa ou eventos próximos de vencimento/reajuste com os filtros atuais.
                </p>
                <Button variant="outline" onClick={() => navigate('/contratos')} className="gap-2">
                  Ver todos os contratos
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
