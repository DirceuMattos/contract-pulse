import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  User,
  Building,
  Box,
  Pencil,
  Trash2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { ResourceForm } from '@/components/forms/ResourceForm';
import {
  formatCurrency,
  formatPercentage,
  formatDate,
  calculateResourceCost,
  calculateContractHealth,
  getContractRevenue,
} from '@/lib/calculations';
import { cn } from '@/lib/utils';
import { Resource, HealthStatus } from '@/types';

const healthLabels: Record<HealthStatus, string> = {
  saudavel: 'Saudável',
  atencao: 'Atenção',
  critico: 'Crítico',
};

const typeIcons = {
  clt: User,
  pj: Building,
  outro: Box,
};

const typeLabels = {
  clt: 'CLT',
  pj: 'PJ',
  outro: 'Outros',
};

const categoriaLabels: Record<string, string> = {
  cloud: 'Cloud',
  licenca: 'Licença',
  equipamento: 'Equipamento',
  terceiros: 'Terceiros',
  outros: 'Outros',
};

const senioridadeLabels: Record<string, string> = {
  junior: 'Júnior',
  pleno: 'Pleno',
  senior: 'Sênior',
  especialista: 'Especialista',
};

export default function ContractResourcesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    getContract, 
    getClient, 
    getResourcesByContract, 
    addResource, 
    updateResource, 
    deleteResource,
    settings 
  } = useData();
  const { canEdit, canViewValues } = useAuth();

  const [formOpen, setFormOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const contract = id ? getContract(id) : undefined;
  const client = contract ? getClient(contract.clientId) : undefined;
  const resources = id ? getResourcesByContract(id) : [];

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

  const health = calculateContractHealth(contract, resources, settings);
  const receitaMensal = getContractRevenue(contract);

  // Group resources by type
  const resourcesByType = resources.reduce((acc, resource) => {
    const type = resource.tipo;
    if (!acc[type]) acc[type] = [];
    acc[type].push(resource);
    return acc;
  }, {} as Record<string, Resource[]>);

  // Calculate totals
  const custosPorTipo = {
    clt: (resourcesByType.clt || []).reduce((sum, r) => sum + calculateResourceCost(r, settings), 0),
    pj: (resourcesByType.pj || []).reduce((sum, r) => sum + calculateResourceCost(r, settings), 0),
    outro: (resourcesByType.outro || []).reduce((sum, r) => sum + calculateResourceCost(r, settings), 0),
  };

  const handleAddResource = (data: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>) => {
    addResource(data);
    setFormOpen(false);
    toast({
      title: 'Recurso adicionado',
      description: 'O recurso foi adicionado ao contrato.',
    });
  };

  const handleEditResource = (data: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingResource) {
      updateResource(editingResource.id, data);
      setEditingResource(null);
      toast({
        title: 'Recurso atualizado',
        description: 'As alterações foram salvas.',
      });
    }
  };

  const handleDeleteResource = () => {
    if (deleteId) {
      deleteResource(deleteId);
      setDeleteId(null);
      toast({
        title: 'Recurso removido',
        description: 'O recurso foi removido do contrato.',
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/contratos/${id}`)} className="mt-1">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Recursos do Contrato</h1>
            <p className="text-muted-foreground">
              {contract.nome} • {client?.nomeFantasia || client?.razaoSocial}
            </p>
          </div>
        </div>
        {canEdit && (
          <Button onClick={() => setFormOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Adicionar Recurso
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Health Status */}
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
              )}>
                {healthLabels[health.status]}
              </Badge>
            </div>
            {canViewValues && (
              <p className={cn(
                'text-2xl font-bold',
                health.margemPercentual >= 15 && 'text-health-healthy',
                health.margemPercentual >= 0 && health.margemPercentual < 15 && 'text-health-attention',
                health.margemPercentual < 0 && 'text-health-critical',
              )}>
                {formatPercentage(health.margemPercentual)}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Revenue */}
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

        {/* Total Cost */}
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

        {/* Resources Count */}
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
                  <p className="text-xl font-bold">{formatCurrency(custo)}</p>
                  <p className="text-xs text-muted-foreground">{percentual.toFixed(1)}% do custo total</p>
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
                          {/* Icon */}
                          <div className={cn(
                            'w-12 h-12 rounded-lg flex items-center justify-center shrink-0',
                            resource.tipo === 'clt' && 'bg-primary/10 text-primary',
                            resource.tipo === 'pj' && 'bg-chart-4/10 text-chart-4',
                            resource.tipo === 'outro' && 'bg-muted text-muted-foreground',
                          )}>
                            <Icon className="w-6 h-6" />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold truncate">{resource.nome}</h3>
                              <Badge variant="secondary" className={cn(
                                'text-xs',
                                resource.tipo === 'clt' && 'bg-primary/10 text-primary',
                                resource.tipo === 'pj' && 'bg-chart-4/10 text-chart-4',
                                resource.tipo === 'outro' && 'bg-muted text-muted-foreground',
                              )}>
                                {typeLabels[resource.tipo]}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                              {resource.cargo && <span>{resource.cargo}</span>}
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

                          {/* Cost */}
                          <div className="text-right shrink-0">
                            {canViewValues ? (
                              <>
                                <p className="text-lg font-bold">{formatCurrency(custo)}</p>
                                <p className="text-xs text-muted-foreground">
                                  Base: {formatCurrency(resource.custoBase)}
                                </p>
                              </>
                            ) : (
                              <Badge variant="secondary">{resource.percentualDedicacao}%</Badge>
                            )}
                          </div>

                          {/* Actions */}
                          {canEdit && (
                            <div className="flex gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingResource(resource)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteId(resource.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
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

      {/* Add/Edit Resource Dialog */}
      <Dialog open={formOpen || !!editingResource} onOpenChange={(open) => {
        if (!open) {
          setFormOpen(false);
          setEditingResource(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingResource ? 'Editar Recurso' : 'Adicionar Recurso'}
            </DialogTitle>
          </DialogHeader>
          <ResourceForm
            resource={editingResource || undefined}
            contractId={contract.id}
            settings={settings}
            onSubmit={editingResource ? handleEditResource : handleAddResource}
            onCancel={() => {
              setFormOpen(false);
              setEditingResource(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover recurso?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O recurso será removido do contrato.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteResource} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
