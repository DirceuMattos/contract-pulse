import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Percent, Activity } from 'lucide-react';
import { calculateSimulationResults, generateScenarios } from '@/lib/simulationEngine';
import { cn } from '@/lib/utils';
import type { ContractSimulation, HealthStatus } from '@/types';

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
  const results = calculateSimulationResults(data);
  const scenarios = generateScenarios(data);

  const chartData = scenarios.map(s => ({
    name: s.label,
    resultado: Math.round(s.resultadoMensal),
    margem: s.margemPercent.toFixed(1),
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Resultado e Cenários</h3>
        <p className="text-sm text-muted-foreground">Projeção financeira com base na estrutura definida.</p>
      </div>

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
              <Tooltip
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

      <div className="p-3 rounded-lg bg-muted/50 border border-border">
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Assistente inteligente (Em breve) — Sugestões baseadas em IA serão disponibilizadas em uma próxima versão.
        </p>
      </div>
    </div>
  );
}
