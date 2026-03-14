import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  FileText,
  Calendar,
  User,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Users,
  Filter,
  X,
  Download,
  ArrowUpDown,
  AlertTriangle,
} from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useResolvedResources } from '@/hooks/useResolvedResources';
import { useAuth } from '@/contexts/AuthContext';
import { useAlerts } from '@/hooks/useAlerts';
import { useOverheadPool } from '@/hooks/useOverheadPool';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { formatDate, formatCurrency, formatPercentage, calculateContractHealth } from '@/lib/calculations';
import { HealthStatus } from '@/types';
import { PageHeader } from '@/components/layout/PageHeader';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { toast } from 'sonner';
import { buildXlsx, downloadCSV } from '@/lib/importExport';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const healthLabels: Record<HealthStatus, string> = {
  saudavel: 'Saudável',
  atencao: 'Atenção',
  critico: 'Crítico',
};

const typeLabels = {
  sistema: 'Sistema',
  infraestrutura: 'Infraestrutura',
  hibrido: 'Híbrido',
};

const statusLabels = {
  implantacao: 'Em Implantação',
  operacao: 'Em Operação',
  suspenso: 'Suspenso',
  encerrado: 'Encerrado',
};

type SortOption = 'health' | 'valor-desc' | 'margem-desc' | 'margem-asc';

const sortLabels: Record<SortOption, string> = {
  health: 'Saúde',
  'valor-desc': 'Valor mensal ↓',
  'margem-desc': 'Margem % ↓',
  'margem-asc': 'Margem % ↑',
};

type AlertFilter = 'vencimento' | 'reajuste' | 'margem';

export default function ContractsPage() {
  const navigate = useNavigate();
  const { contracts, clients, resources: _rawResources, settings, deleteContract, overheadItems } = useData();
  const { resolvedResources: resources } = useResolvedResources();
  const { canEdit, canViewValues } = useAuth();
  const { getAlertsForContract } = useAlerts();
  const { getAllocation } = useOverheadPool();
  
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('health');
  
  // Filters
  const [filters, setFilters] = useState({
    segmento: 'all',
    tipo: 'all',
    status: 'all',
    health: [] as HealthStatus[],
    alerts: [] as AlertFilter[],
  });
  
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // Calculate health for each contract
  const contractsWithHealth = useMemo(() => contracts.map(contract => {
    const centralOH = getAllocation(contract.id).value;
    const health = calculateContractHealth(contract, resources, settings, overheadItems, centralOH);
    const client = clients.find(c => c.id === contract.clientId);
    const alerts = getAlertsForContract(contract.id);
    return { contract, health, client, alerts };
  }), [contracts, resources, settings, overheadItems, clients, getAlertsForContract, getAllocation]);
  
  // Apply filters
  const filteredContracts = contractsWithHealth.filter(({ contract, health, alerts }) => {
    const matchesSearch = 
      contract.nome.toLowerCase().includes(search.toLowerCase()) ||
      contract.codigo.toLowerCase().includes(search.toLowerCase());
    
    const matchesSegmento = filters.segmento === 'all' || contract.segmento === filters.segmento;
    const matchesTipo = filters.tipo === 'all' || contract.tipo === filters.tipo;
    const matchesStatus = filters.status === 'all' || contract.status === filters.status;
    const matchesHealth = filters.health.length === 0 || filters.health.includes(health.status);
    
    // Alert filters
    let matchesAlerts = true;
    if (filters.alerts.length > 0) {
      const hasVencimento = alerts.some(a => a.alertCategory === 'prazo');
      const hasReajuste = alerts.some(a => a.alertCategory === 'reajuste');
      const hasMargem = alerts.some(a => a.alertCategory === 'financeiro');
      matchesAlerts = filters.alerts.some(af => 
        (af === 'vencimento' && hasVencimento) ||
        (af === 'reajuste' && hasReajuste) ||
        (af === 'margem' && hasMargem)
      );
    }
    
    return matchesSearch && matchesSegmento && matchesTipo && matchesStatus && matchesHealth && matchesAlerts;
  });
  
  // Sort
  const sortedContracts = useMemo(() => {
    return [...filteredContracts].sort((a, b) => {
      switch (sortBy) {
        case 'valor-desc':
          return (b.health.receitaMensal || 0) - (a.health.receitaMensal || 0);
        case 'margem-desc':
          return b.health.margemPercentual - a.health.margemPercentual;
        case 'margem-asc':
          return a.health.margemPercentual - b.health.margemPercentual;
        case 'health':
        default: {
          const healthOrder = { critico: 0, atencao: 1, saudavel: 2 };
          return healthOrder[a.health.status] - healthOrder[b.health.status];
        }
      }
    });
  }, [filteredContracts, sortBy]);
  
  const activeFiltersCount = 
    (filters.segmento !== 'all' ? 1 : 0) +
    (filters.tipo !== 'all' ? 1 : 0) +
    (filters.status !== 'all' ? 1 : 0) +
    filters.health.length +
    filters.alerts.length;
  
  const clearFilters = () => {
    setFilters({
      segmento: 'all',
      tipo: 'all',
      status: 'all',
      health: [],
      alerts: [],
    });
  };
  
  const handleDelete = () => {
    if (deleteId) {
      deleteContract(deleteId);
      toast.success('Contrato excluído com sucesso');
      setDeleteId(null);
    }
  };
  
  const toggleHealthFilter = (status: HealthStatus) => {
    setFilters(prev => ({
      ...prev,
      health: prev.health.includes(status)
        ? prev.health.filter(h => h !== status)
        : [...prev.health, status],
    }));
  };

  const toggleAlertFilter = (alert: AlertFilter) => {
    setFilters(prev => ({
      ...prev,
      alerts: prev.alerts.includes(alert)
        ? prev.alerts.filter(a => a !== alert)
        : [...prev.alerts, alert],
    }));
  };

  const handleExport = (format: 'csv' | 'xlsx') => {
    const headers = [
      'Nome do Contrato',
      'Nome do Cliente',
      'Data Início',
      'Data Fim',
      'Data Base Reajuste',
      'Margem Mensal (R$)',
      'Margem (%)',
      'Receita Bruta (R$)',
      'Receita Líquida (R$)',
      'Impostos (%)',
      'Custo Total (R$)',
      'Qtd CLT',
      'Qtd PJ',
      'Qtd Outros',
    ];

    const rows = sortedContracts.map(({ contract, health, client }) => {
      const contractResources = resources.filter(r => r.contractId === contract.id);
      const qtdCLT = contractResources.filter(r => r.tipo === 'clt').length;
      const qtdPJ = contractResources.filter(r => r.tipo === 'pj').length;
      const qtdOutros = contractResources.filter(r => r.tipo === 'outro').length;
      const impostos = contract.percentualImpostosFaturamento ?? settings.percentualImpostosFaturamento;
      
      return [
        contract.nome,
        client?.nomeFantasia || client?.razaoSocial || '',
        contract.dataInicio,
        contract.dataFim || 'Indeterminado',
        contract.dataBaseReajuste,
        health.margemMensal.toFixed(2),
        health.margemPercentual.toFixed(2),
        health.receitaMensal.toFixed(2),
        health.receitaLiquida?.toFixed(2) ?? health.receitaMensal.toFixed(2),
        impostos.toString(),
        health.custoMensal.toFixed(2),
        qtdCLT.toString(),
        qtdPJ.toString(),
        qtdOutros.toString(),
      ];
    });

    if (format === 'csv') {
      const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'contratos.csv';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const blob = buildXlsx(headers, rows);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'contratos.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    }

    toast.success(`Exportação ${format.toUpperCase()} concluída`);
  };
  
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4 sm:space-y-6"
    >
      {/* Page Header */}
      <PageHeader
        title="Contratos"
        description="Gerencie seus contratos e acompanhe a saúde financeira"
        actions={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Exportar</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                  Exportar XLSX
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  Exportar CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {canEdit && (
              <Button onClick={() => navigate('/contratos/novo')} className="gap-2">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Novo Contrato</span>
                <span className="sm:hidden">Novo</span>
              </Button>
            )}
          </div>
        }
      />
      
      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[150px] sm:w-[170px]">
              <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(sortLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filtros</span>
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Filtros</h4>
                  {activeFiltersCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-auto py-1 px-2 text-xs">
                      Limpar
                    </Button>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Segmento</Label>
                  <Select value={filters.segmento} onValueChange={(v) => setFilters(prev => ({ ...prev, segmento: v }))}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="govtech">Govtech</SelectItem>
                      <SelectItem value="privado">Privado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Tipo</Label>
                  <Select value={filters.tipo} onValueChange={(v) => setFilters(prev => ({ ...prev, tipo: v }))}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="sistema">Sistema</SelectItem>
                      <SelectItem value="infraestrutura">Infraestrutura</SelectItem>
                      <SelectItem value="hibrido">Híbrido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Status Operacional</Label>
                  <Select value={filters.status} onValueChange={(v) => setFilters(prev => ({ ...prev, status: v }))}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="operacao">Em Operação</SelectItem>
                      <SelectItem value="implantacao">Em Implantação</SelectItem>
                      <SelectItem value="suspenso">Suspenso</SelectItem>
                      <SelectItem value="encerrado">Encerrado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Saúde Financeira</Label>
                  <div className="space-y-2">
                    {(['saudavel', 'atencao', 'critico'] as HealthStatus[]).map(status => (
                      <div key={status} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`health-${status}`}
                          checked={filters.health.includes(status)}
                          onCheckedChange={() => toggleHealthFilter(status)}
                        />
                        <label 
                          htmlFor={`health-${status}`}
                          className={cn(
                            'text-sm cursor-pointer',
                            status === 'saudavel' && 'text-health-healthy',
                            status === 'atencao' && 'text-health-attention',
                            status === 'critico' && 'text-health-critical',
                          )}
                        >
                          {healthLabels[status]}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Alertas
                  </Label>
                  <div className="space-y-2">
                    {([
                      { key: 'vencimento' as AlertFilter, label: 'Vencimento próximo' },
                      { key: 'reajuste' as AlertFilter, label: 'Reajuste próximo' },
                      { key: 'margem' as AlertFilter, label: 'Margem crítica / Déficit' },
                    ]).map(({ key, label }) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`alert-${key}`}
                          checked={filters.alerts.includes(key)}
                          onCheckedChange={() => toggleAlertFilter(key)}
                        />
                        <label htmlFor={`alert-${key}`} className="text-sm cursor-pointer">
                          {label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </motion.div>
      
      {/* Active filters */}
      {activeFiltersCount > 0 && (
        <motion.div variants={itemVariants} className="flex flex-wrap gap-2">
          {filters.segmento !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {filters.segmento === 'govtech' ? 'Govtech' : 'Privado'}
              <button onClick={() => setFilters(prev => ({ ...prev, segmento: 'all' }))}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.tipo !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {typeLabels[filters.tipo as keyof typeof typeLabels]}
              <button onClick={() => setFilters(prev => ({ ...prev, tipo: 'all' }))}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.status !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {statusLabels[filters.status as keyof typeof statusLabels]}
              <button onClick={() => setFilters(prev => ({ ...prev, status: 'all' }))}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.health.map(status => (
            <Badge 
              key={status} 
              variant="secondary" 
              className={cn(
                'gap-1',
                status === 'saudavel' && 'health-badge-healthy',
                status === 'atencao' && 'health-badge-attention',
                status === 'critico' && 'health-badge-critical',
              )}
            >
              {healthLabels[status]}
              <button onClick={() => toggleHealthFilter(status)}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {filters.alerts.map(alert => (
            <Badge key={alert} variant="secondary" className="gap-1">
              <AlertTriangle className="w-3 h-3" />
              {alert === 'vencimento' ? 'Vencimento' : alert === 'reajuste' ? 'Reajuste' : 'Margem'}
              <button onClick={() => toggleAlertFilter(alert)}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </motion.div>
      )}
      
      {/* Results count */}
      <motion.div variants={itemVariants}>
        <p className="text-sm text-muted-foreground">
          <span className="text-lg font-bold text-foreground">{sortedContracts.length}</span>{' '}
          contrato{sortedContracts.length !== 1 ? 's' : ''} encontrado{sortedContracts.length !== 1 ? 's' : ''}
        </p>
      </motion.div>
      
      {/* Contracts List */}
      {sortedContracts.length > 0 ? (
        <motion.div variants={containerVariants} className="space-y-3">
          {sortedContracts.map(({ contract, health, client, alerts }) => (
            <motion.div key={contract.id} variants={itemVariants}>
              <Card className="card-elevated hover:shadow-md transition-shadow">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-4">
                    {/* Health indicator */}
                    <div className={cn(
                      'w-1.5 h-14 rounded-full shrink-0',
                      health.status === 'saudavel' && 'bg-health-healthy',
                      health.status === 'atencao' && 'bg-health-attention',
                      health.status === 'critico' && 'bg-health-critical',
                    )} />
                    
                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground truncate text-sm sm:text-base">{contract.nome}</h3>
                        <Badge variant="secondary" className="text-xs shrink-0 hidden sm:inline-flex">
                          {contract.codigo}
                        </Badge>
                        {alerts.length > 0 && (
                          <AlertTriangle className="w-3.5 h-3.5 text-health-attention shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1 truncate">
                          <Users className="w-3.5 h-3.5 shrink-0" />
                          {client?.nomeFantasia || client?.razaoSocial}
                        </span>
                        <span className="hidden sm:flex items-center gap-1 shrink-0">
                          <Calendar className="w-3.5 h-3.5" />
                          {contract.dataFim ? formatDate(contract.dataFim) : 'Indeterminado'}
                        </span>
                        <span className="hidden md:flex items-center gap-1 shrink-0">
                          <User className="w-3.5 h-3.5" />
                          {contract.responsavelInterno}
                        </span>
                      </div>
                    </div>
                    
                    {/* Badges */}
                    <div className="hidden lg:flex items-center gap-2 shrink-0">
                      <Badge 
                        variant="secondary"
                        className={cn(
                          'text-xs',
                          contract.segmento === 'govtech' ? 'segment-badge-gov' : 'segment-badge-private'
                        )}
                      >
                        {contract.segmento === 'govtech' ? 'Gov' : 'Privado'}
                      </Badge>
                      <Badge 
                        variant="secondary"
                        className={cn(
                          'text-xs',
                          contract.tipo === 'sistema' && 'type-badge-system',
                          contract.tipo === 'infraestrutura' && 'type-badge-infra',
                          contract.tipo === 'hibrido' && 'type-badge-hybrid',
                        )}
                      >
                        {typeLabels[contract.tipo]}
                      </Badge>
                    </div>
                    
                    {/* Health / Values */}
                    <div className="text-right shrink-0 min-w-[80px] sm:min-w-[100px]">
                      {canViewValues ? (
                        <>
                          <p className={cn(
                            'text-base sm:text-lg font-bold',
                            health.margemPercentual >= 15 && 'text-health-healthy',
                            health.margemPercentual >= 0 && health.margemPercentual < 15 && 'text-health-attention',
                            health.margemPercentual < 0 && 'text-health-critical',
                          )}>
                            {formatPercentage(health.margemPercentual)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(health.margemMensal)}/mês
                          </p>
                        </>
                      ) : (
                        <Badge className={cn(
                          'text-xs',
                          health.status === 'saudavel' && 'health-badge-healthy',
                          health.status === 'atencao' && 'health-badge-attention',
                          health.status === 'critico' && 'health-badge-critical',
                        )}>
                          {healthLabels[health.status]}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/contratos/${contract.id}`)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Ver detalhes
                        </DropdownMenuItem>
                        {canEdit && (
                          <>
                            <DropdownMenuItem onClick={() => navigate(`/contratos/${contract.id}/editar`)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/contratos/${contract.id}/recursos`)}>
                              <Users className="w-4 h-4 mr-2" />
                              Recursos
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => setDeleteId(contract.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div variants={itemVariants}>
          <Card className="card-elevated">
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {search || activeFiltersCount > 0 ? 'Nenhum contrato encontrado' : 'Nenhum contrato cadastrado'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {search || activeFiltersCount > 0 
                  ? 'Tente ajustar os filtros de busca' 
                  : 'Comece cadastrando seu primeiro contrato'
                }
              </p>
              {canEdit && !search && activeFiltersCount === 0 && (
                <Button onClick={() => navigate('/contratos/novo')} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Cadastrar Contrato
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
      
      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir contrato?"
        description="Esta ação não pode ser desfeita. O contrato e todos os seus recursos serão removidos permanentemente."
      />
    </motion.div>
  );
}
