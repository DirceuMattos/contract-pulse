import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/layout/PageHeader';
import { AIPageLayout } from '@/components/ai/AIPageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { useData } from '@/contexts/DataContext';
import { useOverheadPool } from '@/hooks/useOverheadPool';
import { analyzeContractPortfolio, ContractInsight, PortfolioRecommendation } from '@/lib/aiRuleEngine';
import { Sparkles, FileText, AlertTriangle, Clock, TrendingUp, Copy, ExternalLink, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

export default function AIContractsAnalysisPage() {
  const { contracts, resources, settings, clients } = useData();
  const { getAllocation } = useOverheadPool();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [generated, setGenerated] = useState(false);
  const [filterClient, setFilterClient] = useState('all');
  const [filterSegmento, setFilterSegmento] = useState('all');
  const [filterSaude, setFilterSaude] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const activeContracts = useMemo(
    () => contracts.filter(c => c.status === 'operacao' || c.status === 'implantacao'),
    [contracts]
  );

  const overheadMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of contracts) {
      const alloc = getAllocation(c.id);
      map[c.id] = alloc.value;
    }
    return map;
  }, [contracts, getAllocation]);

  const analysis = useMemo(() => {
    if (!generated) return null;
    return analyzeContractPortfolio(contracts, resources, settings, overheadMap, clients);
  }, [generated, contracts, resources, settings, overheadMap, clients]);

  const filteredInsights = useMemo(() => {
    if (!analysis) return [];
    return analysis.contractInsights.filter(i => {
      if (filterClient !== 'all' && i.clientId !== filterClient) return false;
      if (filterSegmento !== 'all' && i.segmento !== filterSegmento) return false;
      if (filterSaude !== 'all' && i.healthStatus !== filterSaude) return false;
      if (searchTerm && !i.contractName.toLowerCase().includes(searchTerm.toLowerCase()) && !i.clientName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [analysis, filterClient, filterSegmento, filterSaude, searchTerm]);

  const uniqueClients = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of contracts) {
      const cl = clients.find(cl => cl.id === c.clientId);
      if (cl) map.set(cl.id, cl.razaoSocial);
    }
    return Array.from(map.entries());
  }, [contracts, clients]);

  const copyReport = () => {
    if (!analysis) return;
    const lines: string[] = ['=== ANÁLISE DO PORTFÓLIO DE CONTRATOS ===', ''];
    lines.push(`Contratos críticos: ${analysis.kpis.critical}`);
    lines.push(`Contratos em atenção: ${analysis.kpis.attention}`);
    lines.push(`Reajustes próximos (60d): ${analysis.kpis.upcomingAdjustments}`);
    lines.push(`Vencimentos próximos (60d): ${analysis.kpis.upcomingExpirations}`);
    lines.push('');
    lines.push('--- TOP RECOMENDAÇÕES ---');
    for (const r of analysis.recommendations) {
      lines.push(`• [${r.severity.toUpperCase()}] ${r.contractName}: ${r.reason} → ${r.action}`);
    }
    lines.push('');
    for (const i of filteredInsights) {
      lines.push(`--- ${i.contractName} (${i.clientName}) ---`);
      for (const d of i.diagnostics) lines.push(`  • ${d}`);
      for (const a of i.actions) lines.push(`  ☐ ${a}`);
      lines.push('');
    }
    navigator.clipboard.writeText(lines.join('\n'));
    toast({ title: 'Copiado!', description: 'Resumo copiado para a área de transferência.' });
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <PageHeader
        title="Análise de Contratos"
        description="Insights e recomendações baseados em regras para o portfólio de contratos"
        actions={
          <Button onClick={() => setGenerated(true)} className="gap-2">
            <Sparkles className="w-4 h-4" /> Gerar análise
          </Button>
        }
      />
      <AIPageLayout>
        {!generated ? (
          <EmptyState
            icon={Sparkles}
            title="Nenhuma análise gerada"
            description="Clique em 'Gerar análise' para analisar o portfólio de contratos com base em regras determinísticas."
            actionLabel="Ir para Contratos"
            onAction={() => navigate('/contratos')}
            actionIcon={FileText}
          />
        ) : analysis && (
          <motion.div variants={itemVariants} className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Buscar contrato ou cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
                  </div>
                  <Select value={filterClient} onValueChange={setFilterClient}>
                    <SelectTrigger className="w-[200px]"><SelectValue placeholder="Cliente" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os clientes</SelectItem>
                      {uniqueClients.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterSegmento} onValueChange={setFilterSegmento}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="Segmento" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="govtech">GovTech</SelectItem>
                      <SelectItem value="privado">Privado</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterSaude} onValueChange={setFilterSaude}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="Saúde" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="saudavel">Saudável</SelectItem>
                      <SelectItem value="atencao">Atenção</SelectItem>
                      <SelectItem value="critico">Crítico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-health-critical/30">
                <CardContent className="p-4 text-center">
                  <AlertTriangle className="w-6 h-6 text-health-critical mx-auto mb-1" />
                  <p className="text-2xl font-bold text-health-critical">{analysis.kpis.critical}</p>
                  <p className="text-xs text-muted-foreground">Contratos críticos</p>
                </CardContent>
              </Card>
              <Card className="border-health-attention/30">
                <CardContent className="p-4 text-center">
                  <AlertTriangle className="w-6 h-6 text-health-attention mx-auto mb-1" />
                  <p className="text-2xl font-bold text-health-attention">{analysis.kpis.attention}</p>
                  <p className="text-xs text-muted-foreground">Em atenção</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingUp className="w-6 h-6 text-primary mx-auto mb-1" />
                  <p className="text-2xl font-bold">{analysis.kpis.upcomingAdjustments}</p>
                  <p className="text-xs text-muted-foreground">Reajustes próximos (60d)</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Clock className="w-6 h-6 text-primary mx-auto mb-1" />
                  <p className="text-2xl font-bold">{analysis.kpis.upcomingExpirations}</p>
                  <p className="text-xs text-muted-foreground">Vencimentos próximos (60d)</p>
                </CardContent>
              </Card>
            </div>

            {/* Top Recommendations */}
            {analysis.recommendations.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Top Recomendações</CardTitle>
                    <Button variant="outline" size="sm" onClick={copyReport} className="gap-2">
                      <Copy className="w-3.5 h-3.5" /> Copiar resumo
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analysis.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Badge variant={rec.severity === 'critico' ? 'destructive' : rec.severity === 'atencao' ? 'default' : 'secondary'} className="shrink-0 mt-0.5">
                        {rec.severity}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{rec.contractName}</p>
                        <p className="text-sm text-muted-foreground">{rec.reason}</p>
                        <p className="text-sm text-primary mt-1">→ {rec.action}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Per-Contract Insights */}
            {filteredInsights.map(insight => (
              <Card key={insight.contractId}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{insight.contractName}</CardTitle>
                      <p className="text-sm text-muted-foreground">{insight.clientName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={insight.healthStatus === 'critico' ? 'destructive' : insight.healthStatus === 'atencao' ? 'default' : 'secondary'}>
                        {insight.healthStatus}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/contratos/${insight.contractId}`)}>
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {insight.diagnostics.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Diagnóstico</p>
                      <ul className="space-y-1">
                        {insight.diagnostics.map((d, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span> {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {insight.actions.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Ações sugeridas</p>
                      <ul className="space-y-1">
                        {insight.actions.map((a, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-muted-foreground mt-0.5">☐</span> {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/contratos/${insight.contractId}`)}>Abrir contrato</Button>
                    <Button variant="outline" size="sm" onClick={() => navigate('/configuracoes/overhead-rateio')}>Ver rateio</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        )}
      </AIPageLayout>
    </motion.div>
  );
}
