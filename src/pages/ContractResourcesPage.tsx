import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, User, Building, Box, Pencil, Trash2,
  DollarSign, TrendingUp, TrendingDown, Users, AlertTriangle,
  Info, Layers, Link2,
} from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useHR } from '@/contexts/HRContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ResourceForm } from '@/components/forms/ResourceForm';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { PageHeader } from '@/components/layout/PageHeader';
import { toast } from 'sonner';
import { OverheadForm } from '@/components/forms/OverheadForm';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  formatCurrency, formatPercentage, formatDate,
  calculateResourceCost, calculateContractHealth,
  calculateOverheadCost, getContractRevenue,
} from '@/lib/calculations';
import { cn } from '@/lib/utils';
import { Resource, HealthStatus, OverheadItem } from '@/types';
import { buildLookups, resolveResource, resolveResourceForCalc } from '@/lib/resourceResolver';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

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
  
  const { 
    getContract, getClient, getResourcesByContract, 
    addResource, updateResource, deleteResource,
    settings, overheadItems,
    getOverheadByContract, addOverheadItem, updateOverheadItem, deleteOverheadItem,
    jobTitles, teams,
  } = useData();
  const { hrPeople } = useHR();
  const { canEdit, canViewValues, canViewHRCosts } = useAuth();

  const [formOpen, setFormOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [overheadFormOpen, setOverheadFormOpen] = useState(false);
  const [editingOverhead, setEditingOverhead] = useState<OverheadItem | null>(null);
  const [deleteOverheadId, setDeleteOverheadId] = useState<string | null>(null);
  // Link legacy dialog
  const [linkResourceId, setLinkResourceId] = useState<string | null>(null);
  const [linkHrPersonId, setLinkHrPersonId] = useState<string>('');

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

  if (!contract) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Users className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Contrato não encontrado</h2>
        <p className="text-muted-foreground mb-4">O contrato solicitado não existe ou foi removido.</p>
        <Button onClick={() => navigate('/contratos')}>Voltar para Contratos</Button>
      </div>
    );
  }

  const health = calculateContractHealth(contract, resources, settings, overheadItems);
  const receitaMensal = getContractRevenue(contract);
  const contractOverhead = id ? getOverheadByContract(id) : [];
  const overheadCost = calculateOverheadCost(contract.id, resources, contractOverhead, settings);

  const resourcesByType = resources.reduce((acc, resource) => {
    const type = resource.tipo;
    if (!acc[type]) acc[type] = [];
    acc[type].push(resource);
    return acc;
  }, {} as Record<string, Resource[]>);

  const custosPorTipo = {
    clt: (resourcesByType.clt || []).reduce((sum, r) => sum + calculateResourceCost(r, settings), 0),
    pj: (resourcesByType.pj || []).reduce((sum, r) => sum + calculateResourceCost(r, settings), 0),
    outro: (resourcesByType.outro || []).reduce((sum, r) => sum + calculateResourceCost(r, settings), 0),
  };

  const handleAddResource = (data: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>) => {
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

  const handleAddOverhead = (data: Omit<OverheadItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    addOverheadItem(data);
    setOverheadFormOpen(false);
    toast.success('Overhead adicionado ao contrato');
  };

  const handleEditOverhead = (data: Omit<OverheadItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingOverhead) {
      updateOverheadItem(editingOverhead.id, data);
      setEditingOverhead(null);
      toast.success('Alterações salvas');
    }
  };

  const handleDeleteOverhead = () => {
    if (deleteOverheadId) {
      deleteOverheadItem(deleteOverheadId);
      setDeleteOverheadId(null);
      toast.success('Overhead removido do contrato');
    }
  };

  const activeHrPeople = hrPeople.filter(p => p.situacao === 'ativo').sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <TooltipProvider>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader
        title="Recursos do Contrato"
        description={`${contract.nome} • ${client?.nomeFantasia || client?.razaoSocial}`}
        animated={false}
        breadcrumbs={[
          { label: 'Contratos', href: '/contratos' },
          { label: contract.codigo, href: `/contratos/${id}` },
          { label: 'Recursos' },
        ]}
        actions={canEdit ? (
          <Button onClick={() => setFormOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Adicionar Recurso
          </Button>
        ) : undefined}
      />

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        </div>
      )}

      {/* Resources List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Recursos Alocados</h2>
        
        {resources.length > 0 ? (
          <div className="space-y-3">
            <AnimatePresence>
              {resources.map((resource) => {
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
                    <Card className="card-elevated">
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
                              {resolved.isLinked ? (
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

      {/* Overhead Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5 text-muted-foreground" />
            Custos Indiretos (Overhead)
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Custos indiretos como infraestrutura do escritório, despesas administrativas e governança.
              </TooltipContent>
            </Tooltip>
          </h2>
          {canEdit && (
            <Button variant="outline" onClick={() => setOverheadFormOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Adicionar Overhead
            </Button>
          )}
        </div>

        {canViewValues && contractOverhead.length > 0 && (
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  Overhead Mensal Total
                  <Tooltip>
                    <TooltipTrigger asChild><Info className="w-3.5 h-3.5 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent className="max-w-xs">Base de cálculo: {formatCurrency(health.custoMensal - overheadCost.total)}</TooltipContent>
                  </Tooltip>
                </span>
                <span className="text-xl font-bold text-primary">{formatCurrency(overheadCost.total)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {contractOverhead.length > 0 ? (
          <div className="space-y-3">
            {overheadCost.breakdown.map(({ item, cost }) => (
              <Card key={item.id} className="card-elevated">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Layers className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{item.nome}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {item.categoria === 'infraestrutura' ? 'Infraestrutura' : item.categoria === 'administrativo' ? 'Administrativo' : 'Governança'}
                        </Badge>
                        <span>{item.modo === 'percentual' ? `${item.percentual}% da base` : 'Valor fixo'}</span>
                      </div>
                    </div>
                    {canViewValues && (
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold">{formatCurrency(cost)}</p>
                        <p className="text-xs text-muted-foreground">{item.modo === 'percentual' ? `${item.percentual}%` : 'fixo/mês'}</p>
                      </div>
                    )}
                    {canEdit && (
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => setEditingOverhead(item)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteOverheadId(item.id)} className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="card-elevated">
            <CardContent className="py-8 text-center">
              <Layers className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum custo indireto cadastrado para este contrato.</p>
            </CardContent>
          </Card>
        )}
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

      {/* Add/Edit Overhead Dialog */}
      <Dialog open={overheadFormOpen || !!editingOverhead} onOpenChange={(open) => {
        if (!open) { setOverheadFormOpen(false); setEditingOverhead(null); }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingOverhead ? 'Editar Overhead' : 'Adicionar Overhead'}</DialogTitle>
          </DialogHeader>
          <OverheadForm
            item={editingOverhead || undefined}
            contractId={contract.id}
            baseCalculo={health.custoMensal - overheadCost.total}
            onSubmit={editingOverhead ? handleEditOverhead : handleAddOverhead}
            onCancel={() => { setOverheadFormOpen(false); setEditingOverhead(null); }}
          />
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

      <ConfirmDeleteDialog
        open={!!deleteOverheadId}
        onOpenChange={() => setDeleteOverheadId(null)}
        onConfirm={handleDeleteOverhead}
        title="Remover overhead?"
        description="Esta ação não pode ser desfeita. O custo indireto será removido do contrato."
        confirmLabel="Remover"
      />
    </motion.div>
    </TooltipProvider>
  );
}
