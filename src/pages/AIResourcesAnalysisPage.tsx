import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/layout/PageHeader';
import { AIPageLayout } from '@/components/ai/AIPageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/ui/empty-state';
import { useData } from '@/contexts/DataContext';
import { useHR } from '@/contexts/HRContext';
import { useAuth } from '@/contexts/AuthContext';
import { analyzeResources, ResourceAnalysis } from '@/lib/aiRuleEngine';
import { Sparkles, Users, Copy, AlertTriangle, Calendar, Cake } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

export default function AIResourcesAnalysisPage() {
  const { contracts, resources, settings, clients, teams } = useData();
  const { hrPeople } = useHR();
  const { userRole } = useAuth();
  const { toast } = useToast();

  const isAdmin = userRole === 'c-level';
  const [generated, setGenerated] = useState(false);
  const [showNames, setShowNames] = useState(isAdmin);
  const [filterTeam, setFilterTeam] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const analysis: ResourceAnalysis | null = useMemo(() => {
    if (!generated) return null;
    return analyzeResources(resources, hrPeople, contracts, settings, teams, clients);
  }, [generated, resources, hrPeople, contracts, settings, teams, clients]);

  const filteredLoad = useMemo(() => {
    if (!analysis) return [];
    return analysis.loadMap.filter(item => {
      if (filterTeam !== 'all' && item.teamId !== filterTeam) return false;
      return true;
    });
  }, [analysis, filterTeam]);

  const copyReport = () => {
    if (!analysis) return;
    const lines: string[] = ['=== ANÁLISE DE RECURSOS ALOCADOS ===', ''];
    lines.push('--- SOBRECARGAS ---');
    for (const o of analysis.overloaded) lines.push(`• ${showNames ? o.personName : o.role}: ${o.totalDedication}%`);
    lines.push('');
    lines.push('--- OCIOSIDADE ---');
    for (const o of analysis.idle) lines.push(`• ${showNames ? o.personName : o.role}: ${o.totalDedication}%`);
    lines.push('');
    if (analysis.committeeAgenda.length > 0) {
      lines.push('--- COMITÊ GESTOR (MÊS ATUAL) ---');
      for (const c of analysis.committeeAgenda) lines.push(`• ${c.personName}: ${c.comiteGestor}`);
    }
    if (analysis.anniversaries.length > 0) {
      lines.push('--- ANIVERSÁRIOS DE EMPRESA (MÊS ATUAL) ---');
      for (const a of analysis.anniversaries) lines.push(`• ${a.personName}: ${a.years} ano(s) — ${a.admissionDate}`);
    }
    navigator.clipboard.writeText(lines.join('\n'));
    toast({ title: 'Copiado!', description: 'Resumo copiado para a área de transferência.' });
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <PageHeader
        title="Análise de Recursos Alocados"
        description="Mapa de carga, sobrecargas e pontos de atenção da equipe"
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
            description="Clique em 'Gerar análise' para mapear a carga de trabalho e identificar sobrecargas."
            actionLabel="Ir para RH"
            onAction={() => {}}
            actionIcon={Users}
          />
        ) : analysis && (
          <motion.div variants={itemVariants} className="space-y-6">
            {/* Controls */}
            <Card>
              <CardContent className="p-4 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <Switch id="show-names" checked={showNames} onCheckedChange={setShowNames} />
                  <Label htmlFor="show-names" className="text-sm">Mostrar nomes</Label>
                </div>
                <Select value={filterTeam} onValueChange={setFilterTeam}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="Equipe" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as equipes</SelectItem>
                    {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={copyReport} className="gap-2 ml-auto">
                  <Copy className="w-3.5 h-3.5" /> Copiar resumo
                </Button>
              </CardContent>
            </Card>

            {/* Load Map */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Mapa de Carga por Equipe</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredLoad.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem dados de alocação para exibir.</p>
                ) : (
                  <div className="space-y-3">
                    {filteredLoad.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="text-sm font-medium">{item.teamName || 'Sem equipe'}</p>
                          <p className="text-xs text-muted-foreground">{item.memberCount} membro(s)</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{item.totalFTE.toFixed(1)} FTE</p>
                          {item.criticalContracts > 0 && (
                            <Badge variant="destructive" className="text-xs">{item.criticalContracts} em crítico</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Overloaded */}
            {analysis.overloaded.length > 0 && (
              <Card className="border-health-critical/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-health-critical" /> Sobrecarga ({'>'}100%)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {analysis.overloaded.map((o, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-health-critical/5">
                      <p className="text-sm font-medium">{showNames ? o.personName : o.role}</p>
                      <Badge variant="destructive">{o.totalDedication}%</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Idle */}
            {analysis.idle.length > 0 && (
              <Card className="border-health-attention/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-health-attention" /> Ociosidade ({'<'}30%)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {analysis.idle.map((o, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-health-attention/5">
                      <p className="text-sm font-medium">{showNames ? o.personName : o.role}</p>
                      <Badge variant="default">{o.totalDedication}%</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Committee Agenda */}
            {analysis.committeeAgenda.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" /> Comitê Gestor — Mês Atual
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {analysis.committeeAgenda.map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <p className="text-sm font-medium">{c.personName}</p>
                      <p className="text-sm text-muted-foreground">{c.comiteGestor}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Anniversaries */}
            {analysis.anniversaries.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Cake className="w-5 h-5 text-primary" /> Aniversários de Empresa — Mês Atual
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {analysis.anniversaries.map((a, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <p className="text-sm font-medium">{a.personName}</p>
                      <p className="text-sm text-muted-foreground">{a.years} ano(s)</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AIPageLayout>
    </motion.div>
  );
}
