import React, { useState, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, User, Building, Box, Pencil, Trash2,
  DollarSign, TrendingUp, TrendingDown, Users, AlertTriangle,
  Info, Layers, Link2, Search, Copy,
} from 'lucide-react';
import { SubprojectCostCards } from '@/components/contracts/SubprojectCostCards';
import { useData } from '@/contexts/DataContext';
import { useHR } from '@/contexts/HRContext';
import { useOverheadPool } from '@/hooks/useOverheadPool';
import { useSubprojects } from '@/contexts/SubprojectContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ResourceForm } from '@/components/forms/ResourceForm';
import { Input } from '@/components/ui/input';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { PageHeader } from '@/components/layout/PageHeader';
import { toast } from 'sonner';

import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  formatCurrency, formatPercentage, formatDate,
  calculateResourceCost, calculateContractHealth,
  getContractRevenue,
} from '@/lib/calculations';
import { cn } from '@/lib/utils';
import { Resource, HealthStatus, OverheadItem } from '@/types';
import { buildLookups, resolveResource, resolveResourceForCalc } from '@/lib/resourceResolver';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CopyResourcesDialog } from '@/components/contracts/CopyResourcesDialog';

const healthLabels: Record<HealthStatus, string> = {
  saudavel: 'Saudável', atencao: 'Atenção', critico: 'Crítico',
};

const typeIcons = { clt: User, pj: Building, outro: Box };
const typeLabels = { clt: 'CLT', pj: 'PJ', outro: 'Outros' };

const categoriaLabels: Record<string, string> = {
  cloud: 'Cloud', licenca: 'Licença', equipamento: 'Equipamento',
  terceiros: 'Terceiros', consultoria: 'Consultoria', outros: 'Outros',
};

const senioridadeLabels: Record<string, string> = {
  junior: 'Júnior', pleno: 'Pleno', senior: 'Sênior', especialista: 'Especialista',
};

export default function ContractResourcesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { 
    getContract, getClient, getResourcesByContract, 
    addResource, updateResource, deleteResource,
    settings,
    jobTitles, teams,
  } = useData();
  const { hrPeople } = useHR();
  const { hasSubprojects: hasSubprojectsFn, getAllocationsByContract } = useSubprojects();
  const { canEdit, canViewValues, canViewHRCosts } = useAuth();
  const { getAllocation: getOverheadAllocation } = useOverheadPool();

  const [formOpen, setFormOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  // Link legacy dialog
  const [linkResourceId, setLinkResourceId] = useState<string | null>(null);
  const [linkHrPersonId, setLinkHrPersonId] = useState<string>('');
  const [searchName, setSearchName] = useState('');
  const [sortBy, setSortBy] = useState<'custo' | 'cargo' | 'nome' | 'tipo'>('custo');
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  const contract = id ? getContract(id) : undefined;
  const client = contract ? getClient(contract.clientId) : undefined;
  const rawResources = id ? getResourcesByContract(id) : [];

  // Build lookups for resolver
  const { peopleMap, jobMap, teamMap } = useMemo(
    () => buildLookups(hrPeople, jobTitles, teams),
    [hrPeople, jobTitles, teams]
  );

  // Resolve resources for calculations (use HR Master cost when linked)
  const resources = useMemo(
    () => rawResources.map(r => resolveResourceForCalc(r, peopleMap)),
    [rawResources, peopleMap]
  );

  // Collect existing HR person IDs for duplicate prevention
  const existingHrPersonIds = useMemo(() =>
    rawResources.filter(r => r.hrPersonId).map(r => r.hrPersonId!),
    [rawResources]
  );

  const contractHasSubprojects = id ? hasSubprojectsFn(id) : false;
  const subprojectAllocations = id ? getAllocationsByContract(id) : [];

  // When subprojects exist, compute "Outros" cost from subproject allocations
  const subprojectOutrosCostMap = useMemo(() => {
    if (!contractHasSubprojects) return null;
    const resourceAllocs = subprojectAllocations.filter(a => a.resourceId);
    const map = new Map<string, { totalCost: number; totalDedication: number; allocCount: number }>();
    for (const alloc of resourceAllocs) {
      const res = resources.find(r => r.id === alloc.resourceId);
      if (!res || res.tipo !== 'outro') continue;
      const existing = map.get(alloc.resourceId!) || { totalCost: 0, totalDedication: 0, allocCount: 0 };
      const cost = (alloc.costValue ?? res.custoBase) * (alloc.dedicationPercent / 100);
      existing.totalCost += cost;
      existing.totalDedication += alloc.dedicationPercent;
      existing.allocCount += 1;
      map.set(alloc.resourceId!, existing);
    }
    return map;
  }, [contractHasSubprojects, subprojectAllocations, resources]);

  if (!contract) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Users className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Contrato não encontrado</h2>
        <p className="text-muted-foreground mb-4">O contrato solicitado não existe ou foi removido.</p>
        <Button onClick={() => navigate(location.state?.from || '/contratos')}>Voltar para Contratos</Button>
      </div>
    );
  }

  const totalSubprojectFTE = subprojectAllocations.reduce((s, a) => s + a.dedicationPercent / 100, 0);

  const custosPorTipo = {
    clt: (resourcesByType.clt || []).reduce((sum, r) => sum + calculateResourceCost(r, settings), 0),
    pj: (resourcesByType.pj || []).reduce((sum, r) => sum + calculateResourceCost(r, settings), 0),
    outro: (() => {
      const outroResources = resourcesByType.outro || [];
      if (subprojectOutrosCostMap && subprojectOutrosCostMap.size > 0) {
        return outroResources.reduce((sum, r) => {
          const allocData = subprojectOutrosCostMap.get(r.id);
          return sum + (allocData ? allocData.totalCost : calculateResourceCost(r, settings));
        }, 0);
      }
      return outroResources.reduce((sum, r) => sum + calculateResourceCost(r, settings), 0);
    })(),
  };

  const handleAddResource = (data: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (data.hrPersonId && existingHrPersonIds.includes(data.hrPersonId)) {
      toast.error('Este profissional já está alocado neste contrato');
      return;
    }
    addResource(data);
    setFormOpen(false);
    toast.success('Recurso adicionado ao contrato');
  };

  const handleEditResource = (data: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingResource) {
      updateResource(editingResource.id, data);
      setEditingResource(null);
      toast.success('Alterações salvas');
    }
  };

  const handleDeleteResource = () => {
    if (deleteId) {
      deleteResource(deleteId);
      setDeleteId(null);
      toast.success('Recurso removido do contrato');
    }
  };

  const handleLinkResource = async () => {
    if (linkResourceId && linkHrPersonId) {
      const person = hrPeople.find(p => p.id === linkHrPersonId);
      if (person) {
        await updateResource(linkResourceId, {
          hrPersonId: linkHrPersonId,
          nome: person.nome,
          tipo: person.tipoVinculo === 'clt' ? 'clt' : 'pj',
        });
        toast.success('Recurso vinculado ao RH Mestre');
      }
      setLinkResourceId(null);
      setLinkHrPersonId('');
    }
  };


  const activeHrPeople = hrPeople.filter(p => p.situacao === 'ativo').sort((a, b) => a.nome.localeCompare(b.nome));

  const handleImportResources = async (sourceContractId: string) => {
    if (!id) return;
    setImporting(true);
    try {
      const sourceResources = getResourcesByContract(sourceContractId);
      const hadExistingResources = rawResources.length > 0;
      let imported = 0;
      let skipped = 0;

      for (const sr of sourceResources) {
        if (sr.hrPersonId && existingHrPersonIds.includes(sr.hrPersonId)) {
          skipped++;
          continue;
        }
        await addResource({
          contractId: id,
          nome: sr.nome,
          tipo: sr.tipo,
          cargo: sr.cargo,
          senioridade: sr.senioridade,
          custoBase: sr.custoBase,
          percentualDedicacao: sr.percentualDedicacao,
          dataInicio: sr.dataInicio,
          dataFim: sr.dataFim,
          encargosOverride: sr.encargosOverride,
          impostosOverride: sr.impostosOverride,
          observacoes: sr.observacoes,
          hrPersonId: sr.hrPersonId,
          categoria: sr.categoria,
          recorrencia: sr.recorrencia,
          tipoValor: sr.tipoValor,
          rateioMeses: sr.rateioMeses,
          duracaoMeses: sr.duracaoMeses,
        });
        imported++;
      }

      setCopyDialogOpen(false);

      if (imported === 0 && skipped > 0) {
        toast.info(`Todos os ${skipped} recursos já estavam alocados neste contrato.`);
      } else if (skipped > 0) {
        toast.warning(`${imported} recurso${imported !== 1 ? 's' : ''} importado${imported !== 1 ? 's' : ''}. ${skipped} ignorado${skipped !== 1 ? 's' : ''} (já alocado${skipped !== 1 ? 's' : ''}). Revise a alocação para evitar superfaturamento.`);
      } else if (hadExistingResources) {
        toast.warning(`${imported} recurso${imported !== 1 ? 's' : ''} importado${imported !== 1 ? 's' : ''}. Revise a alocação para evitar superfaturamento.`);
      } else {
        toast.success(`${imported} recurso${imported !== 1 ? 's' : ''} importado${imported !== 1 ? 's' : ''} com sucesso!`);
      }
    } catch (err) {
      toast.error('Erro ao importar recursos.');
      console.error(err);
    } finally {
      setImporting(false);
    }
  };

  return (
    <TooltipProvider>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader
        title="Recursos do Contrato"
        description={`${contract.nome} • ${client?.nomeFantasia || client?.razaoSocial}`}
        animated={false}
        breadcrumbs={[
          { label: location.state?.from === '/squads' ? 'Squads' : 'Contratos', href: location.state?.from || '/contratos' },
          { label: contract.codigo, href: `/contratos/${id}`, state: location.state },
          { label: 'Recursos' },
        ]}
        actions={canEdit ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCopyDialogOpen(true)} className="gap-2">
              <Copy className="w-4 h-4" />
              Importar de outro contrato
            </Button>
            <Button onClick={() => setFormOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Adicionar Recurso
            </Button>
          </div>
        ) : undefined}
      />

      {/* Subprojects Banner */}
      {contractHasSubprojects && (
        <Card className="border-l-4 border-l-primary bg-primary/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="font-medium text-sm">Este contrato usa alocação por subprojeto</p>
                <p className="text-xs text-muted-foreground">Gerencie as pessoas no módulo SQUADS. FTE total dos subprojetos: {totalSubprojectFTE.toFixed(2)}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate(`/squads?contract=${id}`)}>
              Ir para Squads
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={cn(
          'border-l-4',
          health.status === 'saudavel' && 'border-l-health-healthy',
          health.status === 'atencao' && 'border-l-health-attention',
          health.status === 'critico' && 'border-l-health-critical',
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Saúde</span>
              <Badge className={cn(
                health.status === 'saudavel' && 'health-badge-healthy',
                health.status === 'atencao' && 'health-badge-attention',
                health.status === 'critico' && 'health-badge-critical',
              )}>{healthLabels[health.status]}</Badge>
            </div>
            {canViewValues && (
              <>
                <p className={cn(
                  'text-2xl font-bold',
                  health.margemPercentual >= 15 && 'text-health-healthy',
                  health.margemPercentual >= 0 && health.margemPercentual < 15 && 'text-health-attention',
                  health.margemPercentual < 0 && 'text-health-critical',
                )}>{formatPercentage(health.margemPercentual)}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">Resultado</span>
                  <span className={cn(
                    'text-sm font-semibold',
                    health.margemMensal >= 0 ? 'text-health-healthy' : 'text-health-critical',
                  )}>{formatCurrency(health.margemMensal)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-health-healthy" />
              <span className="text-sm text-muted-foreground">Receita Mensal</span>
            </div>
            {canViewValues ? (
              <p className="text-2xl font-bold">{formatCurrency(receitaMensal)}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Valor restrito</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-health-critical" />
              <span className="text-sm text-muted-foreground">Custo Mensal Total</span>
            </div>
            {canViewValues ? (
              <p className="text-2xl font-bold">{formatCurrency(health.custoMensal)}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Valor restrito</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Total de Recursos</span>
            </div>
            <p className="text-2xl font-bold">{resources.length}</p>
            <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
              <span>{resourcesByType.clt?.length || 0} CLT</span>
              <span>•</span>
              <span>{resourcesByType.pj?.length || 0} PJ</span>
              <span>•</span>
              <span>{resourcesByType.outro?.length || 0} Outros</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown by Type */}
      {canViewValues && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(['clt', 'pj', 'outro'] as const).map((tipo) => {
            const Icon = typeIcons[tipo];
            const count = resourcesByType[tipo]?.length || 0;
            const custo = custosPorTipo[tipo];
            const percentual = health.custoMensal > 0 ? (custo / health.custoMensal) * 100 : 0;
            const isHR = tipo === 'clt' || tipo === 'pj';
            const canShowCost = !isHR || canViewHRCosts;

            return (
              <Card key={tipo}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      tipo === 'clt' && 'bg-primary/10 text-primary',
                      tipo === 'pj' && 'bg-chart-4/10 text-chart-4',
                      tipo === 'outro' && 'bg-muted text-muted-foreground',
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{typeLabels[tipo]}</p>
                      <p className="text-xs text-muted-foreground">{count} recurso{count !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  {canShowCost ? (
                    <>
                      <p className="text-xl font-bold">{formatCurrency(custo)}</p>
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
                </CardContent>
              </Card>
            );
          })}

          {/* Overhead Alocado Card */}
          <Card className={overheadAlloc.isPending ? 'border-health-attention' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-accent text-accent-foreground">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold">Overhead</p>
                  <p className="text-xs text-muted-foreground">Rateio central</p>
                </div>
              </div>
              {overheadAlloc.isPending ? (
                <div>
                  <p className="text-sm font-medium text-health-attention">Indisponível</p>
                  <p className="text-xs text-muted-foreground mt-1">{overheadAlloc.pendingReason}</p>
                </div>
              ) : (
                <>
                  <p className="text-xl font-bold">{formatCurrency(overheadAlloc.value)}</p>
                  <p className="text-xs text-muted-foreground">{overheadAlloc.percent.toFixed(2)}% do pool</p>
                </>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1"
                    onClick={() => navigate('/configuracoes', { state: { tab: 'overhead' } })}
                  >
                    Ver rateio <Info className="w-3 h-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Calculado automaticamente com base no pool de overhead e no valor mensal do contrato.
                </TooltipContent>
              </Tooltip>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Subproject Cost Breakdown */}
      {contractHasSubprojects && canViewValues && id && (
        <SubprojectCostCards
          contractId={id}
          settings={settings}
          custoMensalTotal={health.custoMensal}
          canViewHRCosts={canViewHRCosts}
          peopleMap={peopleMap}
          resourcesMap={new Map(resources.filter(r => r.contractId === id).map(r => [r.id, r]))}
          receitaMensal={health.receitaMensal}
          overheadAllocated={getOverheadAllocation(id).value}
        />
      )}

      {/* Resources List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-lg font-semibold">Recursos Alocados</h2>
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custo">Custo mensal</SelectItem>
                <SelectItem value="cargo">Função/Cargo</SelectItem>
                <SelectItem value="nome">Nome</SelectItem>
                <SelectItem value="tipo">Tipo (CLT/PJ)</SelectItem>
              </SelectContent>
            </Select>
            {resources.length > 5 && (
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome..."
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            )}
          </div>
        </div>
        
        {resources.length > 0 ? (
          <div className="space-y-3">
            {/* HR Summary row when contract has subprojects */}
            {contractHasSubprojects && (resourcesByType.clt?.length || resourcesByType.pj?.length) ? (
              <Card className="border-l-4 border-l-primary">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-primary/10 text-primary shrink-0">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Recursos Humanos (via Subprojetos)</h3>
                      <p className="text-sm text-muted-foreground">
                        {resourcesByType.clt?.length || 0} CLT • {resourcesByType.pj?.length || 0} PJ
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {canViewHRCosts && canViewValues ? (
                      <p className="text-xl font-bold">{formatCurrency(custosPorTipo.clt + custosPorTipo.pj)}</p>
                    ) : (
                      <p className="text-xl font-bold text-muted-foreground">---</p>
                    )}
                    <Button variant="outline" size="sm" onClick={() => navigate(`/squads?contract=${id}`)}>
                      Ver nos Squads
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <AnimatePresence>
              {resources
                .filter(r => {
                  // Hide individual HR resources when subprojects exist
                  if (contractHasSubprojects && (r.tipo === 'clt' || r.tipo === 'pj')) return false;
                  if (!searchName.trim()) return true;
                  const resolved = resolveResource(r, peopleMap, jobMap, teamMap);
                  return resolved.nome.toLowerCase().includes(searchName.toLowerCase());
                })
                .sort((a, b) => {
                  const ra = resolveResource(a, peopleMap, jobMap, teamMap);
                  const rb = resolveResource(b, peopleMap, jobMap, teamMap);
                  switch (sortBy) {
                    case 'cargo':
                      return (ra.cargo || 'zzz').localeCompare(rb.cargo || 'zzz');
                    case 'nome':
                      return ra.nome.localeCompare(rb.nome);
                    case 'tipo': {
                      const order = { clt: 0, pj: 1, outro: 2 };
                      return (order[a.tipo] ?? 3) - (order[b.tipo] ?? 3);
                    }
                    default:
                      return calculateResourceCost(b, settings) - calculateResourceCost(a, settings);
                  }
                })
                .map((resource) => {
                const Icon = typeIcons[resource.tipo];
                const custo = calculateResourceCost(resource, settings);
                const resolved = resolveResource(resource, peopleMap, jobMap, teamMap);

                return (
                  <motion.div
                    key={resource.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <Card className={cn("card-elevated", resolved.isVacant && "border-destructive/50 bg-destructive/5")}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            'w-12 h-12 rounded-lg flex items-center justify-center shrink-0',
                            resource.tipo === 'clt' && 'bg-primary/10 text-primary',
                            resource.tipo === 'pj' && 'bg-chart-4/10 text-chart-4',
                            resource.tipo === 'outro' && 'bg-muted text-muted-foreground',
                          )}>
                            <Icon className="w-6 h-6" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold truncate">{resolved.nome}</h3>
                              <Badge variant="secondary" className={cn(
                                'text-xs',
                                resource.tipo === 'clt' && 'bg-primary/10 text-primary',
                                resource.tipo === 'pj' && 'bg-chart-4/10 text-chart-4',
                                resource.tipo === 'outro' && 'bg-muted text-muted-foreground',
                              )}>
                                {typeLabels[resource.tipo]}
                              </Badge>
                              {resolved.isVacant ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="destructive" className="text-[10px] gap-1">
                                      <AlertTriangle className="w-3 h-3" /> Vago
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>Profissional desligado — designar substituto</TooltipContent>
                                </Tooltip>
                              ) : resolved.isBrokenLink ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="outline" className="text-[10px] gap-1 bg-destructive/10 text-destructive border-destructive/30">
                                      <AlertTriangle className="w-3 h-3" /> Link quebrado
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>Pessoa não encontrada no RH Mestre — dados podem estar desatualizados</TooltipContent>
                                </Tooltip>
                              ) : resolved.isLinked ? (
                                <Badge variant="outline" className="text-[10px] gap-1 bg-primary/5 text-primary border-primary/20">
                                  <Link2 className="w-3 h-3" /> RH
                                </Badge>
                              ) : (resource.tipo === 'clt' || resource.tipo === 'pj') ? (
                                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-300">
                                  Legado
                                </Badge>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                              {resolved.cargo && <span>{resolved.cargo}</span>}
                              {resolved.teamName && (
                                <Badge variant="outline" className="text-xs">
                                  {resolved.teamName}
                                </Badge>
                              )}
                              {resource.senioridade && (
                                <Badge variant="outline" className="text-xs">
                                  {senioridadeLabels[resource.senioridade]}
                                </Badge>
                              )}
                              {resource.categoria && (
                                <Badge variant="outline" className="text-xs">
                                  {categoriaLabels[resource.categoria]}
                                </Badge>
                              )}
                              <span className="text-primary font-medium">
                                {resource.percentualDedicacao}% dedicação
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            {(() => {
                              const isHR = resource.tipo === 'clt' || resource.tipo === 'pj';
                              if (!canViewValues) {
                                return <Badge variant="secondary">{resource.percentualDedicacao}%</Badge>;
                              }
                              if (isHR && !canViewHRCosts) {
                                return (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <p className="text-lg font-bold text-muted-foreground text-right">---</p>
                                    </TooltipTrigger>
                                    <TooltipContent>Valores de RH restritos ao perfil C-Level</TooltipContent>
                                  </Tooltip>
                                );
                              }
                              return (
                                <>
                                  <p className="text-lg font-bold">{formatCurrency(custo)}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Base: {formatCurrency(resource.custoBase)}
                                  </p>
                                </>
                              );
                            })()}
                          </div>

                          {(() => {
                            const isHR = resource.tipo === 'clt' || resource.tipo === 'pj';
                            const canEditThis = canEdit && (!isHR || canViewHRCosts);
                            return (
                              <div className="flex gap-1 shrink-0">
                                {/* Link button for legacy resources */}
                                {!resolved.isLinked && isHR && canEdit && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => { setLinkResourceId(resource.id); setLinkHrPersonId(''); }}
                                      >
                                        <Link2 className="w-4 h-4 text-amber-600" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Vincular ao RH Mestre</TooltipContent>
                                  </Tooltip>
                                )}
                                {canEditThis && (
                                  <>
                                    <Button variant="ghost" size="icon" onClick={() => setEditingResource(resource)}>
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(resource.id)} className="text-destructive hover:text-destructive">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <Card className="card-elevated">
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum recurso alocado</h3>
              <p className="text-muted-foreground mb-4">
                Adicione recursos para calcular a saúde financeira do contrato.
              </p>
              {canEdit && (
                <Button onClick={() => setFormOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Adicionar Recurso
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Overhead Alocado Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Layers className="w-5 h-5 text-muted-foreground" />
          Overhead Alocado
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-4 h-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              Calculado automaticamente com base no pool de overhead central e no valor mensal do contrato.
            </TooltipContent>
          </Tooltip>
        </h2>

        <Card className={cn("card-elevated", overheadAlloc.isPending && "border-health-attention/50")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                {overheadAlloc.isPending ? (
                  <>
                    <p className="font-medium text-health-attention flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" /> Indisponível
                    </p>
                    <p className="text-xs text-muted-foreground">{overheadAlloc.pendingReason}</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-sm">Percentual do rateio: {overheadAlloc.percent.toFixed(2)}%</p>
                    {canViewValues && (
                      <p className="text-xs text-muted-foreground">Valor mensal alocado: {formatCurrency(overheadAlloc.value)}</p>
                    )}
                  </>
                )}
              </div>
              {!overheadAlloc.isPending && canViewValues && (
                <div className="text-right shrink-0">
                  <p className="text-xl font-bold text-primary">{formatCurrency(overheadAlloc.value)}</p>
                  <p className="text-xs text-muted-foreground">/mês</p>
                </div>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-border">
              {overheadAlloc.isPending ? (
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => navigate(`/contratos/${id}/editar`)}>
                  Corrigir valor mensal
                </Button>
              ) : (
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground" onClick={() => navigate('/configuracoes/overhead-rateio')}>
                  Ver rateio →
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Add/Edit Resource Dialog */}
      <Dialog open={formOpen || !!editingResource} onOpenChange={(open) => {
        if (!open) { setFormOpen(false); setEditingResource(null); }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingResource ? 'Editar Recurso' : 'Adicionar Recurso'}</DialogTitle>
          </DialogHeader>
          <ResourceForm
            resource={editingResource || undefined}
            contractId={contract.id}
            settings={settings}
            existingHrPersonIds={existingHrPersonIds}
            onSubmit={editingResource ? handleEditResource : handleAddResource}
            onCancel={() => { setFormOpen(false); setEditingResource(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Link Legacy Resource Dialog */}
      <Dialog open={!!linkResourceId} onOpenChange={(open) => { if (!open) setLinkResourceId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular ao RH Mestre</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione a pessoa do cadastro mestre de RH para vincular a este recurso.
            </p>
            <Select onValueChange={setLinkHrPersonId} value={linkHrPersonId}>
              <SelectTrigger><SelectValue placeholder="Selecione a pessoa" /></SelectTrigger>
              <SelectContent>
                {activeHrPeople.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setLinkResourceId(null)}>Cancelar</Button>
              <Button onClick={handleLinkResource} disabled={!linkHrPersonId}>Vincular</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={handleDeleteResource}
        title="Remover recurso?"
        description="Esta ação não pode ser desfeita. O recurso será removido do contrato."
        confirmLabel="Remover"
      />


      <CopyResourcesDialog
        open={copyDialogOpen}
        onOpenChange={setCopyDialogOpen}
        currentContractId={id!}
        onImport={handleImportResources}
        importing={importing}
      />
    </motion.div>
    </TooltipProvider>
  );
}
