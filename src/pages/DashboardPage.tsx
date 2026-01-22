import React from 'react';
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
  Briefcase,
  Server,
  Layers,
  Plus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  calculateDashboardKPIs,
  calculateContractHealth,
  formatCurrency,
  formatPercentage,
  formatDate,
} from '@/lib/calculations';
import { cn } from '@/lib/utils';
import { HealthStatus, Alert as AlertType } from '@/types';
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
  Legend,
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

export default function DashboardPage() {
  const navigate = useNavigate();
  const { canViewValues } = useAuth();
  const { contracts, clients, resources, settings, alerts } = useData();
  
  const kpis = calculateDashboardKPIs(contracts, resources, settings, canViewValues);
  
  // Prepare data for charts
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
  
  // Get contract health data for the list
  const contractHealthList = contracts
    .filter(c => c.status === 'operacao' || c.status === 'implantacao')
    .map(contract => {
      const health = calculateContractHealth(contract, resources, settings);
      const client = clients.find(c => c.id === contract.clientId);
      return { contract, health, client };
    })
    .sort((a, b) => a.health.margemPercentual - b.health.margemPercentual);
  
  // Critical alerts first
  const sortedAlerts = [...alerts].sort((a, b) => {
    if (a.severity === 'critico' && b.severity !== 'critico') return -1;
    if (a.severity !== 'critico' && b.severity === 'critico') return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Visão consolidada do portfólio de contratos
          </p>
        </div>
        <Button onClick={() => navigate('/contratos/novo')} className="gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Novo Contrato
        </Button>
      </motion.div>
      
      {/* KPI Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <p className="text-sm text-muted-foreground">Receita Mensal</p>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    {formatCurrency(kpis.receitaTotal || 0)}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-accent" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                <TrendingUp className="w-4 h-4 text-health-healthy" />
                <span className="text-xs text-muted-foreground">
                  Custo: {formatCurrency(kpis.custoTotal || 0)}
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
                  <p className="text-3xl font-bold text-foreground mt-1">{clients.length}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-chart-4/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-chart-4" />
                </div>
              </div>
              <div className="flex gap-3 mt-3 pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {clients.filter(c => c.segmento === 'govtech').length}
                  </span> Govtech
                </span>
                <span className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {clients.filter(c => c.segmento === 'privado').length}
                  </span> Privado
                </span>
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
                  {kpis.receitaTotal ? formatPercentage(((kpis.margemTotal || 0) / kpis.receitaTotal) * 100) : '0%'} do faturamento
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
                <div className="w-10 h-10 rounded-lg bg-type-system/10 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-type-system" />
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
            </CardContent>
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
      
      {/* Alerts and Contracts List */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Alerts Feed */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Alertas</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {alerts.length} ativos
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {sortedAlerts.slice(0, 5).map((alert) => {
              const contract = contracts.find(c => c.id === alert.contractId);
              return (
                <button
                  key={alert.id}
                  onClick={() => navigate(`/contratos/${alert.contractId}`)}
                  className="w-full text-left p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                      alert.severity === 'critico' ? 'bg-health-critical/10' : 'bg-health-attention/10'
                    )}>
                      <AlertTriangle className={cn(
                        'w-4 h-4',
                        alert.severity === 'critico' ? 'text-health-critical' : 'text-health-attention'
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{alert.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{contract?.nome}</p>
                    </div>
                  </div>
                </button>
              );
            })}
            {alerts.length === 0 && (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-health-healthy/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum alerta ativo</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Contracts List */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Contratos</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/contratos')} className="gap-1">
                Ver todos
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {contractHealthList.slice(0, 6).map(({ contract, health, client }) => (
                <button
                  key={contract.id}
                  onClick={() => navigate(`/contratos/${contract.id}`)}
                  className="w-full text-left p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'w-2 h-10 rounded-full shrink-0',
                      health.status === 'saudavel' && 'bg-health-healthy',
                      health.status === 'atencao' && 'bg-health-attention',
                      health.status === 'critico' && 'bg-health-critical',
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{contract.nome}</p>
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            'text-xs shrink-0',
                            contract.segmento === 'govtech' ? 'segment-badge-gov' : 'segment-badge-private'
                          )}
                        >
                          {contract.segmento === 'govtech' ? 'Gov' : 'Privado'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{client?.nomeFantasia || client?.razaoSocial}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {canViewValues ? (
                        <>
                          <p className={cn(
                            'text-sm font-semibold',
                            health.margemPercentual >= 15 && 'text-health-healthy',
                            health.margemPercentual >= 0 && health.margemPercentual < 15 && 'text-health-attention',
                            health.margemPercentual < 0 && 'text-health-critical',
                          )}>
                            {formatPercentage(health.margemPercentual)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(health.margemMensal)}
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
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
