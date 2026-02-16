import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  AlertCircle, 
  Calendar, 
  Clock, 
  TrendingDown, 
  Users,
  Filter,
  RefreshCw,
  ChevronRight,
  Settings
} from 'lucide-react';
import { useAlerts } from '@/hooks/useAlerts';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertType, AlertSeverity } from '@/types';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';

const alertTypeIcons: Record<AlertType, React.ReactNode> = {
  'reajuste-proximo': <Calendar className="w-5 h-5" />,
  'vigencia-fim': <Clock className="w-5 h-5" />,
  'desatualizacao': <RefreshCw className="w-5 h-5" />,
  'tendencia-deterioracao': <TrendingDown className="w-5 h-5" />,
  'concentracao-custo': <Users className="w-5 h-5" />,
  'financeiro-deficit': <TrendingDown className="w-5 h-5" />,
  'financeiro-margem-baixa': <AlertCircle className="w-5 h-5" />,
  'vigencia-vencido': <Clock className="w-5 h-5" />,
  'governanca-contatos': <Users className="w-5 h-5" />,
  'renovacao-proxima': <Calendar className="w-5 h-5" />,
};

const alertTypeLabels: Record<AlertType, string> = {
  'reajuste-proximo': 'Reajuste Próximo',
  'vigencia-fim': 'Vigência Próxima do Fim',
  'desatualizacao': 'Recursos Desatualizados',
  'tendencia-deterioracao': 'Tendência de Deterioração',
  'concentracao-custo': 'Concentração de Custo',
  'financeiro-deficit': 'Déficit Financeiro',
  'financeiro-margem-baixa': 'Margem Baixa',
  'vigencia-vencido': 'Contrato Vencido',
  'governanca-contatos': 'Contatos Incompletos',
  'renovacao-proxima': 'Renovação Próxima',
};

const severityColors: Record<AlertSeverity, string> = {
  critico: 'bg-health-critical/10 border-health-critical text-health-critical',
  atencao: 'bg-health-attention/10 border-health-attention text-health-attention',
  info: 'bg-blue-500/10 border-blue-500 text-blue-500',
};

const severityLabels: Record<AlertSeverity, string> = {
  critico: 'Crítico',
  atencao: 'Atenção',
  info: 'Informativo',
};

export default function AlertsPage() {
  const navigate = useNavigate();
  const { alerts, criticalCount, warningCount, totalCount } = useAlerts();
  const { getContract, getClient, settings } = useData();
  
  const [filterType, setFilterType] = useState<AlertType | 'all'>('all');
  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | 'all'>('all');
  
  // Filtra alertas
  const filteredAlerts = alerts.filter(alert => {
    if (filterType !== 'all' && alert.type !== filterType) return false;
    if (filterSeverity !== 'all' && alert.severity !== filterSeverity) return false;
    return true;
  });
  
  const renderAlertCard = (alert: Alert, index: number) => {
    const contract = getContract(alert.contractId);
    const client = contract ? getClient(contract.clientId) : null;
    
    return (
      <motion.div
        key={alert.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
      >
        <Card 
          className={cn(
            'border-l-4 cursor-pointer transition-all hover:shadow-md',
            alert.severity === 'critico' ? 'border-l-health-critical' : 'border-l-health-attention'
          )}
          onClick={() => navigate(`/contratos/${alert.contractId}`)}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={cn(
                'p-2 rounded-lg shrink-0',
                alert.severity === 'critico' 
                  ? 'bg-health-critical/10 text-health-critical' 
                  : 'bg-health-attention/10 text-health-attention'
              )}>
                {alertTypeIcons[alert.type]}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-foreground">{alert.title}</h3>
                  <Badge 
                    variant="outline" 
                    className={cn('shrink-0 text-xs', severityColors[alert.severity])}
                  >
                    {severityLabels[alert.severity]}
                  </Badge>
                </div>
                
                <p className="text-sm text-muted-foreground mb-2">
                  {alert.description}
                </p>
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {contract && (
                    <span className="font-medium text-primary">
                      {contract.codigo} - {contract.nome}
                    </span>
                  )}
                  {client && (
                    <span>
                      {client.nomeFantasia || client.razaoSocial}
                    </span>
                  )}
                </div>
                
                {/* Recommendation */}
                <div className="mt-3 p-2 bg-muted/50 rounded-md">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Recomendação:</span> {alert.recommendation}
                  </p>
                </div>
              </div>
              
              {/* Action */}
              <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Alertas"
        description="Notificações automáticas baseadas nos contratos e configurações"
        animated={false}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate('/configuracoes')} className="gap-2">
            <Settings className="w-4 h-4" />
            Configurar Alertas
          </Button>
        }
      />
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-health-critical">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-health-critical/10">
              <AlertTriangle className="w-6 h-6 text-health-critical" />
            </div>
            <div>
              <p className="text-2xl font-bold text-health-critical">{criticalCount}</p>
              <p className="text-sm text-muted-foreground">Alertas Críticos</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-health-attention">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-health-attention/10">
              <AlertCircle className="w-6 h-6 text-health-attention" />
            </div>
            <div>
              <p className="text-2xl font-bold text-health-attention">{warningCount}</p>
              <p className="text-sm text-muted-foreground">Alertas de Atenção</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-2">Configurações de Alerta</p>
            <div className="space-y-1 text-xs">
              <p>Reajuste: <span className="font-medium">{settings.diasAlertaReajuste} dias antes</span></p>
              <p>Vigência: <span className="font-medium">{settings.diasAlertaVigencia} dias antes</span></p>
              <p>Desatualização: <span className="font-medium">{settings.diasAlertaDesatualizacao} dias</span></p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterType} onValueChange={(v) => setFilterType(v as AlertType | 'all')}>
          <SelectTrigger className="w-[200px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Tipo de Alerta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Tipos</SelectItem>
            {Object.entries(alertTypeLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={filterSeverity} onValueChange={(v) => setFilterSeverity(v as AlertSeverity | 'all')}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Severidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="critico">Crítico</SelectItem>
            <SelectItem value="atencao">Atenção</SelectItem>
          </SelectContent>
        </Select>
        
        {(filterType !== 'all' || filterSeverity !== 'all') && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              setFilterType('all');
              setFilterSeverity('all');
            }}
          >
            Limpar filtros
          </Button>
        )}
      </div>
      
      {/* Alerts List */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            Todos ({totalCount})
          </TabsTrigger>
          <TabsTrigger value="critico" className="text-health-critical">
            Críticos ({criticalCount})
          </TabsTrigger>
          <TabsTrigger value="atencao" className="text-health-attention">
            Atenção ({warningCount})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-3">
          {filteredAlerts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-medium text-lg mb-1">Nenhum alerta encontrado</h3>
                <p className="text-sm text-muted-foreground">
                  {filterType !== 'all' || filterSeverity !== 'all' 
                    ? 'Tente ajustar os filtros para ver mais alertas.'
                    : 'Todos os contratos estão em dia! 🎉'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredAlerts.map((alert, index) => renderAlertCard(alert, index))
          )}
        </TabsContent>
        
        <TabsContent value="critico" className="space-y-3">
          {filteredAlerts.filter(a => a.severity === 'critico').length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertTriangle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-medium text-lg mb-1">Nenhum alerta crítico</h3>
                <p className="text-sm text-muted-foreground">
                  Ótimo! Não há situações críticas no momento.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredAlerts
              .filter(a => a.severity === 'critico')
              .map((alert, index) => renderAlertCard(alert, index))
          )}
        </TabsContent>
        
        <TabsContent value="atencao" className="space-y-3">
          {filteredAlerts.filter(a => a.severity === 'atencao').length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-medium text-lg mb-1">Nenhum alerta de atenção</h3>
                <p className="text-sm text-muted-foreground">
                  Não há itens que precisam de atenção no momento.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredAlerts
              .filter(a => a.severity === 'atencao')
              .map((alert, index) => renderAlertCard(alert, index))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
