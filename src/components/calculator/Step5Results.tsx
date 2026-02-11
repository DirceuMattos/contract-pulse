import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Percent, Activity, Sparkles, Info, Calendar, Target, AlertCircle } from 'lucide-react';
import { suggestPricing, calculateSimulationResults, generateScenarios } from '@/lib/simulationEngine';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import type { ContractSimulation, HealthStatus } from '@/types';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  data: ContractSimulation;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function healthLabel(s: HealthStatus) {
  return s === 'saudavel' ? 'Saudável' : s === 'atencao' ? 'Atenção' : 'Deficitário';
}

function healthColor(s: HealthStatus) {
  return s === 'saudavel' ? 'text-[hsl(var(--health-healthy))]' : s === 'atencao' ? 'text-[hsl(var(--health-attention))]' : 'text-[hsl(var(--health-critical))]';
}

function healthBg(s: HealthStatus) {
  return s === 'saudavel' ? 'health-badge-healthy' : s === 'atencao' ? 'health-badge-attention' : 'health-badge-critical';
}

const SCENARIO_COLORS: Record<string, string> = {
  Conservador: 'hsl(0, 72%, 51%)',
  Base: 'hsl(38, 92%, 50%)',
  Otimista: 'hsl(142, 71%, 45%)',
};

export function Step5Results({ data }: Props) {
  const pricing = suggestPricing(data);
  const results = calculateSimulationResults(data);
  const scenarios = generateScenarios(data);

  const [insightText, setInsightText] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState('');

  const chartData = scenarios.map(s => ({
    name: s.label,
    resultado: Math.round(s.resultadoMensal),
    margem: s.margemPercent.toFixed(1),
  }));

  const generateInsights = async () => {
    setInsightLoading(true);
    setInsightError('');
    setInsightText('');

    try {
      const { data: funcData, error } = await supabase.functions.invoke('simulation-insights', {
        body: {
          simulation: {
            name: data.name,
            clientName: data.clientName,
            contractType: data.contractType,
            govSphere: data.govSphere,
            termMonths: data.termMonths,
            complexityLevel: data.complexityLevel,
            questionnaire: data.questionnaire,
            suggestedMonthlyValue: pricing.suggestedMonthlyValue,
            suggestedTotalValue: pricing.suggestedTotalValue,
            suggestedTermMonths: pricing.suggestedTermMonths,
            targetMarginPercent: pricing.targetMarginPercent,
            breakEvenMonthly: pricing.breakEvenMonthly,
            custoMensal: results.custoMensal,
            margemPercent: results.margemPercent,
            description: data.description,
          },
        },
      });

      if (error) {
        const statusCode = (error as any)?.status;
        if (statusCode === 429) {
          setInsightError('Limite de requisições atingido. Tente novamente em alguns instantes.');
        } else if (statusCode === 402) {
          setInsightError('Créditos insuficientes. Adicione créditos para usar a análise inteligente.');
        } else {
          setInsightError('Erro ao gerar análise. Tente novamente.');
        }
        return;
      }

      setInsightText(funcData?.analysis || 'Nenhuma análise disponível.');
    } catch (e) {
      console.error('Insight error:', e);
      setInsightError('Erro de conexão. Tente novamente.');
    } finally {
      setInsightLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Resultado, Sugestão e Insights</h3>
        <p className="text-sm text-muted-foreground">Precificação sugerida, projeção financeira e análise consultiva.</p>
      </div>

      {/* Pricing Suggestion */}
      <Card className="p-5 border-primary/30 bg-primary/5">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-primary" />
          <h4 className="font-semibold text-foreground">Sugestão de Precificação</h4>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-4 h-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Calculado com base no custo total apurado + margem-alvo ({pricing.targetMarginPercent}%) definida pela complexidade do projeto.</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Valor mensal sugerido</p>
            <p className="text-lg font-bold text-primary">{formatCurrency(pricing.suggestedMonthlyValue)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Valor total sugerido</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(pricing.suggestedTotalValue)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Prazo sugerido</p>
            <p className="text-lg font-bold text-foreground">{pricing.suggestedTermMonths} meses</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Margem-alvo</p>
            <p className="text-lg font-bold text-foreground">{pricing.targetMarginPercent}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Break-even mensal</p>
            <p className="text-lg font-bold text-muted-foreground">{formatCurrency(pricing.breakEvenMonthly)}</p>
          </div>
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="card-kpi">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Receita mensal</span>
          </div>
          <p className="text-lg font-bold text-foreground">{formatCurrency(results.receitaMensal)}</p>
        </Card>
        <Card className="card-kpi">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Custo mensal</span>
          </div>
          <p className="text-lg font-bold text-foreground">{formatCurrency(results.custoMensal)}</p>
        </Card>
        <Card className="card-kpi">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Overhead</span>
          </div>
          <p className="text-lg font-bold text-foreground">{formatCurrency(results.overheadMensal)}</p>
        </Card>
        <Card className="card-kpi">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className={cn('w-4 h-4', healthColor(results.healthStatus))} />
            <span className="text-xs text-muted-foreground">Resultado</span>
          </div>
          <p className={cn('text-lg font-bold', healthColor(results.healthStatus))}>{formatCurrency(results.resultadoMensal)}</p>
        </Card>
        <Card className="card-kpi">
          <div className="flex items-center gap-2 mb-1">
            <Percent className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Margem</span>
          </div>
          <p className={cn('text-lg font-bold', healthColor(results.healthStatus))}>{results.margemPercent.toFixed(1)}%</p>
          <Badge className={cn('mt-1', healthBg(results.healthStatus))}>{healthLabel(results.healthStatus)}</Badge>
        </Card>
      </div>

      {/* Scenarios Table */}
      <Card className="p-4 space-y-3">
        <h4 className="font-medium text-foreground">Comparativo de cenários</h4>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cenário</TableHead>
                <TableHead>Receita</TableHead>
                <TableHead>Custo</TableHead>
                <TableHead>Overhead</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Margem</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scenarios.map(s => (
                <TableRow key={s.label}>
                  <TableCell className="font-medium">{s.label}</TableCell>
                  <TableCell>{formatCurrency(s.receitaMensal)}</TableCell>
                  <TableCell>{formatCurrency(s.custoMensal)}</TableCell>
                  <TableCell>{formatCurrency(s.overheadMensal)}</TableCell>
                  <TableCell className={cn('font-medium', healthColor(s.healthStatus))}>{formatCurrency(s.resultadoMensal)}</TableCell>
                  <TableCell>{s.margemPercent.toFixed(1)}%</TableCell>
                  <TableCell><Badge className={healthBg(s.healthStatus)}>{healthLabel(s.healthStatus)}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Chart */}
      <Card className="p-4 space-y-3">
        <h4 className="font-medium text-foreground">Resultado mensal por cenário</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <RechartsTooltip
                formatter={(value: number) => [formatCurrency(value), 'Resultado']}
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
              />
              <Bar dataKey="resultado" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, idx) => (
                  <Cell key={idx} fill={SCENARIO_COLORS[entry.name] || 'hsl(var(--primary))'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* AI Insights */}
      <Card className="p-5 space-y-4 border-accent/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent-foreground" />
            <h4 className="font-semibold text-foreground">Análise do Consultor</h4>
            <Badge variant="outline" className="text-xs">IA</Badge>
          </div>
          {!insightLoading && (
            <Button variant="outline" size="sm" onClick={generateInsights}>
              <Sparkles className="w-4 h-4 mr-2" />
              {insightText ? 'Gerar novamente' : 'Gerar análise'}
            </Button>
          )}
        </div>

        {insightLoading && (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/6" />
          </div>
        )}

        {insightError && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {insightError}
          </div>
        )}

        {insightText && !insightLoading && (
          <div className="prose prose-sm dark:prose-invert max-w-none text-foreground whitespace-pre-wrap">
            {insightText}
          </div>
        )}

        {!insightText && !insightLoading && !insightError && (
          <p className="text-sm text-muted-foreground">
            Clique em "Gerar análise" para obter insights sobre riscos, oportunidades e recomendações para este contrato.
          </p>
        )}
      </Card>
    </div>
  );
}
