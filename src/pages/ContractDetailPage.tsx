import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  FileText,
  Calendar,
  User,
  Building2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  Pencil,
  Tag,
  Clock,
  RefreshCw,
  Target,
  Shield,
  CheckCircle2,
  Info,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  formatDate,
  formatCurrency,
  formatPercentage,
  calculateContractHealth,
  calculateResourceCost,
  calculateOverheadCost,
  getDaysUntil,
  getDaysSince,
} from '@/lib/calculations';
import { cn } from '@/lib/utils';
import { HealthStatus, Resource } from '@/types';
import ContractHistoryTab from '@/components/contracts/ContractHistoryTab';
import ContractDocumentsTab from '@/components/contracts/ContractDocumentsTab';
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

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

const renewalLabels = {
  negociacao: 'Em Negociação',
  renovado: 'Renovado',
  'sem-tratativa': 'Sem Tratativa',
};

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getContract, getClient, getResourcesByContract, getSnapshotsByContract, settings, alerts, overheadItems, getOverheadByContract } = useData();
  const { canEdit, canViewValues } = useAuth();
  
  const contract = id ? getContract(id) : undefined;
  const client = contract ? getClient(contract.clientId) : undefined;
  const contractResources = id ? getResourcesByContract(id) : [];
  const snapshots = id ? getSnapshotsByContract(id) : [];
  const contractAlerts = alerts.filter(a => a.contractId === id);
  
  if (!contract) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <FileText className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Contrato não encontrado</h2>
        <p className="text-muted-foreground mb-4">O contrato solicitado não existe ou foi removido.</p>
        <Button onClick={() => navigate('/contratos')}>Voltar para Contratos</Button>
      </div>
    );
  }
  
  const health = calculateContractHealth(contract, contractResources, settings, overheadItems);
  const contractOverheadItems = id ? getOverheadByContract(id) : [];
  const overheadCost = calculateOverheadCost(contract.id, contractResources, contractOverheadItems, settings);
  const daysUntilEnd = getDaysUntil(contract.dataFim);
  const daysUntilAdjustment = getDaysUntil(contract.dataBaseReajuste);
  const daysSinceUpdate = contract.ultimaAtualizacaoRecursos 
    ? getDaysSince(contract.ultimaAtualizacaoRecursos)
    : 999;
  
  // Group resources by type
  const resourcesByType = contractResources.reduce((acc, resource) => {
    const type = resource.tipo;
    if (!acc[type]) acc[type] = [];
    acc[type].push(resource);
    return acc;
  }, {} as Record<string, Resource[]>);
  
  // Calculate costs by type
  const costsByType = Object.entries(resourcesByType).map(([type, resources]) => ({
    type,
    label: type === 'clt' ? 'CLT' : type === 'pj' ? 'PJ' : 'Outros',
    cost: resources.reduce((sum, r) => sum + calculateResourceCost(r, settings), 0),
    count: resources.length,
  }));
  
  // Trend data from snapshots
  const trendData = snapshots.map(s => ({
    date: formatDate(s.createdAt),
    margem: s.margemPercentual,
  }));
  
  // Add current state to trend
  trendData.push({
    date: 'Atual',
    margem: health.margemPercentual,
  });
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/contratos')} className="mt-1">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-foreground">{contract.nome}</h1>
              <Badge variant="secondary">{contract.codigo}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <button 
                onClick={() => navigate(`/clientes/${client?.id}`)}
                className="flex items-center gap-1 hover:text-primary transition-colors"
              >
                <Building2 className="w-4 h-4" />
                {client?.nomeFantasia || client?.razaoSocial}
              </button>
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {contract.responsavelInterno}
              </span>
              <Badge 
                className={cn(
                  'text-xs',
                  contract.segmento === 'govtech' ? 'segment-badge-gov' : 'segment-badge-private'
                )}
              >
                {contract.segmento === 'govtech' ? 'Govtech' : 'Privado'}
              </Badge>
              <Badge 
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
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2 ml-12 lg:ml-0">
            <Button variant="outline" onClick={() => navigate(`/contratos/${id}/recursos`)} className="gap-2">
              <Users className="w-4 h-4" />
              Recursos
            </Button>
            <Button onClick={() => navigate(`/contratos/${id}/editar`)} className="gap-2">
              <Pencil className="w-4 h-4" />
              Editar
            </Button>
          </div>
        )}
      </div>
      
      {/* Health Status Card */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className={cn(
          'lg:col-span-1 border-l-4',
          health.status === 'saudavel' && 'border-l-health-healthy',
          health.status === 'atencao' && 'border-l-health-attention',
          health.status === 'critico' && 'border-l-health-critical',
        )}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">Status de Saúde</span>
              <Badge className={cn(
                health.status === 'saudavel' && 'health-badge-healthy',
                health.status === 'atencao' && 'health-badge-attention',
                health.status === 'critico' && 'health-badge-critical',
              )}>
                {healthLabels[health.status]}
              </Badge>
            </div>
            {canViewValues ? (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Margem Mensal</p>
                  <p className={cn(
                    'text-2xl font-bold',
                    health.margemPercentual >= 15 && 'text-health-healthy',
                    health.margemPercentual >= 0 && health.margemPercentual < 15 && 'text-health-attention',
                    health.margemPercentual < 0 && 'text-health-critical',
                  )}>
                    {formatPercentage(health.margemPercentual)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Receita</p>
                    <p className="font-medium">{formatCurrency(health.receitaMensal)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Custo</p>
                    <p className="font-medium">{formatCurrency(health.custoMensal)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {health.status === 'saudavel' && <CheckCircle2 className="w-5 h-5 text-health-healthy" />}
                {health.status === 'atencao' && <AlertTriangle className="w-5 h-5 text-health-attention" />}
                {health.status === 'critico' && <AlertTriangle className="w-5 h-5 text-health-critical" />}
                <span className="text-sm">
                  {health.status === 'saudavel' && 'Contrato saudável'}
                  {health.status === 'atencao' && 'Requer atenção'}
                  {health.status === 'critico' && 'Situação crítica'}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Quick Info Cards */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Vigência</p>
                <p className="font-medium">
                  {daysUntilEnd > 0 ? `${daysUntilEnd} dias restantes` : 'Encerrado'}
                </p>
              </div>
            </div>
            <Progress 
              value={Math.max(0, Math.min(100, 100 - (daysUntilEnd / 365) * 100))} 
              className="h-1.5"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {formatDate(contract.dataInicio)} a {formatDate(contract.dataFim)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center',
                daysUntilAdjustment <= 60 ? 'bg-health-attention/10' : 'bg-muted'
              )}>
                <RefreshCw className={cn(
                  'w-5 h-5',
                  daysUntilAdjustment <= 60 ? 'text-health-attention' : 'text-muted-foreground'
                )} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Próximo Reajuste</p>
                <p className="font-medium">
                  {daysUntilAdjustment > 0 ? `${daysUntilAdjustment} dias` : 'Pendente'}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Índice: {contract.indiceReajuste} | Base: {formatDate(contract.dataBaseReajuste)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center',
                daysSinceUpdate > 30 ? 'bg-health-attention/10' : 'bg-health-healthy/10'
              )}>
                <Clock className={cn(
                  'w-5 h-5',
                  daysSinceUpdate > 30 ? 'text-health-attention' : 'text-health-healthy'
                )} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Última Atualização</p>
                <p className="font-medium">
                  {daysSinceUpdate < 999 ? `${daysSinceUpdate} dias atrás` : 'Nunca'}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {contractResources.length} recursos alocados
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Alerts */}
      {contractAlerts.length > 0 && (
        <div className="space-y-2">
          {contractAlerts.map(alert => (
            <Card 
              key={alert.id}
              className={cn(
                'border-l-4',
                alert.severity === 'critico' ? 'border-l-health-critical bg-health-critical-bg/30' : 'border-l-health-attention bg-health-attention-bg/30'
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className={cn(
                    'w-5 h-5 mt-0.5',
                    alert.severity === 'critico' ? 'text-health-critical' : 'text-health-attention'
                  )} />
                  <div>
                    <p className="font-medium">{alert.title}</p>
                    <p className="text-sm text-muted-foreground">{alert.description}</p>
                    <p className="text-sm text-primary mt-1">{alert.recommendation}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Tabs */}
      <Tabs defaultValue="resumo" className="space-y-6">
        <TabsList>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="recursos">Recursos ({contractResources.length})</TabsTrigger>
          <TabsTrigger value="escopo">Escopo</TabsTrigger>
          <TabsTrigger value="vigencia">Vigência</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="resumo" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trend Chart */}
            {canViewValues && trendData.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tendência de Margem</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData}>
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                        <RechartsTooltip 
                          formatter={(value: number) => [`${value.toFixed(1)}%`, 'Margem']}
                          contentStyle={{ 
                            borderRadius: '8px', 
                            border: '1px solid hsl(var(--border))',
                            backgroundColor: 'hsl(var(--popover))',
                          }}
                        />
                        <ReferenceLine y={15} stroke="hsl(var(--health-healthy))" strokeDasharray="3 3" />
                        <ReferenceLine y={0} stroke="hsl(var(--health-critical))" strokeDasharray="3 3" />
                        <Line 
                          type="monotone" 
                          dataKey="margem" 
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--primary))' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Cost Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribuição de Custos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {costsByType.map(({ type, label, cost, count }) => (
                    <div key={type}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{label}</span>
                        <span className="text-sm text-muted-foreground">{count} recurso{count !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress 
                          value={health.custoMensal > 0 ? (cost / health.custoMensal) * 100 : 0} 
                          className="flex-1 h-2"
                        />
                        {canViewValues && (
                          <span className="text-sm font-medium w-24 text-right">
                            {formatCurrency(cost)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {overheadCost.total > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium flex items-center gap-1">
                          Overhead
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-3.5 h-3.5 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                Custos indiretos calculados sobre a base de execução (RH + outros custos diretos).
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </span>
                        <span className="text-sm text-muted-foreground">{contractOverheadItems.length} item{contractOverheadItems.length !== 1 ? 'ns' : ''}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress 
                          value={health.custoMensal > 0 ? (overheadCost.total / health.custoMensal) * 100 : 0} 
                          className="flex-1 h-2"
                        />
                        {canViewValues && (
                          <span className="text-sm font-medium w-24 text-right">
                            {formatCurrency(overheadCost.total)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Tags */}
          {contract.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {contract.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  <Tag className="w-3 h-3" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="recursos" className="space-y-4">
          {contractResources.length > 0 ? (
            <div className="space-y-3">
              {contractResources.map(resource => {
                const cost = calculateResourceCost(resource, settings);
                return (
                  <Card key={resource.id} className="card-elevated">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            'w-10 h-10 rounded-lg flex items-center justify-center',
                            resource.tipo === 'clt' && 'bg-primary/10 text-primary',
                            resource.tipo === 'pj' && 'bg-chart-4/10 text-chart-4',
                            resource.tipo === 'outro' && 'bg-muted text-muted-foreground',
                          )}>
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium">{resource.nome}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {resource.cargo && <span>{resource.cargo}</span>}
                              {resource.senioridade && (
                                <Badge variant="secondary" className="text-xs capitalize">
                                  {resource.senioridade}
                                </Badge>
                              )}
                              <span>{resource.percentualDedicacao}% dedicação</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={cn(
                            'mb-1',
                            resource.tipo === 'clt' && 'bg-primary/10 text-primary',
                            resource.tipo === 'pj' && 'bg-chart-4/10 text-chart-4',
                            resource.tipo === 'outro' && 'bg-muted text-muted-foreground',
                          )}>
                            {resource.tipo.toUpperCase()}
                          </Badge>
                          {canViewValues && (
                            <p className="text-sm font-medium">{formatCurrency(cost)}/mês</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="card-elevated">
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum recurso alocado</h3>
                <p className="text-muted-foreground mb-4">Adicione recursos para calcular a saúde financeira.</p>
                {canEdit && (
                  <Button onClick={() => navigate(`/contratos/${id}/recursos`)} className="gap-2">
                    <Users className="w-4 h-4" />
                    Gerenciar Recursos
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="escopo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Objeto do Contrato</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{contract.objeto}</p>
            </CardContent>
          </Card>
          
          {contract.escopoOperacional && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Escopo Operacional</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{contract.escopoOperacional}</p>
              </CardContent>
            </Card>
          )}
          
          {contract.slas && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">SLAs / Níveis de Serviço</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{contract.slas}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="vigencia" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Vigência e Renovação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Início</p>
                    <p className="font-medium">{formatDate(contract.dataInicio)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Término</p>
                    <p className="font-medium">{formatDate(contract.dataFim)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Renovação Automática</p>
                  <p className="font-medium">{contract.renovacaoAutomatica ? 'Sim' : 'Não'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status de Renovação</p>
                  <Badge variant="secondary">{renewalLabels[contract.statusRenovacao]}</Badge>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reajuste</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">Índice</p>
                  <p className="font-medium">{contract.indiceReajuste}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Data Base</p>
                  <p className="font-medium">{formatDate(contract.dataBaseReajuste)}</p>
                </div>
                {contract.percentualFixo && (
                  <div>
                    <p className="text-xs text-muted-foreground">Percentual Fixo</p>
                    <p className="font-medium">{contract.percentualFixo}%</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="historico">
          <ContractHistoryTab contractId={contract.id} />
        </TabsContent>

        <TabsContent value="documentos">
          <ContractDocumentsTab contractId={contract.id} contractCode={contract.codigo} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
